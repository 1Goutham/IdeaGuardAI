import "server-only";
import type { AiError } from "@/lib/ai/contracts";
import { gatherSources, type GatherResult } from "@/lib/research/search";
import type { Analysis, StageId } from "@/types";
import * as agents from "./agents";
import { DEPENDS_ON, STAGE_COPY } from "./pipeline";

/**
 * The orchestrator runs the requested stages as a dependency graph, not a
 * fixed sequence: independent agents run concurrently, each stage starts the
 * moment its inputs exist, and a failure only blocks the stages that need it.
 * Earlier results (`prior`) are reused, so a single failed stage can be
 * retried without re-running the whole analysis.
 */

export type StageEvent =
  | { type: "stage"; stage: StageId; status: "running" }
  | { type: "note"; stage: StageId; note: string }
  | { type: "stage"; stage: StageId; status: "done"; data: NonNullable<Analysis[StageId]>; engine: string; note?: string }
  | { type: "stage"; stage: StageId; status: "error"; error: AiError }
  | { type: "done" };

export interface RunInput {
  idea: string;
  stages: StageId[];
  prior: Analysis;
}

type Emit = (event: StageEvent) => void;

function noteFor(stage: StageId, a: Analysis): string | undefined {
  switch (stage) {
    case "research":
      return a.research?.mode === "live" ? `${a.research.sources.length} sources` : "No live search · model knowledge only";
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

export async function runAnalysis(input: RunInput, emit: Emit): Promise<void> {
  const requested = new Set(input.stages);
  const a: Analysis = { ...input.prior };
  const runs = new Map<StageId, Promise<boolean>>();
  let gathered: Promise<GatherResult> | null = null;

  const blocked = (stage: StageId, dep: StageId) =>
    emit({
      type: "stage",
      stage,
      status: "error",
      error: { code: "upstream", message: `Waiting on ${STAGE_COPY[dep].agent}, which didn't complete.`, retryable: true },
    });

  /** Sources for this run: freshly gathered when research is being re-run, otherwise the previous ones. */
  const sources = (): Promise<GatherResult | null> => {
    if (!requested.has("research")) {
      const r = a.research;
      return Promise.resolve(r ? { sources: r.sources, provider: r.provider, queries: r.queries, failedQueries: 0 } : null);
    }
    if (!gathered) {
      gathered = (async () => {
        const queries = agents.researchQueries(a.understand!);
        emit({ type: "note", stage: "research", note: `Searching ${queries.length} queries` });
        const result = await gatherSources(queries);
        if (result.provider) emit({ type: "note", stage: "research", note: `Reading ${result.sources.length} sources` });
        return result;
      })();
    }
    return gathered;
  };

  async function execute(stage: StageId): Promise<boolean> {
    const idea = input.idea;
    switch (stage) {
      case "understand":
        return settle(stage, await agents.understand(idea));
      case "research": {
        const g = (await sources())!;
        return settle(stage, await agents.research(idea, a, g));
      }
      case "competitors": {
        const g = await sources();
        return settle(stage, await agents.competitors(idea, a, g?.sources ?? []));
      }
      case "feasibility":
        return settle(stage, await agents.feasibility(idea, a));
      case "risks":
        return settle(stage, await agents.risks(idea, a));
      case "critic":
        return settle(stage, await agents.critic(idea, a));
      case "strategy":
        return settle(stage, await agents.strategy(idea, a));
    }
  }

  function settle(stage: StageId, res: Awaited<ReturnType<(typeof agents)["understand"]>> | { ok: true; data: { value: unknown; engine: string } } | { ok: false; error: AiError }): boolean {
    if (!res.ok) {
      emit({ type: "stage", stage, status: "error", error: res.error });
      return false;
    }
    (a as Record<StageId, unknown>)[stage] = res.data.value;
    emit({
      type: "stage",
      stage,
      status: "done",
      data: res.data.value as NonNullable<Analysis[StageId]>,
      engine: res.data.engine,
      note: noteFor(stage, a),
    });
    return true;
  }

  function run(stage: StageId): Promise<boolean> {
    const existing = runs.get(stage);
    if (existing) return existing;
    const p = (async () => {
      if (!requested.has(stage)) return !!a[stage];
      // Competitors only needs research's sources, not its synthesis, so it can run alongside it.
      const deps = stage === "competitors" ? DEPENDS_ON[stage].filter((d) => d !== "research") : DEPENDS_ON[stage];
      const ready = await Promise.all(deps.map(run));
      const missing = deps.find((_, i) => !ready[i]);
      if (missing) {
        blocked(stage, missing);
        return false;
      }
      emit({ type: "stage", stage, status: "running" });
      try {
        return await execute(stage);
      } catch (e) {
        console.error(`IdeaGuard: stage ${stage} crashed`, e);
        emit({ type: "stage", stage, status: "error", error: { code: "upstream", message: "Something went wrong in this step.", retryable: true } });
        return false;
      }
    })();
    runs.set(stage, p);
    return p;
  }

  await Promise.all(input.stages.map(run));
  emit({ type: "done" });
}
