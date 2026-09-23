import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { aiError } from "../contracts";
import type { Capabilities, CompletionResult, Provider, ProviderStatus } from "./types";

/**
 * Anthropic Claude through the official SDK. Streams the response (analysis
 * outputs are long) and opts into server-side refusal fallbacks so a
 * policy decline on the primary model is retried on another model inside the
 * same call. ANTHROPIC_MODEL and ANTHROPIC_EFFORT override the defaults.
 */

const DEFAULT_MODEL = "claude-opus-5";
const SIGNUP = "https://console.anthropic.com/settings/keys";
const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
type Effort = (typeof EFFORTS)[number];

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 180_000 });
  return client;
}

const model = () => process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;

function effort(): Effort | undefined {
  const raw = process.env.ANTHROPIC_EFFORT?.trim().toLowerCase();
  return EFFORTS.find((e) => e === raw);
}

export const anthropic: Provider = {
  id: "anthropic",
  label: "Anthropic Claude",
  signupUrl: SIGNUP,
  configured: () => !!process.env.ANTHROPIC_API_KEY,
  // JSON is requested in the prompt and validated by the engine.
  capabilities: (): Capabilities => ({ jsonMode: false, reasoningEffort: false }),

  async complete(opts): Promise<CompletionResult> {
    if (!process.env.ANTHROPIC_API_KEY) return aiError("not_configured", "Claude is not configured.");
    const m = model();
    const level = effort();
    try {
      const message = await getClient()
        .beta.messages.stream({
          model: m,
          max_tokens: 16_000,
          system: opts.system,
          messages: [{ role: "user", content: opts.prompt }],
          ...(level ? { output_config: { effort: level } } : {}),
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        }, { signal: opts.signal })
        .finalMessage();

      if (message.stop_reason === "refusal") return { ...aiError("blocked", "Claude declined this request. Try rephrasing the idea."), model: m };
      const text = message.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("")
        .trim();
      const usage = { input: message.usage.input_tokens, output: message.usage.output_tokens };
      if (message.stop_reason === "max_tokens") return { ...aiError("truncated", "Claude stopped at the output limit before finishing.", true), model: m, usage };
      if (!text) return { ...aiError("empty", "Claude came back empty.", true), model: m };
      return { ok: true, data: text, model: message.model || m, usage, finish: message.stop_reason ?? undefined };
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) return { ...aiError("rate_limited", "Claude is rate-limited right now.", true), model: m };
      if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
        return { ...aiError("upstream", "Claude rejected the API key."), model: m };
      }
      if (e instanceof Anthropic.NotFoundError) return { ...aiError("upstream", `Claude can't find the model "${m}".`), model: m };
      if (e instanceof Anthropic.APIUserAbortError) return { ...aiError("network", "Stopped."), model: m };
      if (e instanceof Anthropic.APIConnectionTimeoutError) return { ...aiError("timeout", "Claude took too long to respond.", true), model: m };
      if (e instanceof Anthropic.APIConnectionError) return { ...aiError("network", "Couldn't reach Claude.", true), model: m };
      if (e instanceof Anthropic.APIError) {
        const status = e.status ?? 500;
        return { ...aiError("upstream", `Claude returned ${status}.`, status >= 500), model: m };
      }
      throw e;
    }
  },

  async status(): Promise<ProviderStatus> {
    return {
      id: "anthropic",
      label: "Anthropic Claude",
      signupUrl: SIGNUP,
      configured: !!process.env.ANTHROPIC_API_KEY,
      model: model(),
      note: "Highest reasoning quality. Paid API.",
    };
  },
};
