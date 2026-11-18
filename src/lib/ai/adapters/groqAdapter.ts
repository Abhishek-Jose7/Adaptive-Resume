import { LlmProvider, StructuredLlmInput, TokenUsage } from "../providerInterface";

/**
 * Groq Free-Tier Provider Adapter (llama-3.3-70b-versatile / llama-3.1-8b-instant)
 * PRD Section 7.5 & 10.7
 */
export class GroqAdapter implements LlmProvider {
  name = "groq";
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model: string = "llama-3.3-70b-versatile") {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || "";
    this.model = model;
  }

  async generateStructured<T>(
    input: StructuredLlmInput<T>
  ): Promise<{ data: T; model: string; usage?: TokenUsage }> {
    if (!this.apiKey) {
      throw new Error("GROQ_API_KEY is not configured.");
    }

    const endpoint = "https://api.groq.com/openai/v1/chat/completions";

    const body = {
      model: this.model,
      messages: [
        {
          role: "system",
          content: `${input.systemPrompt}\nYou MUST reply with a valid JSON object matching the required schema. Do not output markdown code blocks or additional prose.`,
        },
        {
          role: "user",
          content: `Task: ${input.task}\n\nPayload:\n${JSON.stringify(input.userPayload, null, 2)}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: input.temperature ?? 0.2,
      max_tokens: input.maxOutputTokens ?? 2048,
    };

    let attempts = 0;
    const maxAttempts = 3;
    let delay = 1000;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
        });

        if (response.status === 429) {
          const retryAfter = response.headers.get("retry-after");
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          delay *= 2;
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Groq API error (${response.status}): ${errText}`);
        }

        const json = await response.json();
        const contentText = json.choices?.[0]?.message?.content;

        if (!contentText) {
          throw new Error("Groq returned empty response.");
        }

        const parsedData = JSON.parse(contentText) as T;
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
      } catch (err) {
        if (attempts >= maxAttempts) throw err;
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    throw new Error("Groq API request failed after retries.");
  }
}
