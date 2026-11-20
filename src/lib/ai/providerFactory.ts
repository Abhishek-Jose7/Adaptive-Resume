import { LlmProvider } from "./providerInterface";
import { LocalDeterministicAdapter } from "./adapters/localDeterministicAdapter";
import { GeminiAdapter } from "./adapters/geminiAdapter";
import { GroqAdapter } from "./adapters/groqAdapter";
import { OpenRouterAdapter } from "./adapters/openRouterAdapter";

export class ProviderFactory {
  /**
   * Dedicated Pipeline A: Resume Parser Provider
   * Defaults to OpenRouter with OPENROUTER_API_KEY_PARSER and OPENROUTER_MODEL_PARSER
   * Falls back to local deterministic adapter if keys are not present.
   */
  static getParserProvider(apiKey?: string, model?: string): LlmProvider {
    const key = apiKey || process.env.OPENROUTER_API_KEY_PARSER || process.env.OPENROUTER_API_KEY;
    if (key) {
      return new OpenRouterAdapter(key, model, "parser");
    }
    return new LocalDeterministicAdapter();
  }

  /**
   * Dedicated Pipeline B: Resume Intelligence / Reasoning Provider
   * Defaults to OpenRouter with OPENROUTER_API_KEY_REASONING and OPENROUTER_MODEL_REASONING
   * Falls back to local deterministic adapter if keys are not present.
   */
  static getReasoningProvider(apiKey?: string, model?: string): LlmProvider {
    const key = apiKey || process.env.OPENROUTER_API_KEY_REASONING || process.env.OPENROUTER_API_KEY;
    if (key) {
      return new OpenRouterAdapter(key, model, "reasoning");
    }
    return new LocalDeterministicAdapter();
  }

  /**
   * Universal provider getter (backward-compatible)
   */
  static getProvider(
    providerName?: string,
    apiKey?: string,
    role: "parser" | "reasoning" | "generic" = "generic"
  ): LlmProvider {
    const selected = (providerName || process.env.DEFAULT_LLM_PROVIDER || "openrouter").toLowerCase();

    if (selected === "openrouter") {
      const key =
        apiKey ||
        (role === "parser"
          ? process.env.OPENROUTER_API_KEY_PARSER || process.env.OPENROUTER_API_KEY
          : role === "reasoning"
          ? process.env.OPENROUTER_API_KEY_REASONING || process.env.OPENROUTER_API_KEY
          : process.env.OPENROUTER_API_KEY ||
            process.env.OPENROUTER_API_KEY_REASONING ||
            process.env.OPENROUTER_API_KEY_PARSER);

      if (key) {
        return new OpenRouterAdapter(key, undefined, role);
      }
    }

    if (selected === "gemini" && (apiKey || process.env.GEMINI_API_KEY)) {
      return new GeminiAdapter(apiKey);
    }

    if (selected === "groq" && (apiKey || process.env.GROQ_API_KEY)) {
      return new GroqAdapter(apiKey);
    }

    // Default to zero-cost, reliable, deterministic local adapter
    return new LocalDeterministicAdapter();
  }
}
