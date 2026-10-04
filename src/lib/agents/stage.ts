import "server-only";
import type { CallTrace } from "@/lib/ai/engine";
import { gatherSources } from "@/lib/research/search";
import type { Analysis, SourceSet, StageId, StageTrace } from "@/types";
import * as agents from "./agents";
import { noteFor, type StageEvent } from "./events";
import type { StageOutcome } from "./graph";

/**
 * Running one stage, shared by the inline runner and the durable workflow.
 * Emits the stage's own events (running, notes, done or error) and never
 * throws: an unexpected crash becomes an error event for that stage only.
 */

export type Write = (event: StageEvent) => void | Promise<void>;

export function toStageTrace(t: CallTrace, citationsDropped?: number): StageTrace {
  return {
    provider: t.provider,
    model: t.model,
    calls: t.calls,
    waitedMs: Math.round(t.waitedMs),
    repaired: t.repaired,
    inputTokens: t.inputTokens,
    outputTokens: t.outputTokens,
    reasoning: t.reasoning,
    ...(citationsDropped !== undefined ? { citationsDropped } : {}),
  };
}

export async function runGather(analysis: Analysis, write: Write): Promise<SourceSet> {
  const queries = agents.researchQueries(analysis.understand!);
  await write({ type: "note", stage: "research", note: `Searching ${queries.length} queries` });
  let sources: SourceSet;
  try {
    const g = await gatherSources(queries);
    sources = { items: g.sources, provider: g.provider, queries: g.queries, gatheredAt: new Date().toISOString(), failedQueries: g.failedQueries };
  } catch (e) {
    console.error("IdeaGuard: search failed", e);
    sources = { items: [], provider: null, queries, gatheredAt: new Date().toISOString(), failedQueries: queries.length };
  }
  await write({ type: "sources", sources });
  if (sources.provider) await write({ type: "note", stage: "research", note: `Reading ${sources.items.length} sources` });
  return sources;
}

export interface StageRun {
  idea: string;
  analysis: Analysis;
  missing: StageId[];
  deadline: number;
  signal?: AbortSignal;
  write: Write;
}

export async function runStage(stage: StageId, r: StageRun): Promise<StageOutcome> {
  const { write } = r;
  await write({ type: "stage", stage, status: "running" });
  const ctx: agents.AgentContext = {
    idea: r.idea,
    analysis: r.analysis,
    sources: r.analysis.sources,
    missing: r.missing,
    deadline: r.deadline,
    signal: r.signal,
    onWait: (reason, ms) =>
      void write({ type: "note", stage, note: reason === "rate_limited" ? `Rate limited · retrying in ${Math.ceil((ms ?? 0) / 1000)}s` : "Waiting for model capacity" }),
  };
  try {
    const res = await agents.run(stage, ctx);
    if (!res.ok) {
      await write({ type: "stage", stage, status: "error", error: res.error });
      return { ok: false };
    }
    const after: Analysis = { ...r.analysis, [stage]: res.data.value };
    await write({
      type: "stage",
      stage,
      status: "done",
      data: res.data.value as NonNullable<Analysis[StageId]>,
      engine: res.data.trace.engine,
      note: noteFor(stage, after),
      trace: toStageTrace(res.data.trace, res.data.citationsDropped),
      missingInputs: r.missing,
    });
    return { ok: true, value: res.data.value };
  } catch (e) {
    console.error(`IdeaGuard: stage ${stage} crashed`, e);
    await write({
      type: "stage",
      stage,
      status: "error",
      error: { code: "upstream", message: "Something went wrong in this step.", retryable: true, detail: { issues: [String((e as Error)?.message ?? e).slice(0, 200)] } },
    });
    return { ok: false };
  }
}
