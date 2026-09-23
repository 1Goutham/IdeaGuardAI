import "server-only";
import { aiError } from "../contracts";
import type { Provider, ProviderStatus } from "./types";

/**
 * Development-only provider. Enabled only when AI_PROVIDERS explicitly lists
 * "mock". Returns fixed fixtures (for a sample internship-matching idea) with
 * realistic latency so the pipeline, progress UI, persistence and error
 * paths can be exercised without API keys. The engine label says "mock" so
 * its output can never be mistaken for real analysis.
 *
 * MOCK_FAIL=<tag> makes one agent fail, to test partial results and retry.
 */

const explicitlyEnabled = () => (process.env.AI_PROVIDERS ?? "").split(",").map((s) => s.trim()).includes("mock");

export const mock: Provider = {
  id: "mock",
  label: "Mock engine (development)",
  signupUrl: "",
  configured: explicitlyEnabled,

  async complete(opts) {
    const { MOCK_OUTPUTS } = await import("./mockFixtures");
    const tag = opts.tag ?? "";
    const delay = Number(process.env.MOCK_DELAY_MS ?? 900);
    await new Promise((r) => setTimeout(r, delay + Math.random() * delay));
    if (process.env.MOCK_FAIL && process.env.MOCK_FAIL === tag) {
      return { ...aiError("rate_limited", "Mock engine: simulated rate limit.", true), model: "fixtures" };
    }
    const out = MOCK_OUTPUTS[tag];
    if (!out) return { ...aiError("empty", `Mock engine has no fixture for "${tag}".`, true), model: "fixtures" };
    return { ok: true, data: JSON.stringify(out), model: "fixtures" };
  },

  async status(): Promise<ProviderStatus> {
    return {
      id: "mock",
      label: "Mock engine (development)",
      signupUrl: "",
      configured: explicitlyEnabled(),
      model: "fixtures",
      note: "Returns fixed sample output. Development only.",
    };
  },
};
