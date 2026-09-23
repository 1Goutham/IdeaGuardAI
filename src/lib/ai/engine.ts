import "server-only";
import { z } from "zod";
import { budgetFor, sleep } from "./budget";
import { aiError, sanitize, type AiError, type AiResponse } from "./contracts";
import { parseJson } from "./json";
import { activeProviders, allProviders } from "./providers";
import { estimateTokens } from "./rate";
import type { CompletionOptions, Provider, ProviderStatus, ReasoningEffort } from "./providers/types";

/**
 * IdeaGuard's model engine.
 *
 * `generate` sends one completion through the provider chain:
 *   - reserves room in the provider's tokens-per-minute budget first,
 *   - on a rate limit, waits as long as the provider says (bounded), then retries,
 *   - on errors another provider could fix, moves to the next provider.
 *
 * `generateStructured` adds the output contract: the zod schema is shown to the
 * model as JSON Schema, the answer is validated against it, one repair round
 * sends the exact validation problems back, and a truncated answer is retried
 * once with more room. Then it gives up and says precisely why.
 */

/** Errors worth trying on the next provider. */
const FALL_THROUGH: ReadonlySet<AiError["code"]> = new Set(["rate_limited", "too_large", "timeout", "upstream", "network", "empty", "not_configured"]);
const MAX_RATE_WAITS = 3;
const MAX_SINGLE_WAIT_MS = 65_000;

export interface CallTrace {
  /** "Groq · openai/gpt-oss-120b" */
  engine: string;
  provider: string;
  model: string;
  /** Provider requests made, including retries and repairs. */
  calls: number;
  /** Time spent waiting for rate-limit room. */
  waitedMs: number;
  /** True when the first answer failed validation and the repair pass fixed it. */
  repaired: boolean;
  inputTokens: number;
  outputTokens: number;
  reasoning?: ReasoningEffort;
}

export interface GenerateOptions extends Omit<CompletionOptions, "json"> {
  json?: boolean;
  /** Absolute time (ms) after which no new request or wait may start. */
  deadline?: number;
  /** Called when the call has to wait for rate-limit capacity, so progress can say so. */
  onWait?: (reason: "capacity" | "rate_limited", ms?: number) => void;
}

type GenerateResult = { ok: true; data: string; trace: CallTrace } | { ok: false; error: AiError; trace?: CallTrace };

function newTrace(p: Provider, model = "", reasoning?: ReasoningEffort): CallTrace {
  return { engine: `${p.label}${model ? ` · ${model}` : ""}`, provider: p.label, model, calls: 0, waitedMs: 0, repaired: false, inputTokens: 0, outputTokens: 0, reasoning };
}

export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const chain = activeProviders();
  if (!chain.length) {
    return aiError(
      "not_configured",
      "IdeaGuard isn't connected to a model yet. Add GEMINI_API_KEY (free), GROQ_API_KEY (free) or ANTHROPIC_API_KEY and redeploy.",
    );
  }
  const deadline = opts.deadline ?? Date.now() + 240_000;
  let last: { error: AiError; trace?: CallTrace } | null = null;

  for (const provider of chain) {
    const caps = provider.capabilities();
    const reasoning = caps.reasoningEffort ? opts.reasoning : undefined;
    const budget = budgetFor(provider.id, provider.initialTokensPerMinute?.());
    const trace = newTrace(provider, "", reasoning);
    // Reserve the prompt plus a typical answer. The reservation is corrected to the
    // provider's real usage afterwards, and an underestimate is caught by the 429 path.
    const estimate = estimateTokens(opts.system + opts.prompt) + Math.min(opts.maxOutputTokens ?? 1024, 1024);

    for (let rateWaits = 0; ; ) {
      // Only report a wait that is actually noticeable.
      const notice = opts.onWait ? setTimeout(() => opts.onWait!("capacity"), 1500) : undefined;
      const slot = await budget.reserve(estimate, deadline, opts.signal);
      clearTimeout(notice);
      if (!slot) {
        last = { error: { code: "timeout", message: "The run's time budget ran out while waiting for model capacity.", retryable: true, detail: { provider: provider.label } }, trace };
        break;
      }
      trace.waitedMs += slot.waitedMs;
      trace.calls++;
      const res = await provider.complete({ ...opts, reasoning, json: opts.json && caps.jsonMode });
      if (res.model) {
        trace.model = res.model;
        trace.engine = `${provider.label} · ${res.model}`;
      }
      budget.learn(res.rate);
      // Requests rejected before generation (rate limits, server errors) cost no tokens.
      const generatedNothing = !res.ok && !res.usage && ["rate_limited", "too_large", "upstream", "network", "timeout", "not_configured"].includes(res.error.code);
      slot.settle(generatedNothing ? 0 : res.usage ? res.usage.input + res.usage.output : undefined);
      if (res.usage) {
        trace.inputTokens += res.usage.input;
        trace.outputTokens += res.usage.output;
      }
      if (res.ok) return { ok: true, data: res.data, trace };

      last = { error: { ...res.error, detail: { ...res.error.detail, attempts: trace.calls } }, trace };
      if (opts.signal?.aborted) return { ok: false, error: last.error, trace };

      // Rate limited: the provider told us when to come back. Wait if the run can afford it.
      if (res.error.code === "rate_limited" && rateWaits < MAX_RATE_WAITS) {
        const wait = Math.min(res.rate?.retryAfterMs ?? 5_000, MAX_SINGLE_WAIT_MS) + Math.random() * 750;
        if (Date.now() + wait < deadline) {
          rateWaits++;
          opts.onWait?.("rate_limited", wait);
          const started = Date.now();
          await sleep(wait, opts.signal);
          trace.waitedMs += Date.now() - started;
          continue;
        }
      }
      // One quick retry for a transient server or network failure.
      if ((res.error.code === "upstream" || res.error.code === "network" || res.error.code === "timeout") && res.error.retryable && trace.calls === 1 + rateWaits) {
        await sleep(1_500, opts.signal);
        continue;
      }
      break;
    }

    if (!FALL_THROUGH.has(last!.error.code)) return { ok: false, ...last! };
    console.warn(`IdeaGuard: ${provider.label} failed (${last!.error.code}); ${chain.indexOf(provider) < chain.length - 1 ? "trying the next provider" : "no providers left"}.`);
  }
  return { ok: false, ...last! };
}

