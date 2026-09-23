import type { AiResponse } from "../contracts";

export interface CompletionOptions {
  system: string;
  prompt: string;
  /** Ask the provider for a JSON object; parsing is still tolerant. */
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  /** Lets the dev-only mock provider return the right fixture. Ignored by real providers. */
  tag?: string;
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

export type CompletionResult = AiResponse<string> & { model?: string };

export interface Provider {
  id: ProviderId;
  label: string;
  signupUrl: string;
  configured(): boolean;
  complete(opts: CompletionOptions): Promise<CompletionResult>;
  status(): Promise<ProviderStatus>;
}
