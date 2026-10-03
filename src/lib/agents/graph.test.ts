import { describe, expect, it } from "vitest";
import { runGraph, type Executor } from "./graph";
import type { Analysis, StageId } from "@/types";

function fake(fails: StageId[] = []) {
  const calls: { stage: StageId; missing: StageId[] }[] = [];
  const failed: StageId[] = [];
  const exec: Executor = {
    gather: async () => ({ items: [], provider: null, queries: [], gatheredAt: "" }) as never,
    execute: async (stage, _a, missing) => {
      calls.push({ stage, missing });
      return fails.includes(stage) ? { ok: false } : { ok: true, value: { stage } };
    },
    fail: async (stage) => void failed.push(stage),
  };
  return { exec, calls, failed };
}

describe("runGraph", () => {
  it("reuses prior results and runs only the requested stages", async () => {
    const prior = { understand: {}, research: {}, competitors: {}, feasibility: {}, risks: {} } as unknown as Analysis;
    const { exec, calls } = fake();
    await runGraph({ stages: ["critic", "strategy"], prior }, exec);
    expect(calls.map((c) => c.stage)).toEqual(["critic", "strategy"]);
    expect(calls.every((c) => c.missing.length === 0)).toBe(true);
  });

  it("passes missing optional inputs to the agent instead of blocking", async () => {
    const { exec, calls } = fake(["risks"]);
    await runGraph({ stages: ["understand", "research", "competitors", "feasibility", "risks", "critic", "strategy"], prior: {} }, exec);
    expect(calls.find((c) => c.stage === "critic")?.missing).toEqual(["risks"]);
    expect(calls.find((c) => c.stage === "strategy")?.missing).toEqual(["risks"]);
  });

  it("fails everything downstream when a required input fails", async () => {
    const { exec, calls, failed } = fake(["understand"]);
    await runGraph({ stages: ["understand", "research", "strategy"], prior: {} }, exec);
    expect(calls.map((c) => c.stage)).toEqual(["understand"]);
    expect(failed.sort()).toEqual(["research", "strategy"]);
  });
});
