import { LlmProvider } from "./providerInterface";
import { LocalDeterministicAdapter } from "./adapters/localDeterministicAdapter";
import { GeminiAdapter } from "./adapters/geminiAdapter";
import { GroqAdapter } from "./adapters/groqAdapter";

export class ProviderFactory {
  static getProvider(providerName?: string, apiKey?: string): LlmProvider {
    const selected = providerName || process.env.DEFAULT_LLM_PROVIDER || "local-deterministic";

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
