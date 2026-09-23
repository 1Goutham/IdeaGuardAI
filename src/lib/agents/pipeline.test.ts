import { describe, expect, it } from "vitest";
import { emptyStages, retryPlan, withDownstream } from "./pipeline";
import type { Analysis, StageMap } from "@/types";

describe("pipeline", () => {
  it("re-runs downstream stages with the stage being retried", () => {
    expect(withDownstream("research")).toEqual(["research", "competitors", "feasibility", "risks", "critic", "strategy"]);
    expect(withDownstream("strategy")).toEqual(["strategy"]);
  });

  it("includes failed upstream stages when retrying", () => {
    const stages: StageMap = { ...emptyStages() };
    for (const id of ["understand", "research", "competitors", "risks"] as const) stages[id] = { status: "done" };
    stages.feasibility = { status: "error", error: "x" };
    stages.critic = { status: "error", error: "blocked" };
    stages.strategy = { status: "error", error: "blocked" };
    const analysis = { understand: {}, research: {}, competitors: {}, risks: {} } as unknown as Analysis;
    expect(retryPlan("critic", stages, analysis)).toEqual(["feasibility", "critic", "strategy"]);
  });
});
