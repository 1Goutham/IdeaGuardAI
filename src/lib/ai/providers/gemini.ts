import "server-only";
import { aiError, sanitize } from "../contracts";
import { parseDuration } from "../rate";
import type { Capabilities, CompletionOptions, CompletionResult, Provider, ProviderStatus } from "./types";

/**
 * Google Gemini. Free tier with no card, native JSON mode. Model IDs are
 * resolved from the API rather than hardcoded because Google retires them
 * regularly; GEMINI_MODEL pins one.
 */

const BASE = (process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
const TIMEOUT_MS = 90_000;
const CACHE_MS = 60 * 60 * 1000;
const LAST_RESORT = "gemini-flash-latest";
const SIGNUP = "https://aistudio.google.com/apikey";

let cache: { model: string; at: number } | null = null;

/** Rank a model ID; higher is better. null means "not a general text model". */
export function scoreGeminiModel(name: string): number | null {
  const m = /^gemini-(\d+)(?:\.(\d+))?-(flash|pro)(.*)$/.exec(name);
  if (!m) return null;
  const suffix = m[4];
  if (/(tts|image|audio|live|embedding|thinking|computer|robotics|native|vision|deep|research)/i.test(suffix)) return null;
  let score = Number(m[1]) * 100 + Number(m[2] ?? 0) * 10;
  score += m[3] === "flash" ? 5 : 3;
  if (/lite/i.test(suffix)) score -= 2;
  if (/preview|exp/i.test(suffix)) score -= 4;
  if (/-\d{2,}$/.test(suffix)) score -= 1;
  return score;
}

async function listModels(key: string): Promise<string[] | null> {
  try {
    const res = await fetch(`${BASE}/v1beta/models?pageSize=200`, {
      headers: { "x-goog-api-key": key },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { models?: { name?: string; supportedGenerationMethods?: string[] }[] };
    return (data.models ?? [])
      .filter((m) => m.name && m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name!.replace(/^models\//, ""));
  } catch {
    return null;
  }
}

async function resolveModel(key: string): Promise<string> {
  const pinned = process.env.GEMINI_MODEL?.trim();
  if (pinned) return pinned;
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.model;
  const available = await listModels(key);
  const ranked = (available ?? [])
    .map((name) => ({ name, score: scoreGeminiModel(name) }))
    .filter((x): x is { name: string; score: number } => x.score !== null)
    .sort((a, b) => b.score - a.score);
  const model = ranked[0]?.name ?? LAST_RESORT;
  cache = { model, at: Date.now() };
  return model;
}

interface GeminiPayload {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string; status?: string; details?: { retryDelay?: string }[] };
}

async function request(key: string, model: string, opts: CompletionOptions): Promise<Response | CompletionResult> {
  try {
    return await fetch(`${BASE}/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: opts.signal ? AbortSignal.any([opts.signal, AbortSignal.timeout(TIMEOUT_MS)]) : AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        system_instruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.4,
          maxOutputTokens: opts.maxOutputTokens ?? 8192,
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    });
  } catch (e) {
    const name = (e as Error)?.name;
    if (name === "TimeoutError") return aiError("timeout", "Gemini took too long to respond.", true);
    if (name === "AbortError") return aiError("network", "Stopped.");
    return aiError("network", "Couldn't reach Gemini.", true);
  }
}

export const gemini: Provider = {
  id: "gemini",
  label: "Google Gemini",
  signupUrl: SIGNUP,
  configured: () => !!process.env.GEMINI_API_KEY,
  capabilities: (): Capabilities => ({ jsonMode: true, reasoningEffort: false }),

  async complete(opts) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return aiError("not_configured", "Gemini is not configured.");

    let model = await resolveModel(key);
    let res = await request(key, model, opts);
    if (res instanceof Response && res.status === 404 && !process.env.GEMINI_MODEL) {
      cache = null;
      const next = await resolveModel(key);
      if (next !== model) {
        model = next;
        res = await request(key, model, opts);
      }
    }
    if (!(res instanceof Response)) return res;

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as GeminiPayload | null;
      const reason = sanitize(body?.error?.message ?? "", 200);
      const detail = { provider: "Google Gemini", model, status: res.status, providerCode: body?.error?.status };
      if (res.status === 429) {
        const retryAfterMs = parseDuration(body?.error?.details?.find((d) => d.retryDelay)?.retryDelay);
        return { ...aiError("rate_limited", `Gemini rate limit reached${reason ? `: ${reason}` : "."}`, true, detail), model, rate: { retryAfterMs } };
      }
      console.error("Gemini error:", res.status, model, reason);
      return { ...aiError("upstream", `Gemini returned ${res.status}${reason ? `: ${reason}` : ""}.`, res.status >= 500, detail), model };
    }

    const payload = (await res.json().catch(() => null)) as GeminiPayload | null;
    if (!payload) return { ...aiError("malformed", "Gemini returned something unreadable.", true), model };
    if (payload.promptFeedback?.blockReason) return { ...aiError("blocked", "Gemini declined this request. Try rephrasing the idea."), model };
    const candidate = payload.candidates?.[0];
    const text = candidate?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("").trim();
    const usage = payload.usageMetadata ? { input: payload.usageMetadata.promptTokenCount ?? 0, output: payload.usageMetadata.candidatesTokenCount ?? 0 } : undefined;
    if (candidate?.finishReason === "MAX_TOKENS") {
      return { ...aiError("truncated", "Gemini stopped at the output limit before finishing.", true, { provider: "Google Gemini", model, received: sanitize(text ?? "", 300) }), model, usage };
    }
    if (!text) {
      if (candidate?.finishReason === "SAFETY") return { ...aiError("blocked", "Gemini declined this request. Try rephrasing the idea."), model };
      return { ...aiError("empty", "Gemini came back empty.", true), model };
    }
    return { ok: true, data: text, model, usage, finish: candidate?.finishReason };
  },

  async status(): Promise<ProviderStatus> {
    const key = process.env.GEMINI_API_KEY;
    return {
      id: "gemini",
      label: "Google Gemini",
      signupUrl: SIGNUP,
      configured: !!key,
      model: key ? await resolveModel(key).catch(() => null) : null,
      note: "Free tier, no card.",
    };
  },
};
