import "server-only";
import type { AiError } from "@/lib/ai/contracts";
import type { CallTrace } from "@/lib/ai/engine";
import { gatherSources } from "@/lib/research/search";
import type { Analysis, SourceSet, StageId, StageTrace } from "@/types";
import * as agents from "./agents";
import { MIN_OPTIONAL, optionalInputs, REQUIRES, STAGE_COPY } from "./pipeline";

/**
 * The orchestrator runs the requested stages as a dependency graph.
 *
 *  - Independent agents run concurrently (competition, feasibility and risk
 *    all start the moment research settles).
 *  - Only a missing *required* input blocks a stage. Missing optional inputs
 *    are passed to the agent explicitly, so it can say what it doesn't know
 *    instead of inventing it, and are recorded on the result.
 *  - Model capacity is shared through the engine's token budget, so running
 *    in parallel never means bursting past a provider's rate limit.
 *  - A run has a deadline (serverless functions do); stages that can't start
 *    in time are reported as paused, and the client can resume them.
 */

export type StageEvent =
  | { type: "stage"; stage: StageId; status: "running" }
  | { type: "note"; stage: StageId; note: string }
  | { type: "sources"; sources: SourceSet }
  | {
      type: "stage";
      stage: StageId;
      status: "done";
      data: NonNullable<Analysis[StageId]>;
      engine: string;
      note?: string;
      trace: StageTrace;
      missingInputs: StageId[];
    }
  | { type: "stage"; stage: StageId; status: "error"; error: AiError }
  | { type: "done" };

export interface RunInput {
  idea: string;
  stages: StageId[];
  prior: Analysis;
  /** Absolute ms timestamp; defaults to ANALYSIS_BUDGET_MS (270s) from now. */
  deadline?: number;
  signal?: AbortSignal;
}

type Emit = (event: StageEvent) => void;

const STARTUP_MARGIN_MS = 20_000;

function noteFor(stage: StageId, a: Analysis): string | undefined {
  switch (stage) {
    case "research": {
      const n = a.sources?.items.length ?? 0;
      if (!a.sources?.provider) return "No live search · model knowledge only";
      return n ? `${n} sources` : "Search returned no sources";
    }
    case "competitors": {
      const c = a.competitors?.competitors ?? [];
      return `${c.length} found${c.length ? ` · ${c.filter((x) => x.verified).length} verified` : ""}`;
    }
    case "risks":
      return `${a.risks?.risks.length ?? 0} risks`;
    case "critic":
      return `${a.critic?.assumptions.length ?? 0} assumptions · ${a.critic?.experiments.length ?? 0} experiments`;
    default:
      return undefined;
  }
}

function toStageTrace(t: CallTrace): StageTrace {
  return { provider: t.provider, model: t.model, calls: t.calls, waitedMs: Math.round(t.waitedMs), repaired: t.repaired, inputTokens: t.inputTokens, outputTokens: t.outputTokens, reasoning: t.reasoning };
}

/** Sources from an earlier run, including data saved before sources were stored separately. */
function priorSources(a: Analysis): SourceSet | undefined {
  if (a.sources) return a.sources;
  const r = a.research;
  return r ? { items: r.sources, provider: r.provider, queries: r.queries, gatheredAt: r.researchedAt, failedQueries: 0 } : undefined;
}

export async function runAnalysis(input: RunInput, emit: Emit): Promise<void> {
  const requested = new Set(input.stages);
  const a: Analysis = { ...input.prior, sources: priorSources(input.prior) };
  const deadline = input.deadline ?? Date.now() + (Number(process.env.ANALYSIS_BUDGET_MS) || 270_000);
  const runs = new Map<StageId, Promise<boolean>>();
  let gathering: Promise<void> | null = null;

  const fail = (stage: StageId, error: AiError) => {
    emit({ type: "stage", stage, status: "error", error });
    return false;
  };

  /** Search runs once per analysis, as part of research, and survives a failed synthesis. */
  const gather = () => {
    gathering ??= (async () => {
      const queries = agents.researchQueries(a.understand!);
      emit({ type: "note", stage: "research", note: `Searching ${queries.length} queries` });
      try {
        const g = await gatherSources(queries);
        a.sources = { items: g.sources, provider: g.provider, queries: g.queries, gatheredAt: new Date().toISOString(), failedQueries: g.failedQueries };
      } catch (e) {
        console.error("IdeaGuard: search failed", e);
        a.sources = { items: [], provider: null, queries, gatheredAt: new Date().toISOString(), failedQueries: queries.length };
      }
      emit({ type: "sources", sources: a.sources });
      if (a.sources.provider) emit({ type: "note", stage: "research", note: `Reading ${a.sources.items.length} sources` });
    })();
    return gathering;
  };

  async function execute(stage: StageId, missing: StageId[]) {
    if (stage === "research") await gather();
    const ctx: agents.AgentContext = {
      idea: input.idea,
      analysis: a,
      sources: a.sources,
      missing,
      deadline,
      signal: input.signal,
      onWait: (reason, ms) =>
        emit({
          type: "note",
          stage,
          note: reason === "rate_limited" ? `Rate limited · retrying in ${Math.ceil((ms ?? 0) / 1000)}s` : "Waiting for model capacity",
        }),
    };
    switch (stage) {
      case "understand":
        return agents.understand(ctx);
      case "research":
        return agents.research(ctx);
      case "competitors":
        return agents.competitors(ctx);
      case "feasibility":
        return agents.feasibility(ctx);
      case "risks":
        return agents.risks(ctx);
      case "critic":
        return agents.critic(ctx);
      case "strategy":
        return agents.strategy(ctx);
    }
  }

  function run(stage: StageId): Promise<boolean> {
    const existing = runs.get(stage);
    if (existing) return existing;
    const p = (async (): Promise<boolean> => {
      if (!requested.has(stage)) return !!a[stage];

      // Required inputs: without them the stage cannot run.
      const required = REQUIRES[stage];
      const requiredOk = await Promise.all(required.map(run));
      const lacking = required.find((_, i) => !requiredOk[i]);
      if (lacking) {
        return fail(stage, { code: "unavailable", message: `Needs the ${STAGE_COPY[lacking].agent}, which didn't complete.`, retryable: true });
      }

      // Optional inputs: wait for them to settle, then run with whatever exists.
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

      if (input.signal?.aborted) return fail(stage, { code: "network", message: "Stopped.", retryable: true });
      if (Date.now() > deadline - STARTUP_MARGIN_MS) {
        return fail(stage, { code: "timeout", message: "Paused: this run reached its time limit before this step could start. Resume to continue.", retryable: true });
      }

      emit({ type: "stage", stage, status: "running" });
      try {
        const res = await execute(stage, missing);
        if (!res.ok) return fail(stage, res.error);
        (a as Record<StageId, unknown>)[stage] = res.data.value;
        emit({
          type: "stage",
          stage,
          status: "done",
          data: res.data.value as NonNullable<Analysis[StageId]>,
          engine: res.data.trace.engine,
          note: noteFor(stage, a),
          trace: toStageTrace(res.data.trace),
          missingInputs: missing,
        });
        return true;
      } catch (e) {
        console.error(`IdeaGuard: stage ${stage} crashed`, e);
        return fail(stage, { code: "upstream", message: "Something went wrong in this step.", retryable: true, detail: { issues: [String((e as Error)?.message ?? e).slice(0, 200)] } });
      }
    })();
    runs.set(stage, p);
    return p;
  }

  await Promise.all(input.stages.map(run));
  emit({ type: "done" });
}
