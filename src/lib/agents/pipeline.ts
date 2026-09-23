import { STAGE_IDS, type Analysis, type StageId, type StageMap } from "@/types";

/**
 * The analysis pipeline as data. Shared by the server orchestrator and the
 * browser (progress UI, retry). No server-only imports here.
 *
 *   understand
 *       ├── research (search + synthesis)
 *       │     ├── feasibility
 *       │     └── risks
 *       └── competitors (needs research's sources)
 *                       └── critic ── strategy
 */

export const DEPENDS_ON: Record<StageId, StageId[]> = {
  understand: [],
  research: ["understand"],
  competitors: ["understand", "research"],
  feasibility: ["understand", "research"],
  risks: ["understand", "research"],
  critic: ["understand", "research", "competitors", "feasibility", "risks"],
  strategy: ["understand", "research", "competitors", "feasibility", "risks", "critic"],
};

export const STAGE_COPY: Record<StageId, { running: string; done: string; agent: string }> = {
  understand: { running: "Understanding the idea", done: "Understood the idea", agent: "Idea Analyst" },
  research: { running: "Researching the market", done: "Researched the market", agent: "Research Agent" },
  competitors: { running: "Mapping competitors", done: "Mapped competitors", agent: "Competitor Agent" },
  feasibility: { running: "Assessing feasibility", done: "Assessed feasibility", agent: "Feasibility Agent" },
  risks: { running: "Reviewing risks and governance", done: "Reviewed risks and governance", agent: "Risk & Governance Agent" },
  critic: { running: "Stress-testing assumptions", done: "Stress-tested assumptions", agent: "Critic" },
  strategy: { running: "Building the product strategy", done: "Built the product strategy", agent: "Product Strategist" },
};

/** A stage and everything that transitively depends on it, in pipeline order. */
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
 * What to run to retry one stage: any upstream stage without a result, the
 * stage itself, and everything downstream of it (which depended on the old
 * result).
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
