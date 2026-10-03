import "server-only";
import type { Analysis, StageId } from "@/types";
import type { StageEvent } from "./events";
import { runGraph } from "./graph";
import { runGather, runStage } from "./stage";

export type { StageEvent } from "./events";

/**
 * Inline runner: executes the dependency graph inside one request and
 * streams events as they happen. Used by /api/analyse, the CLI trace and
 * tests. The durable runner (src/workflows/analysis.ts) runs the same graph
 * with each stage as a persisted workflow step.
 */

export interface RunInput {
  idea: string;
  stages: StageId[];
  prior: Analysis;
  /** Absolute ms timestamp; defaults to ANALYSIS_BUDGET_MS (270s) from now. */
  deadline?: number;
  signal?: AbortSignal;
}

export async function runAnalysis(input: RunInput, emit: (event: StageEvent) => void): Promise<void> {
  const deadline = input.deadline ?? Date.now() + (Number(process.env.ANALYSIS_BUDGET_MS) || 270_000);
  await runGraph(
    { stages: input.stages, prior: input.prior, deadline },
    {
      gather: (a) => runGather(a, emit),
      execute: (stage, analysis, missing) => runStage(stage, { idea: input.idea, analysis, missing, deadline, signal: input.signal, write: emit }),
      fail: async (stage, error) => emit({ type: "stage", stage, status: "error", error }),
      aborted: () => !!input.signal?.aborted,
    },
  );
  emit({ type: "done" });
}
