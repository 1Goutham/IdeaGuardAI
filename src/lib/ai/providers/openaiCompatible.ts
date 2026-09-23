import "server-only";
import { aiError, sanitize } from "../contracts";
import { rateFromHeaders } from "../rate";
import type { Capabilities, CompletionOptions, CompletionResult, Provider, ProviderId, ProviderStatus } from "./types";

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
  /** Models that accept `reasoning_effort` (Groq: gpt-oss). */
  reasoningModels?: RegExp;
  /** Groq and OpenAI use `max_completion_tokens`; many local servers only know `max_tokens`. */
  maxTokensParam?: "max_tokens" | "max_completion_tokens";
  /** TPM to assume before the first response reports the real limit. */
  initialTpm?: (model: string) => number | undefined;
  extraHeaders?: Record<string, string>;
  note?: string;
}

interface ErrorBody {
  error?: { message?: string; code?: string; type?: string; failed_generation?: string } | string;
}

export function createCompatibleProvider(cfg: CompatibleConfig): Provider {
  let cache: { model: string; at: number } | null = null;

  const currentModel = () => cfg.model() ?? cache?.model ?? cfg.defaultModels[0] ?? "";

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

  const capabilities = (): Capabilities => ({
    jsonMode: cfg.supportsJsonMode,
    reasoningEffort: !!cfg.reasoningModels?.test(currentModel()),
  });

  return {
    id: cfg.id,
    label: cfg.label,
    signupUrl: cfg.signupUrl,
    configured: () => !!cfg.apiKey() && !!cfg.baseUrl(),
    capabilities,
    initialTokensPerMinute: () => cfg.initialTpm?.(currentModel()),

    async complete(opts: CompletionOptions): Promise<CompletionResult> {
      const key = cfg.apiKey();
      if (!key) return aiError("not_configured", `${cfg.label} is not configured.`);
      const model = await resolveModel(key);
      const base = { provider: cfg.label, model };

      let res: Response;
      try {
        res = await fetch(`${cfg.baseUrl()}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...cfg.extraHeaders },
          signal: opts.signal ? AbortSignal.any([opts.signal, AbortSignal.timeout(TIMEOUT_MS)]) : AbortSignal.timeout(TIMEOUT_MS),
          body: JSON.stringify({
            model,
            temperature: opts.temperature ?? 0.4,
            [cfg.maxTokensParam ?? "max_tokens"]: opts.maxOutputTokens ?? 4096,
            messages: [
              { role: "system", content: opts.system },
              { role: "user", content: opts.prompt },
            ],
            ...(opts.json && cfg.supportsJsonMode ? { response_format: { type: "json_object" } } : {}),
            ...(opts.reasoning && cfg.reasoningModels?.test(model) ? { reasoning_effort: opts.reasoning } : {}),
          }),
        });
      } catch (e) {
        const name = (e as Error)?.name;
        if (name === "TimeoutError") return { ...aiError("timeout", `${cfg.label} took longer than ${TIMEOUT_MS / 1000}s to respond.`, true, base), model };
        if (name === "AbortError") return { ...aiError("network", "Stopped.", false, base), model };
        return { ...aiError("network", `Couldn't reach ${cfg.label}.`, true, base), model };
      }

      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        let body: ErrorBody | null = null;
        try {
          body = JSON.parse(raw) as ErrorBody;
        } catch {
          /* not JSON */
        }
        const err = typeof body?.error === "object" ? body.error : { message: typeof body?.error === "string" ? body.error : raw };
        const message = sanitize(err?.message ?? "");
        const detail = { ...base, status: res.status, providerCode: err?.code };
        const rate = rateFromHeaders(res.headers, raw);

        if (res.status === 429) {
          return { ...aiError("rate_limited", `${cfg.label} rate limit reached${message ? `: ${message}` : "."}`, true, detail), model, rate };
        }
        if (res.status === 413) {
          return { ...aiError("too_large", `The request is larger than ${cfg.label} allows for this model per minute${message ? `: ${message}` : "."}`, false, detail), model, rate };
        }
        // Groq's JSON mode rejects output that isn't valid JSON; the failed text is useful for repair.
        if (err?.code === "json_validate_failed") {
          return {
            ...aiError("malformed", `${cfg.label} could not produce valid JSON.`, true, { ...detail, received: sanitize(err.failed_generation ?? "", 600) }),
            model,
            rate,
          };
        }
        console.error(`${cfg.label} error:`, res.status, model, message);
        return { ...aiError("upstream", `${cfg.label} returned ${res.status}${message ? `: ${message}` : "."}`, res.status >= 500, detail), model, rate };
      }

      const rate = rateFromHeaders(res.headers);
      const payload = (await res.json().catch(() => null)) as {
        choices?: { message?: { content?: string | { text?: string }[] }; finish_reason?: string }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      } | null;
      const choice = payload?.choices?.[0];
      const rawContent = choice?.message?.content;
      const text = (Array.isArray(rawContent) ? rawContent.map((p) => p.text ?? "").join("") : (rawContent ?? "")).trim();
      const usage = payload?.usage ? { input: payload.usage.prompt_tokens ?? 0, output: payload.usage.completion_tokens ?? 0 } : undefined;
      const finish = choice?.finish_reason;

      if (finish === "length") {
        return {
          ...aiError("truncated", `${cfg.label} stopped at the output limit before finishing.`, true, { ...base, received: sanitize(text, 300) }),
          model,
          rate,
          usage,
          finish,
        };
      }
      if (!text) {
        if (finish === "content_filter") return { ...aiError("blocked", `${cfg.label} declined this request.`, false, base), model, rate, usage };
        return { ...aiError("empty", `${cfg.label} returned an empty answer.`, true, base), model, rate, usage };
      }
      return { ok: true, data: text, model, rate, usage, finish };
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
