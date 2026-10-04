import type { AiError } from "@/lib/ai/contracts";
import type { Analysis, SourceSet, StageId } from "@/types";
import { priorSources } from "./events";
import { MIN_OPTIONAL, optionalInputs, REQUIRES, STAGE_COPY } from "./pipeline";

/**
 * The scheduling core, shared by both runners.
 *
 * Pure and deterministic: it decides what can run, in what order and with
 * which inputs, and hands the actual work to an executor. That lets the same
 * graph run inline in one request, or inside a durable workflow where each
 * stage is a retried, persisted step. No server-only imports here.
 *
 *  - Independent agents run concurrently.
 *  - Only a missing *required* input blocks a stage. Missing optional inputs
 *    are passed to the agent explicitly and recorded on the result.
 *  - The critic and strategist need a minimum number of upstream inputs.
 *  - An optional deadline pauses stages that can't start in time.
 */

export type StageOutcome = { ok: true; value: unknown } | { ok: false };

export interface Executor {
  /** Search for the research stage. Emits its own progress. */
  gather(analysis: Analysis): Promise<SourceSet>;
  /** Run one agent with a snapshot of the analysis so far. Emits running, done or error itself. */
  execute(stage: StageId, analysis: Analysis, missing: StageId[]): Promise<StageOutcome>;
  /** Record a stage that could not start. */
  fail(stage: StageId, error: AiError): Promise<void>;
  /** Whether the run was stopped. */
  aborted?(): boolean;
}

export interface GraphInput {
  stages: StageId[];
  prior: Analysis;
  /** Absolute ms. Omit for runners without a time limit (durable workflows). */
  deadline?: number;
  now?: () => number;
}

const STARTUP_MARGIN_MS = 20_000;

export async function runGraph(input: GraphInput, exec: Executor): Promise<Analysis> {
  const requested = new Set(input.stages);
  const a: Analysis = { ...input.prior, sources: priorSources(input.prior) };
  const now = input.now ?? Date.now;
  const runs = new Map<StageId, Promise<boolean>>();
  let gathering: Promise<void> | null = null;

  const fail = async (stage: StageId, error: AiError) => {
    await exec.fail(stage, error);
    return false;
  };

  const gather = () => {
    gathering ??= exec.gather(a).then((s) => {
      a.sources = s;
    });
    return gathering;
  };

  function run(stage: StageId): Promise<boolean> {
    const existing = runs.get(stage);
    if (existing) return existing;
    const p = (async (): Promise<boolean> => {
      if (!requested.has(stage)) return !!a[stage];

      const required = REQUIRES[stage];
      const requiredOk = await Promise.all(required.map(run));
      const lacking = required.find((_, i) => !requiredOk[i]);
      if (lacking) return fail(stage, { code: "unavailable", message: `Needs the ${STAGE_COPY[lacking].agent}, which didn't complete.`, retryable: true });

      const optional = optionalInputs(stage);
      await Promise.all(optional.map(run));
      const missing = optional.filter((d) => !a[d]);
      const min = MIN_OPTIONAL[stage];
      if (min !== undefined && optional.length - missing.length < min) {
        return fail(stage, {
          code: "unavailable",
          message: `Not enough upstream analysis to run: ${optional.length - missing.length} of ${optional.length} inputs available (missing ${missing.map((m) => STAGE_COPY[m].agent).join(", ")}).`,
          retryable: true,
        });
      }

      if (exec.aborted?.()) return fail(stage, { code: "network", message: "Stopped.", retryable: true });
      if (input.deadline !== undefined && now() > input.deadline - STARTUP_MARGIN_MS) {
        return fail(stage, { code: "timeout", message: "Paused: this run reached its time limit before this step could start. Resume to continue.", retryable: true });
      }

      if (stage === "research") await gather();
      const outcome = await exec.execute(stage, { ...a }, missing);
      if (!outcome.ok) return false;
      (a as Record<StageId, unknown>)[stage] = outcome.value;
      return true;
    })();
    runs.set(stage, p);
    return p;
  }

  await Promise.all(input.stages.map(run));
  return a;
}
