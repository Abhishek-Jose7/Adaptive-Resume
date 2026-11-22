import { LlmProvider, StructuredLlmInput, TokenUsage } from "../providerInterface";

export interface GroqAdapterOptions {
  apiKey?: string;
  model?: string;
  fallbackApiKey?: string;
  fallbackModel?: string;
}

/**
 * Groq High-Speed Free-Tier Provider Adapter with Dual-Key Rotation & Failover
 * Primary Model: qwen/qwen3.8-27b (ultra-fast, sub-500ms JSON responses)
 * Secondary Models: openai/gpt-oss-120b, openai/gpt-oss-20b
 * Supports Multi-Key Failover: primary key -> fallback key -> local deterministic engine
 */
export class GroqAdapter implements LlmProvider {
  name = "groq";
  private apiKey: string;
  private fallbackApiKey: string;
  private model: string;
  private fallbackModel: string;

  constructor(
    apiKeyOrOptions?: string | GroqAdapterOptions,
    model?: string,
    fallbackApiKey?: string,
    fallbackModel?: string
  ) {
    if (typeof apiKeyOrOptions === "object" && apiKeyOrOptions !== null) {
      this.apiKey = apiKeyOrOptions.apiKey || process.env.GROQ_API_KEY || "";
      this.model = apiKeyOrOptions.model || process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
      this.fallbackApiKey = apiKeyOrOptions.fallbackApiKey || process.env.GROQ_API_KEY_FALLBACK || "";
      this.fallbackModel = apiKeyOrOptions.fallbackModel || process.env.GROQ_MODEL_FALLBACK || "qwen/qwen3.8-27b";
    } else {
      this.apiKey = apiKeyOrOptions || process.env.GROQ_API_KEY || "";
      this.model = model || process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
      this.fallbackApiKey = fallbackApiKey || process.env.GROQ_API_KEY_FALLBACK || "";
      this.fallbackModel = fallbackModel || process.env.GROQ_MODEL_FALLBACK || "qwen/qwen3.8-27b";
    }
  }

  getModel(): string {
    return this.model;
  }

  getFallbackApiKey(): string {
    return this.fallbackApiKey;
  }

  /**
   * Cleans raw LLM response text by removing markdown code fences
   * and extracting the outermost JSON object or array.
   */
  static cleanAndParseJson<T>(rawText: string): T {
    let clean = rawText.trim();

    // Strip markdown code fences if present (e.g. ```json ... ```)
    const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      clean = codeBlockMatch[1].trim();
    }

    // Locate the first '{' or '[' and last '}' or ']'
    const firstBrace = clean.indexOf("{");
    const firstBracket = clean.indexOf("[");

