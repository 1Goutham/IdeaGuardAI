import { runGraph } from "@/lib/agents/graph";
import type { Analysis, StageId } from "@/types";
import { failStep, finishStep, gatherStep, stageStep } from "./steps";

export interface AnalysisWorkflowInput {
  idea: string;
  stages: StageId[];
  prior: Analysis;
}

/**
 * The durable runner. The same dependency graph as the inline runner, but
 * each stage is a workflow step: persisted, retried on infrastructure
 * failure, and free of any single request's time limit. The run keeps going
 * if the browser tab closes; reopening the project reconnects to its stream.
 */
export async function analysisWorkflow(input: AnalysisWorkflowInput) {
  "use workflow";

  const result = await runGraph(
    { stages: input.stages, prior: input.prior },
    {
      gather: (a) => gatherStep(a),
      execute: (stage, a, missing) => stageStep(stage, input.idea, a, missing),
      fail: (stage, error) => failStep(stage, error),
    },
  );
  await finishStep();
  return { completed: input.stages.filter((s) => !!result[s]) };
}
