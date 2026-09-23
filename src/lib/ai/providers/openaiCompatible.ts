import "server-only";
import { aiError } from "../contracts";
import type { CompletionOptions, CompletionResult, Provider, ProviderId, ProviderStatus } from "./types";

/**
 * Any OpenAI-compatible chat endpoint: Groq, OpenRouter, Cerebras, Mistral,
 * Together, or a local Ollama (the original IdeaGuard ran on Ollama).
 */

const TIMEOUT_MS = 120_000;
const CACHE_MS = 60 * 60 * 1000;

export interface CompatibleConfig {
  id: ProviderId;
  label: string;
  signupUrl: string;
  baseUrl: () => string;
  apiKey: () => string | undefined;
  model: () => string | undefined;
  /** Ordered guesses when no model is pinned. The first one the key can see wins. */
  defaultModels: string[];
  supportsJsonMode: boolean;
  extraHeaders?: Record<string, string>;
  note?: string;
}

export function createCompatibleProvider(cfg: CompatibleConfig): Provider {
  let cache: { model: string; at: number } | null = null;

  async function resolveModel(key: string): Promise<string> {
    const pinned = cfg.model();
    if (pinned) return pinned;
    if (cache && Date.now() - cache.at < CACHE_MS) return cache.model;
    let model = cfg.defaultModels[0] ?? "";
    try {
      const res = await fetch(`${cfg.baseUrl()}/models`, {
        headers: { Authorization: `Bearer ${key}`, ...cfg.extraHeaders },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const data = (await res.json()) as { data?: { id?: string }[] };
        const ids = new Set((data.data ?? []).map((m) => m.id));
        model = cfg.defaultModels.find((m) => ids.has(m)) ?? model;
      }
    } catch {
      /* keep the default */
    }
    cache = { model, at: Date.now() };
    return model;
  }

  async function request(key: string, model: string, opts: CompletionOptions): Promise<Response | CompletionResult> {
    try {
      return await fetch(`${cfg.baseUrl()}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...cfg.extraHeaders },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({
          model,
          temperature: opts.temperature ?? 0.4,
          max_tokens: opts.maxOutputTokens ?? 8192,
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.prompt },
          ],
          ...(opts.json && cfg.supportsJsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
      });
    } catch (e) {
      const name = (e as Error)?.name;
      if (name === "TimeoutError" || name === "AbortError") return aiError("timeout", `${cfg.label} took too long to respond.`, true);
      return aiError("network", `Couldn't reach ${cfg.label}.`, true);
    }
  }

  return {
    id: cfg.id,
    label: cfg.label,
    signupUrl: cfg.signupUrl,
    configured: () => !!cfg.apiKey() && !!cfg.baseUrl(),

    async complete(opts) {
      const key = cfg.apiKey();
      if (!key) return aiError("not_configured", `${cfg.label} is not configured.`);
      const model = await resolveModel(key);
      const res = await request(key, model, opts);
      if (!(res instanceof Response)) return res;

      if (res.status === 429) return { ...aiError("rate_limited", `${cfg.label} is rate-limited right now.`, true), model };
      if (!res.ok) {
        const detail = (await res.text().catch(() => "")).slice(0, 300);
        console.error(`${cfg.label} error:`, res.status, model, detail);
        if (res.status === 404) cache = null;
        return { ...aiError("upstream", `${cfg.label} returned ${res.status}.`, res.status >= 500 || res.status === 404), model };
      }

      const payload = (await res.json().catch(() => null)) as {
        choices?: { message?: { content?: string | { text?: string }[] }; finish_reason?: string }[];
      } | null;
      const choice = payload?.choices?.[0];
      const raw = choice?.message?.content;
      const text = (Array.isArray(raw) ? raw.map((p) => p.text ?? "").join("") : (raw ?? "")).trim();
      if (!text) {
        if (choice?.finish_reason === "content_filter") return { ...aiError("blocked", `${cfg.label} declined this request.`), model };
        return { ...aiError("empty", `${cfg.label} came back empty.`, true), model };
      }
      return { ok: true, data: text, model };
    },

    async status(): Promise<ProviderStatus> {
      const key = cfg.apiKey();
      return {
        id: cfg.id,
        label: cfg.label,
        signupUrl: cfg.signupUrl,
        configured: !!key && !!cfg.baseUrl(),
        model: key ? await resolveModel(key).catch(() => null) : null,
        note: cfg.note,
      };
    },
  };
}
