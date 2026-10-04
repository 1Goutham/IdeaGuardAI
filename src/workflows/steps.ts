import { getWritable } from "workflow";
import type { AiError } from "@/lib/ai/contracts";
import type { StageEvent } from "@/lib/agents/events";
import type { StageOutcome } from "@/lib/agents/graph";
import { runGather, runStage } from "@/lib/agents/stage";
import type { Analysis, SourceSet, StageId } from "@/types";

/**
 * Durable steps. Each runs with full Node.js access, is persisted to the
 * run's event log, and is retried by the workflow runtime if its function
 * dies mid-way (a deploy, a crash, a timeout). Agent-level failures are not
 * thrown: they are returned as error events, so a retry only happens when
 * the infrastructure failed, never to re-roll a model answer.
 *
 * Progress goes to the run's durable stream, which a browser can read,
 * disconnect from, and read again from where it left off.
 */

/** Per-step time budget for model calls, below the platform's function limit. */
const STEP_BUDGET_MS = Number(process.env.STEP_BUDGET_MS) || 240_000;

async function write(event: StageEvent) {
  const writer = getWritable<StageEvent>().getWriter();
  try {
    await writer.write(event);
  } finally {
    writer.releaseLock();
  }
}

export async function gatherStep(analysis: Analysis): Promise<SourceSet> {
  "use step";
  return runGather(analysis, write);
}

export async function stageStep(stage: StageId, idea: string, analysis: Analysis, missing: StageId[]): Promise<StageOutcome> {
  "use step";
  return runStage(stage, { idea, analysis, missing, deadline: Date.now() + STEP_BUDGET_MS, write });
}

export async function failStep(stage: StageId, error: AiError): Promise<void> {
  "use step";
  await write({ type: "stage", stage, status: "error", error });
}

export async function finishStep(): Promise<void> {
  "use step";
  await write({ type: "done" });
  await getWritable().close();
}
