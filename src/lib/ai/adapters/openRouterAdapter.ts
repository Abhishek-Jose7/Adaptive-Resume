import { LlmProvider, StructuredLlmInput, TokenUsage } from "../providerInterface";

/**
 * OpenRouter Provider Adapter
 * Supports standard LLM text completions and Multimodal Vision inference
 * Model: inclusionai/ling-3.2-flash:free (1.05M context window)
 */
export class OpenRouterAdapter implements LlmProvider {
  name = "openrouter";
  private apiKey: string;
  private model: string;
  private pipelineRole: "parser" | "reasoning" | "generic";

  constructor(
    apiKey?: string,
    model?: string,
    pipelineRole: "parser" | "reasoning" | "generic" = "generic"
  ) {
    this.pipelineRole = pipelineRole;

    if (pipelineRole === "parser") {
      this.apiKey =
        apiKey ||
        process.env.OPENROUTER_API_KEY_PARSER ||
        process.env.OPENROUTER_API_KEY ||
        "";
      this.model =
        model ||
        process.env.OPENROUTER_MODEL_PARSER ||
        "inclusionai/ling-3.2-flash:free";
    } else if (pipelineRole === "reasoning") {
      this.apiKey =
        apiKey ||
        process.env.OPENROUTER_API_KEY_REASONING ||
        process.env.OPENROUTER_API_KEY ||
        "";
      this.model =
        model ||
        process.env.OPENROUTER_MODEL_REASONING ||
        "inclusionai/ling-3.2-flash:free";
    } else {
      this.apiKey =
        apiKey ||
        process.env.OPENROUTER_API_KEY ||
        process.env.OPENROUTER_API_KEY_REASONING ||
        process.env.OPENROUTER_API_KEY_PARSER ||
        "";
      this.model =
        model ||
        process.env.OPENROUTER_MODEL ||
        "inclusionai/ling-3.2-flash:free";
    }
  }

  getModel(): string {
    return this.model;
  }

  getRole(): string {
    return this.pipelineRole;
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
    } catch (parseErr: any) {
      // In case of minor trailing commas or escaping defects, try basic cleanup
      try {
        const repaired = clean
          .replace(/,\s*([}\]])/g, "$1") // trailing commas
          .replace(/\\'/g, "'");
        return JSON.parse(repaired) as T;
      } catch {
        throw new Error(
          `Failed to parse JSON response from OpenRouter (${parseErr.message}). Raw output: ${rawText.substring(0, 300)}...`
        );
      }
    }
  }

  async generateStructured<T>(
    input: StructuredLlmInput<T>
  ): Promise<{ data: T; model: string; usage?: TokenUsage }> {
    if (!this.apiKey) {
      throw new Error(
        `OpenRouter API key is missing for pipeline '${this.pipelineRole}'. Please configure OPENROUTER_API_KEY_${this.pipelineRole.toUpperCase()} or OPENROUTER_API_KEY in .env.local`
      );
    }

    const endpoint = "https://openrouter.ai/api/v1/chat/completions";

    // Build user message content, supporting multimodal vision inputs
    let userContent: any;
    if (input.images && input.images.length > 0) {
      userContent = [
        {
          type: "text",
          text: `Task: ${input.task}\n\nInstructions & Context:\n${JSON.stringify(input.userPayload, null, 2)}`,
        },
        ...input.images.map((img) => ({
          type: "image_url",
          image_url: {
            url: img.base64Data.startsWith("data:")
              ? img.base64Data
              : `data:${img.mimeType || "image/png"};base64,${img.base64Data}`,
          },
        })),
      ];
    } else {
      userContent = `Task: ${input.task}\n\nPayload:\n${JSON.stringify(input.userPayload, null, 2)}`;
    }

    const messages = [
      {
        role: "system",
        content: `${input.systemPrompt}\n\nCRITICAL OUTPUT FORMATTING INSTRUCTION:\nYou must respond ONLY with a single valid JSON object matching the requested schema. Do NOT enclose your response in backticks or markdown fences. Do NOT prepend or append explanatory prose, notes, or apologies. Pure valid JSON only.`,
      },
      {
        role: "user",
        content: userContent,
      },
    ];

    const body: Record<string, any> = {
      model: this.model,
      messages,
      temperature: input.temperature ?? 0.1,
      max_tokens: input.maxOutputTokens ?? 4096,
    };

    let attempts = 0;
    const maxAttempts = 3;
    let delay = 1000;

    while (attempts < maxAttempts) {
      attempts++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // 35 second timeout

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": "https://resumemaker.local",
            "X-Title": "ResumeMaker Dual-Model Engine",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429) {
          const retryAfter = response.headers.get("retry-after");
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
          if (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            delay *= 2;
            continue;
          }
          throw new Error("OpenRouter rate limit exceeded (HTTP 429) after retries.");
        }

        if (!response.ok) {
          const errText = await response.text();
          if (response.status >= 500 && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }
          throw new Error(`OpenRouter API error (${response.status}): ${errText}`);
        }

        const json = await response.json();
        const contentText = json.choices?.[0]?.message?.content;

        if (!contentText) {
          throw new Error("OpenRouter returned empty content in choices.");
        }

        const parsedData = OpenRouterAdapter.cleanAndParseJson<T>(contentText);

        const usage: TokenUsage = {
          promptTokens: json.usage?.prompt_tokens || 0,
          completionTokens: json.usage?.completion_tokens || 0,
          totalTokens: json.usage?.total_tokens || 0,
        };

        return {
          data: parsedData,
          model: this.model,
          usage,
        };
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          if (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }
          throw new Error("OpenRouter API request timed out after 35 seconds.");
        }

        if (attempts >= maxAttempts) {
          throw err;
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    throw new Error("OpenRouter API request failed after all attempts.");
  }
}
