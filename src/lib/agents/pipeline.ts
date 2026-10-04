import { STAGE_IDS, type Analysis, type StageId, type StageMap } from "@/types";

/**
 * The analysis pipeline as data. Shared by the server orchestrator and the
 * browser (progress UI, retry). No server-only imports here.
 *
 *   understand
 *       │
 *   research ─────────────┬──────────────┐
 *       │                 │              │
 *   competitors      feasibility       risks        (independent, concurrent)
 *       └─────────────────┼──────────────┘
 *                      critic
 *                         │
 *                     strategy
 *
 * Only the Idea Analyst is a hard requirement. Everything else is an input an
 * agent uses when it exists; when it doesn't, the agent runs anyway and is
 * told explicitly what is missing. The critic and strategist need a minimum
 * number of upstream inputs so a report is never built on almost nothing.
 */

/** Inputs without which a stage cannot run at all. */
export const REQUIRES: Record<StageId, StageId[]> = {
  understand: [],
  research: ["understand"],
  competitors: ["understand"],
  feasibility: ["understand"],
  risks: ["understand"],
  critic: ["understand"],
  strategy: ["understand"],
};

/** Everything a stage consumes when available (required + optional). */
export const DEPENDS_ON: Record<StageId, StageId[]> = {
  understand: [],
  research: ["understand"],
  competitors: ["understand", "research"],
  feasibility: ["understand", "research"],
  risks: ["understand", "research"],
  critic: ["understand", "research", "competitors", "feasibility", "risks"],
  strategy: ["understand", "research", "competitors", "feasibility", "risks", "critic"],
};

/** How many optional inputs must have succeeded for the stage to be worth running. */
export const MIN_OPTIONAL: Partial<Record<StageId, number>> = { critic: 2, strategy: 3 };

export const optionalInputs = (stage: StageId) => DEPENDS_ON[stage].filter((d) => !REQUIRES[stage].includes(d));

export const STAGE_COPY: Record<StageId, { running: string; done: string; agent: string; label: string; subject: string }> = {
  understand: { running: "Understanding the idea", done: "Understood the idea", agent: "Idea Analyst", label: "Idea analysis", subject: "idea analysis" },
  research: { running: "Researching the market", done: "Researched the market", agent: "Research Agent", label: "Research", subject: "market research" },
  competitors: { running: "Mapping competitors", done: "Mapped competitors", agent: "Competitor Agent", label: "Competition", subject: "competitor analysis" },
  feasibility: { running: "Assessing feasibility", done: "Assessed feasibility", agent: "Feasibility Agent", label: "Feasibility", subject: "feasibility assessment" },
  risks: { running: "Reviewing risks and governance", done: "Reviewed risks and governance", agent: "Risk & Governance Agent", label: "Risk & governance", subject: "risk review" },
  critic: { running: "Stress-testing assumptions", done: "Stress-tested assumptions", agent: "Critic", label: "Stress test", subject: "stress test" },
  strategy: { running: "Building the product strategy", done: "Built the product strategy", agent: "Product Strategist", label: "Product strategy", subject: "product strategy" },
};

/** A stage and everything that transitively consumes it, in pipeline order. */
export function withDownstream(stage: StageId): StageId[] {
  const out = new Set<StageId>([stage]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const id of STAGE_IDS) {
      if (!out.has(id) && DEPENDS_ON[id].some((d) => out.has(d))) {
        out.add(id);
        grew = true;
      }
    }
  }
  return STAGE_IDS.filter((id) => out.has(id));
}

export function emptyStages(): StageMap {
  return Object.fromEntries(STAGE_IDS.map((id) => [id, { status: "idle" }])) as StageMap;
}

/** Stages that still need to run: not done, or done but missing data. */
export function pendingStages(stages: StageMap, analysis: Analysis): StageId[] {
  return STAGE_IDS.filter((id) => stages[id].status !== "done" || !analysis[id]);
}

export function isComplete(stages: StageMap): boolean {
  return STAGE_IDS.every((id) => stages[id].status === "done");
}

/**
 * What to run to retry one stage: upstream stages it consumes that have no
 * result, the stage itself, and everything downstream of it (which was built
 * on the old result).
 */
export function retryPlan(stage: StageId, stages: StageMap, analysis: Analysis): StageId[] {
  const need = new Set<StageId>(withDownstream(stage));
  const visit = (id: StageId) => {
    for (const dep of DEPENDS_ON[id]) {
      if (stages[dep].status !== "done" || !analysis[dep]) {
        withDownstream(dep).forEach((d) => need.add(d));
        visit(dep);
      }
    }
  };
  visit(stage);
  return STAGE_IDS.filter((id) => need.has(id));
}
