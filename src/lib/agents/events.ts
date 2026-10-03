import type { AiError } from "@/lib/ai/contracts";
import type { Analysis, SourceSet, StageId, StageTrace } from "@/types";

/**
 * Events emitted while an analysis runs. The same shape travels over the
 * inline NDJSON stream and the durable workflow stream, so the browser
 * applies them the same way whichever runner produced them.
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

export function noteFor(stage: StageId, a: Analysis): string | undefined {
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

/** Sources from an earlier run, including data saved before sources were stored separately. */
export function priorSources(a: Analysis): SourceSet | undefined {
  if (a.sources) return a.sources;
  const r = a.research;
  return r ? { items: r.sources, provider: r.provider, queries: r.queries, gatheredAt: r.researchedAt, failedQueries: 0 } : undefined;
}
