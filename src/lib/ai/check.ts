import "server-only";
import { z } from "zod";
import { activeSearchProvider } from "@/lib/research/providers";
import { sanitize, type AiError } from "./contracts";
import { parseJson } from "./json";
import { activeProviders } from "./providers";

/**
 * A live connection check: one tiny structured request to every configured
 * model provider and one search, so a deployment can be confirmed working
 * before anyone runs a real analysis. Errors are sanitised; keys never leave.
 */

export interface ProviderCheck {
  id: string;
  label: string;
  model: string | null;
  ok: boolean;
  latencyMs: number;
  /** Did the provider return JSON matching a schema, not just any text? */
  structured: boolean;
  error?: Pick<AiError, "code" | "message">;
}

export interface ResearchCheck {
  label: string;
  ok: boolean;
  latencyMs: number;
  results: number;
  error?: string;
}

const Pong = z.object({ status: z.literal("ok"), sum: z.number() });

async function checkProvider(p: ReturnType<typeof activeProviders>[number]): Promise<ProviderCheck> {
  const started = Date.now();
  const res = await p.complete({
    system: "You are a connection check. Reply with JSON only.",
    prompt: 'Return {"status":"ok","sum":N} where N is 2+3.',
    json: p.capabilities().jsonMode,
    maxOutputTokens: 400,
    reasoning: p.capabilities().reasoningEffort ? "low" : undefined,
    tag: "check",
    signal: AbortSignal.timeout(30_000),
  });
  const latencyMs = Date.now() - started;
  const model = res.model ?? (await p.status()).model;
  if (!res.ok) return { id: p.id, label: p.label, model, ok: false, structured: false, latencyMs, error: { code: res.error.code, message: sanitize(res.error.message, 240) } };
  const parsed = Pong.safeParse(parseJson(res.data));
  const structured = parsed.success && parsed.data.sum === 5;
  return {
    id: p.id,
    label: p.label,
    model,
    ok: true,
    structured,
    latencyMs,
    ...(structured ? {} : { error: { code: "malformed" as const, message: "Connected, but the answer didn't match a simple schema. Analyses will rely on repair passes." } }),
  };
}

async function checkResearch(): Promise<ResearchCheck | null> {
  const s = activeSearchProvider();
  if (!s) return null;
  const started = Date.now();
  try {
    const r = await s.search("product market research", 2);
    // Reaching the provider is what's checked; an empty result set is still a working connection.
    return { label: s.label, ok: true, latencyMs: Date.now() - started, results: r.length };
  } catch (e) {
    return { label: s.label, ok: false, latencyMs: Date.now() - started, results: 0, error: sanitize(String((e as Error)?.message ?? e), 200) };
  }
}

export async function connectionCheck(): Promise<{ providers: ProviderCheck[]; research: ResearchCheck | null; checkedAt: string }> {
  const [providers, research] = await Promise.all([Promise.all(activeProviders().map(checkProvider)), checkResearch()]);
  return { providers, research, checkedAt: new Date().toISOString() };
}