    let startIndex = -1;
    let endIndex = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIndex = firstBrace;
      endIndex = clean.lastIndexOf("}");
    } else if (firstBracket !== -1) {
      startIndex = firstBracket;
      endIndex = clean.lastIndexOf("]");
    }

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      clean = clean.slice(startIndex, endIndex + 1);
    }

    try {
      return JSON.parse(clean) as T;
    } catch {
      // In case of minor trailing commas or escaping defects, try basic cleanup
      const repaired = clean.replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(repaired) as T;
    }
  }

  async generateStructured<T>(
    input: StructuredLlmInput<T>
  ): Promise<{ data: T; model: string; usage?: TokenUsage }> {
    const primaryKey = this.apiKey;
    const fallbackKey = this.fallbackApiKey;

    if (!primaryKey && !fallbackKey) {
      console.warn("[Groq] No API key configured. Falling back to local deterministic engine.");
      const { LocalDeterministicAdapter } = await import("./localDeterministicAdapter");
      return new LocalDeterministicAdapter().generateStructured(input);
    }

    const endpoint = "https://api.groq.com/openai/v1/chat/completions";

    const fallbackModels = [
      "qwen/qwen3.8-27b",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
    ];

    // Build key rotation queue
    const keyQueue: string[] = [];
    if (primaryKey) keyQueue.push(primaryKey);
    if (fallbackKey && fallbackKey !== primaryKey) keyQueue.push(fallbackKey);

    let currentKeyIndex = 0;
    let activeKey = keyQueue[currentKeyIndex];
    let currentModel = this.model;

    // If requested model is a llama model or not in available list, prepare fallback chain
    if (currentModel.toLowerCase().includes("llama")) {
      // Check if we should start directly with qwen/qwen3.8-27b or attempt and handle 404
      currentModel = "qwen/qwen3.8-27b";
    }

    let attempts = 0;
    const maxAttempts = 5;
    let delay = 600;

    while (attempts < maxAttempts) {
      attempts++;

      const body: Record<string, any> = {
        model: currentModel,
        messages: [
          {
            role: "system",
            content: `${input.systemPrompt}\nYou MUST reply with a valid JSON object matching the required schema. Do not output markdown code blocks or additional prose. Pure valid JSON only.`,
          },
          {
            role: "user",
            content: `Task: ${input.task}\n\nPayload:\n${JSON.stringify(input.userPayload, null, 2)}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: input.temperature ?? 0.1,
        max_tokens: input.maxOutputTokens ?? 4096,
      };

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Rate Limit Handling (HTTP 429)
        if (response.status === 429) {
          // If we have another key in the queue, rotate immediately!
          if (currentKeyIndex + 1 < keyQueue.length) {
            currentKeyIndex++;
            activeKey = keyQueue[currentKeyIndex];
            console.warn(`[Groq] Rate limit (429) hit on key ${currentKeyIndex}. Seamlessly rotating to secondary API key...`);
            await new Promise((resolve) => setTimeout(resolve, 200));
            continue;
          }

          // Both keys have been tried or only one key: try model rotation or retry-after backoff
          const nextModel = fallbackModels.find((m) => m !== currentModel);
          if (nextModel && attempts < maxAttempts) {
            console.warn(`[Groq] Rate limited on ${currentModel}. Retrying with model ${nextModel}...`);
            currentModel = nextModel;
            const retryAfter = response.headers.get("retry-after");
            const waitTime = retryAfter ? Math.min(parseInt(retryAfter, 10) * 1000, 4000) : delay;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            delay *= 2;
            continue;
          }

          console.warn("[Groq] Rate limit exhausted across keys and models. Falling back to local deterministic engine.");
          const { LocalDeterministicAdapter } = await import("./localDeterministicAdapter");
          return new LocalDeterministicAdapter().generateStructured(input);
        }

        // Model Not Found (HTTP 404)
        if (response.status === 404) {
          const nextModel = fallbackModels.find((m) => m !== currentModel) || "qwen/qwen3.8-27b";
          if (currentModel !== nextModel) {
            console.warn(`[Groq] Model ${currentModel} not available (404). Falling back to ${nextModel}...`);
            currentModel = nextModel;
            continue;
          }
        }

        // Unauthorized or Forbidden (HTTP 401 / 403)
        if (response.status === 401 || response.status === 403) {
          if (currentKeyIndex + 1 < keyQueue.length) {
            currentKeyIndex++;
            activeKey = keyQueue[currentKeyIndex];
            console.warn(`[Groq] Auth error (${response.status}) on key. Rotating to next key...`);
            continue;
          }
        }

        // Server Error (HTTP 5xx)
        if (response.status >= 500 && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[Groq] API error (${response.status}): ${errText}. Falling back to local engine.`);
          const { LocalDeterministicAdapter } = await import("./localDeterministicAdapter");
          return new LocalDeterministicAdapter().generateStructured(input);
        }

        const json = await response.json();
        const msg = json.choices?.[0]?.message;
        const contentText = msg?.content || (typeof msg?.reasoning === "string" ? msg.reasoning : "");

        if (!contentText) {
          throw new Error("Groq returned empty response.");
        }

        const parsedData = GroqAdapter.cleanAndParseJson<T>(contentText);
        const usage: TokenUsage = {
          promptTokens: json.usage?.prompt_tokens || 0,
          completionTokens: json.usage?.completion_tokens || 0,
          totalTokens: json.usage?.total_tokens || 0,
        };

        return {
          data: parsedData,
          model: currentModel,
          usage,
        };
      } catch (err: any) {
        if (attempts >= maxAttempts) {
          console.warn(`[Groq] Failed after retries: ${err.message}. Falling back to local engine.`);
          const { LocalDeterministicAdapter } = await import("./localDeterministicAdapter");
          return new LocalDeterministicAdapter().generateStructured(input);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    const { LocalDeterministicAdapter } = await import("./localDeterministicAdapter");
    return new LocalDeterministicAdapter().generateStructured(input);
  }
}
