import "server-only";
import { anthropic } from "./anthropic";
import { gemini } from "./gemini";
import { mock } from "./mock";
import { createCompatibleProvider } from "./openaiCompatible";
import type { Provider, ProviderId } from "./types";

/**
 * Provider registry. Every provider with a key joins the fallback chain in
 * this order; AI_PROVIDERS (comma-separated ids) overrides it.
 */

export const groq = createCompatibleProvider({
  id: "groq",
  label: "Groq",
  signupUrl: "https://console.groq.com/keys",
  baseUrl: () => (process.env.GROQ_API_BASE || "https://api.groq.com/openai/v1").replace(/\/$/, ""),
  apiKey: () => process.env.GROQ_API_KEY,
  model: () => process.env.GROQ_MODEL?.trim() || undefined,
  defaultModels: ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile"],
  supportsJsonMode: true,
  reasoningModels: /gpt-oss|qwen3/i,
  maxTokensParam: "max_completion_tokens",
  // Groq documents 8,000 TPM for gpt-oss on the base tier. The real limit is
  // read from response headers, so higher tiers are only throttled briefly.
  initialTpm: (model) => Number(process.env.GROQ_TPM) || (/gpt-oss|qwen3/i.test(model) ? 8000 : undefined),
  note: "Free tier, very fast.",
});

export const openrouter = createCompatibleProvider({
  id: "openrouter",
  label: "OpenRouter",
  signupUrl: "https://openrouter.ai/keys",
  baseUrl: () => (process.env.OPENROUTER_API_BASE || "https://openrouter.ai/api/v1").replace(/\/$/, ""),
  apiKey: () => process.env.OPENROUTER_API_KEY,
  model: () => process.env.OPENROUTER_MODEL?.trim() || undefined,
  defaultModels: ["meta-llama/llama-3.3-70b-instruct:free", "google/gemma-3-27b-it:free"],
  supportsJsonMode: false,
  extraHeaders: { "X-Title": "IdeaGuard" },
  note: "Many community models; quality varies.",
});

export const custom = createCompatibleProvider({
  id: "custom",
  label: process.env.AI_LABEL?.trim() || "Custom endpoint",
  signupUrl: "",
  baseUrl: () => (process.env.AI_BASE_URL || "").replace(/\/$/, ""),
  apiKey: () => (process.env.AI_BASE_URL ? process.env.AI_API_KEY || "none" : undefined),
  model: () => process.env.AI_MODEL?.trim() || undefined,
  defaultModels: [],
  supportsJsonMode: process.env.AI_JSON_MODE !== "0",
  note: "Any OpenAI-compatible endpoint, including a local Ollama.",
});

const ALL: Record<ProviderId, Provider> = { gemini, anthropic, groq, openrouter, custom, mock };
const DEFAULT_ORDER: ProviderId[] = ["anthropic", "gemini", "groq", "openrouter", "custom"];

export function providerOrder(): ProviderId[] {
  const raw = process.env.AI_PROVIDERS?.split(",").map((s) => s.trim().toLowerCase()) ?? [];
  const ids = raw.filter((id): id is ProviderId => id in ALL);
  return ids.length ? ids : DEFAULT_ORDER;
}

export function allProviders(): Provider[] {
  return providerOrder().map((id) => ALL[id]);
}

export function activeProviders(): Provider[] {
  return allProviders().filter((p) => p.configured());
}
