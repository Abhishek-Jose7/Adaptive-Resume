/**
 * Provider-Neutral LLM Interface
 * PRD Section 7.5 & 10.7
 */

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export type LlmTaskType =
  | "parse_resume"
  | "parse_jd"
  | "analyze_jd"
  | "rewrite"
  | "cover_letter"
  | "vision";

export interface StructuredLlmInput<T> {
  task: LlmTaskType;
  systemPrompt: string;
  userPayload: unknown;
  schema: unknown;
  maxOutputTokens: number;
  temperature: number;
  idempotencyKey?: string;
}

export interface LlmProvider {
  name: string;
  generateStructured<T>(
    input: StructuredLlmInput<T>
  ): Promise<{ data: T; model: string; usage?: TokenUsage }>;
}
