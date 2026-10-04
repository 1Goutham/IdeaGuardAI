import type { AiError, AiResponse } from "../contracts";

export type ReasoningEffort = "low" | "medium" | "high";

export interface CompletionOptions {
  system: string;
  prompt: string;
  /** Ask the provider for a JSON object; parsing and validation still happen in the engine. */
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  /** For reasoning models: how much to think. Ignored by providers that don't support it. */
  reasoning?: ReasoningEffort;
  /** Lets the dev-only mock provider return the right fixture. Ignored by real providers. */
  tag?: string;
  signal?: AbortSignal;
}

export type ProviderId = "gemini" | "anthropic" | "groq" | "openrouter" | "custom" | "mock";

export interface ProviderStatus {
  id: ProviderId;
  label: string;
  signupUrl: string;
  configured: boolean;
  model: string | null;
  note?: string;
}

/** Rate-limit facts a provider learned from the response, used by the scheduler. */
export interface RateInfo {
  /** Tokens-per-minute ceiling reported by the provider. */
  limitTokens?: number;
  remainingTokens?: number;
  /** Milliseconds until the token window resets. */
  resetMs?: number;
  /** From a 429: how long to wait before retrying. */
  retryAfterMs?: number;
}

export interface CompletionMeta {
  model?: string;
  rate?: RateInfo;
  usage?: { input: number; output: number };
  /** Why generation stopped, when the provider says ("stop", "length", …). */
  finish?: string;
}

export type CompletionResult = (AiResponse<string> & CompletionMeta) | ({ ok: false; error: AiError } & CompletionMeta);

export interface Capabilities {
  /** Native JSON output mode. Without it, JSON is requested in the prompt only. */
  jsonMode: boolean;
  /** Accepts a reasoning effort setting. */
  reasoningEffort: boolean;
}

export interface Provider {
  id: ProviderId;
  label: string;
  signupUrl: string;
  configured(): boolean;
  /** What this provider/model combination supports, so the engine can adapt. */
  capabilities(): Capabilities;
  /** Tokens-per-minute to assume before the provider reports its real limit. */
  initialTokensPerMinute?(): number | undefined;
  complete(opts: CompletionOptions): Promise<CompletionResult>;
  status(): Promise<ProviderStatus>;
}
