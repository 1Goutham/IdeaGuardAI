import "server-only";
import { z } from "zod";
import { aiError, type AiError, type AiResponse } from "./contracts";
import { parseJson } from "./json";
import { activeProviders, allProviders } from "./providers";
import type { CompletionOptions, ProviderStatus } from "./providers/types";

/**
 * IdeaGuard's model engine.
 *
 * `complete` walks the configured providers and falls through on failures
 * another provider could fix (rate limits, timeouts, outages, empty output).
 * `completeStructured` adds the contract: the zod schema is rendered into the
 * prompt as JSON Schema, the answer is validated against it, and one repair
 * round sends the validation errors back before giving up.
 */

const FALL_THROUGH: ReadonlySet<AiError["code"]> = new Set(["rate_limited", "timeout", "upstream", "network", "empty", "malformed", "not_configured"]);

export interface EngineMeta {
  /** Human-readable engine, e.g. "Google Gemini · gemini-2.5-flash". */
  engine: string;
}

export async function complete(opts: CompletionOptions): Promise<AiResponse<string> & Partial<EngineMeta>> {
  const chain = activeProviders();
  if (!chain.length) {
    return aiError(
      "not_configured",
      "IdeaGuard isn't connected to a model yet. Add GEMINI_API_KEY (free), GROQ_API_KEY (free) or ANTHROPIC_API_KEY to .env.local and restart.",
    );
  }
  let last: AiError | null = null;
  for (const provider of chain) {
    const res = await provider.complete(opts);
    const engine = `${provider.label}${res.model ? ` · ${res.model}` : ""}`;
    if (res.ok) return { ok: true, data: res.data, engine };
    last = res.error;
    if (!FALL_THROUGH.has(res.error.code)) return { ...res, engine };
    console.warn(`IdeaGuard: ${provider.label} failed (${res.error.code}).`);
  }
  const error = last!;
  return aiError(
    error.code,
    chain.length > 1 ? `All ${chain.length} model providers are unavailable right now. ${error.message}` : error.message,
    error.retryable,
  );
}

/** The schema as the model sees it: JSON Schema without noise. */
export function schemaForPrompt(schema: z.ZodType): string {
  const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  delete json.$schema;
  return JSON.stringify(json, (key, value) => (key === "default" ? undefined : value));
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 12)
    .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
}

export interface StructuredOptions<T> {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  tag: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export async function completeStructured<T>(opts: StructuredOptions<T>): Promise<AiResponse<{ value: T } & EngineMeta>> {
  const contract = `\n\nRespond with one JSON object that matches this JSON Schema exactly. No prose, no markdown fences.\n${schemaForPrompt(opts.schema)}`;
  let prompt = opts.prompt + contract;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await complete({
      system: opts.system,
      prompt,
      json: true,
      tag: opts.tag,
      temperature: opts.temperature,
      maxOutputTokens: opts.maxOutputTokens,
    });
    if (!res.ok) return res;

    const raw = parseJson(res.data);
    const parsed = raw === null ? null : opts.schema.safeParse(raw);
    if (parsed?.success) return { ok: true, data: { value: parsed.data, engine: res.engine ?? "" } };

    const problems = parsed ? describeIssues(parsed.error) : "- The response was not valid JSON.";
    console.warn(`IdeaGuard: ${opts.tag} output failed validation (attempt ${attempt + 1}).\n${problems}`);
    prompt = `${opts.prompt}${contract}\n\nYour previous answer did not match the schema:\n${problems}\n\nPrevious answer:\n${res.data.slice(0, 6000)}\n\nReturn the corrected JSON object only.`;
  }
  return aiError("malformed", "The model's answer came back in an unexpected shape twice. Try again.", true);
}

export async function engineStatus(): Promise<{ providers: ProviderStatus[]; active: string[] }> {
  const providers = await Promise.all(allProviders().map((p) => p.status()));
  return { providers, active: activeProviders().map((p) => p.id) };
}