/** The schema as the model sees it: JSON Schema without noise. */
export function schemaForPrompt(schema: z.ZodType): string {
  const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  delete json.$schema;
  return JSON.stringify(json, (key, value) => (key === "default" ? undefined : value));
}

function issuesOf(error: z.ZodError): string[] {
  return error.issues.slice(0, 10).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
}

export interface StructuredOptions<T> {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  /** Agent name, for traces and the dev mock. */
  tag: string;
  temperature?: number;
  maxOutputTokens?: number;
  reasoning?: ReasoningEffort;
  deadline?: number;
  signal?: AbortSignal;
  onWait?: GenerateOptions["onWait"];
}

export async function generateStructured<T>(opts: StructuredOptions<T>): Promise<AiResponse<{ value: T; trace: CallTrace }>> {
  const contract = `\n\nRespond with one JSON object that matches this JSON Schema exactly. No prose, no markdown, no code fences. Use plain text inside strings.\n${schemaForPrompt(opts.schema)}`;
  let prompt = opts.prompt + contract;
  let maxOutputTokens = opts.maxOutputTokens ?? 3000;
  let reasoning = opts.reasoning;
  let repairUsed = false;
  let truncationUsed = false;
  const total = { calls: 0, waitedMs: 0, inputTokens: 0, outputTokens: 0 };

  for (;;) {
    const res = await generate({ system: opts.system, prompt, json: true, tag: opts.tag, temperature: opts.temperature, maxOutputTokens, reasoning, deadline: opts.deadline, signal: opts.signal, onWait: opts.onWait });
    if (res.trace) {
      total.calls += res.trace.calls;
      total.waitedMs += res.trace.waitedMs;
      total.inputTokens += res.trace.inputTokens;
      total.outputTokens += res.trace.outputTokens;
    }
    const withTotals = (t: CallTrace): CallTrace => ({ ...t, ...total, repaired: repairUsed });

    // Output cut off: give it more room once and ask for less thinking.
    if (!res.ok && res.error.code === "truncated" && !truncationUsed) {
      truncationUsed = true;
      maxOutputTokens = Math.round(maxOutputTokens * 1.75);
      reasoning = "low";
      continue;
    }

    let received = "";
    let issues: string[] = [];
    if (res.ok) {
      received = res.data;
      const raw = parseJson(res.data);
      const parsed = raw === null ? null : opts.schema.safeParse(raw);
      if (parsed?.success) return { ok: true, data: { value: parsed.data, trace: withTotals(res.trace) } };
      issues = parsed ? issuesOf(parsed.error) : ["The response was not valid JSON."];
    } else if (res.error.code === "malformed") {
      // Provider-side JSON failure (e.g. Groq json_validate_failed): repairable.
      received = res.error.detail?.received ?? "";
      issues = ["The previous answer was not valid JSON."];
    } else {
      return { ok: false, error: { ...res.error, detail: { ...res.error.detail, attempts: total.calls } } };
    }

    if (repairUsed) {
      console.warn(`IdeaGuard: ${opts.tag} failed validation after repair.\n${issues.join("\n")}`);
      return aiError("malformed", "The model's answer didn't match the expected structure, even after a repair attempt.", true, {
        provider: res.ok ? res.trace.provider : res.error.detail?.provider,
        model: res.ok ? res.trace.model : res.error.detail?.model,
        issues,
        received: sanitize(received, 600),
        attempts: total.calls,
      });
    }
    repairUsed = true;
    console.warn(`IdeaGuard: ${opts.tag} output failed validation; sending one repair request.\n${issues.join("\n")}`);
    prompt = `${opts.prompt}${contract}\n\nYour previous answer did not match the schema:\n${issues.map((i) => `- ${i}`).join("\n")}\n\nPrevious answer (for reference):\n${received.slice(0, 4000)}\n\nReturn the corrected JSON object only.`;
  }
}

export async function engineStatus(): Promise<{ providers: ProviderStatus[]; active: string[] }> {
  const providers = await Promise.all(allProviders().map((p) => p.status()));
  return { providers, active: activeProviders().map((p) => p.id) };
}
