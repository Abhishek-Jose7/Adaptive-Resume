import { LlmProvider, StructuredLlmInput, TokenUsage } from "../providerInterface";

/**
 * Google Gemini Provider Adapter (Free Tier: gemini-1.5-flash / gemini-2.0-flash)
 * PRD Section 7.5 & 10.7
 */
export class GeminiAdapter implements LlmProvider {
  name = "gemini";
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model: string = "gemini-1.5-flash") {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || "";
    this.model = model;
  }

  async generateStructured<T>(
    input: StructuredLlmInput<T>
  ): Promise<{ data: T; model: string; usage?: TokenUsage }> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${input.systemPrompt}\n\nTask: ${input.task}\n\nInput Payload:\n${JSON.stringify(input.userPayload, null, 2)}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: input.temperature ?? 0.2,
        maxOutputTokens: input.maxOutputTokens ?? 2048,
      },
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
          throw new Error(`Gemini API error (${response.status}): ${errText}`);
        }

        const json = await response.json();
        const candidate = json.candidates?.[0];
        const contentText = candidate?.content?.parts?.[0]?.text;

        if (!contentText) {
          throw new Error("Gemini returned empty response.");
        }

        const parsedData = JSON.parse(contentText) as T;
        const usage: TokenUsage = {
          promptTokens: json.usageMetadata?.promptTokenCount || 0,
          completionTokens: json.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: json.usageMetadata?.totalTokenCount || 0,
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

    throw new Error("Gemini API request failed after retries.");
  }
}
