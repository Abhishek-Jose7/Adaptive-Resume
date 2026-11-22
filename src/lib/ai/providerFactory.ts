import { LlmProvider } from "./providerInterface";
import { LocalDeterministicAdapter } from "./adapters/localDeterministicAdapter";
import { GeminiAdapter } from "./adapters/geminiAdapter";
import { GroqAdapter } from "./adapters/groqAdapter";
import { OpenRouterAdapter } from "./adapters/openRouterAdapter";

/**
 * Determines whether the user is one of the designated primary administrators
 * (abhishekjose780 or scarlettmenezes29).
 */
export function isPrimaryUser(email?: string | null): boolean {
  if (!email) {
    const devEmail = process.env.DEV_USER_EMAIL;
    if (devEmail) {
      const devLower = devEmail.toLowerCase();
      return devLower.includes("abhishekjose780") || devLower.includes("scarlettmenezes29");
    }
    return true; // Default to primary in local dev environments if unset
  }
  const normalized = email.toLowerCase().trim();
  return normalized.includes("abhishekjose780") || normalized.includes("scarlettmenezes29");
}

/**
 * Resolves the appropriate Groq API keys based on caller user identity.
 * - Primary users (Abhishek & Scarlett): Key 1 (primary) + Key 2 (fallback on 429)
 * - Outside / Other users: Key 2 (strictly isolated, preserving Key 1 quota)
 */
export function resolveGroqKeys(
  explicitKey?: string,
  userEmail?: string | null
): { primaryKey: string; fallbackKey?: string } {
  if (explicitKey) {
    return {
      primaryKey: explicitKey,
      fallbackKey: process.env.GROQ_API_KEY_FALLBACK,
    };
  }

  const isPrimary = isPrimaryUser(userEmail);

  if (isPrimary) {
    // Primary User (Abhishek & Scarlett):
    // Dedicated primary key with fallback key as automatic rate-limit failover
    return {
      primaryKey: process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_FALLBACK || "",
      fallbackKey: process.env.GROQ_API_KEY_FALLBACK,
    };
  } else {
    // Non-primary / Normal Users:
    // Uses secondary key (Key 2) first, and ONLY if Key 2 is exhausted (429), falls back to Key 1!
    return {
      primaryKey: process.env.GROQ_API_KEY_FALLBACK || process.env.GROQ_API_KEY || "",
      fallbackKey: process.env.GROQ_API_KEY || undefined,
    };
  }
}

export class ProviderFactory {
  /**
   * Dedicated Pipeline A: Resume Parser Provider
   * Prioritizes Groq if GROQ_API_KEY is configured or DEFAULT_LLM_PROVIDER=groq
   * Defaults to OpenRouter if configured, otherwise falls back to local deterministic adapter.
   */
  static getParserProvider(apiKey?: string, model?: string, userEmail?: string | null): LlmProvider {
    const defaultProvider = (process.env.DEFAULT_LLM_PROVIDER || "").toLowerCase();

    // Prioritize Groq if selected or if Groq key exists and OpenRouter is not forced
    if (defaultProvider === "groq" || (process.env.GROQ_API_KEY && defaultProvider !== "openrouter")) {
      const { primaryKey, fallbackKey } = resolveGroqKeys(apiKey, userEmail);
      if (primaryKey) {
        return new GroqAdapter(primaryKey, model, fallbackKey);
      }
    }

    const openRouterKey = apiKey || process.env.OPENROUTER_API_KEY_PARSER || process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
      return new OpenRouterAdapter(openRouterKey, model, "parser");
    }

    if (process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_FALLBACK) {
      const { primaryKey, fallbackKey } = resolveGroqKeys(apiKey, userEmail);
      if (primaryKey) {
        return new GroqAdapter(primaryKey, model, fallbackKey);
      }
    }

    return new LocalDeterministicAdapter();
  }

  /**
   * Dedicated Pipeline B: Resume Intelligence / Reasoning Provider
   * Prioritizes Groq if GROQ_API_KEY is configured or DEFAULT_LLM_PROVIDER=groq
   * Defaults to OpenRouter if configured, otherwise falls back to local deterministic adapter.
   */
  static getReasoningProvider(apiKey?: string, model?: string, userEmail?: string | null): LlmProvider {
    const defaultProvider = (process.env.DEFAULT_LLM_PROVIDER || "").toLowerCase();

    // Prioritize Groq if selected or if Groq key exists and OpenRouter is not forced
    if (defaultProvider === "groq" || (process.env.GROQ_API_KEY && defaultProvider !== "openrouter")) {
      const { primaryKey, fallbackKey } = resolveGroqKeys(apiKey, userEmail);
      if (primaryKey) {
        return new GroqAdapter(primaryKey, model, fallbackKey);
      }
    }

    const openRouterKey = apiKey || process.env.OPENROUTER_API_KEY_REASONING || process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
      return new OpenRouterAdapter(openRouterKey, model, "reasoning");
    }

    if (process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_FALLBACK) {
      const { primaryKey, fallbackKey } = resolveGroqKeys(apiKey, userEmail);
      if (primaryKey) {
        return new GroqAdapter(primaryKey, model, fallbackKey);
      }
    }

    return new LocalDeterministicAdapter();
  }

  /**
   * Universal provider getter (backward-compatible)
   */
  static getProvider(
    providerName?: string,
    apiKey?: string,
    role: "parser" | "reasoning" | "generic" = "generic",
    userEmail?: string | null
  ): LlmProvider {
    const defaultProvider = process.env.DEFAULT_LLM_PROVIDER || (process.env.GROQ_API_KEY ? "groq" : "openrouter");
    const selected = (providerName || defaultProvider).toLowerCase();

    if (selected === "groq" && (apiKey || process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_FALLBACK)) {
      const { primaryKey, fallbackKey } = resolveGroqKeys(apiKey, userEmail);
      return new GroqAdapter(primaryKey, undefined, fallbackKey);
    }

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

    // Default to zero-cost, reliable, deterministic local adapter
    return new LocalDeterministicAdapter();
  }
}
