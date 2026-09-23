import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { StageEvent } from "./orchestrator";
import type { Analysis, StageId } from "@/types";

beforeAll(() => {
  process.env.AI_PROVIDERS = "mock";
  process.env.RESEARCH_PROVIDER = "mock";
  process.env.MOCK_DELAY_MS = "1";
});
afterEach(() => {
  delete process.env.MOCK_FAIL;
  delete process.env.MOCK_FAIL_ONCE;
});

const idea = "A platform that turns small-business customer reviews and support emails into weekly insight reports.";
const ALL: StageId[] = ["understand", "research", "competitors", "feasibility", "risks", "critic", "strategy"];

type Done = Extract<StageEvent, { status: "done" }>;
type Failed = Extract<StageEvent, { status: "error" }>;

async function run(stages: StageId[] = ALL, opts: { prior?: Analysis; deadline?: number } = {}) {
  const { runAnalysis } = await import("./orchestrator");
  const events: StageEvent[] = [];
  await runAnalysis({ idea, stages, prior: opts.prior ?? {}, deadline: opts.deadline }, (e) => events.push(e));
  const done = (s: StageId) => events.find((e): e is Done => e.type === "stage" && e.stage === s && e.status === "done");
  const failed = (s: StageId) => events.find((e): e is Failed => e.type === "stage" && e.stage === s && e.status === "error");
  return { events, done, failed };
}

describe("orchestrator", () => {
  it("runs every stage, grounds citations and verifies competitors", async () => {
    const { events, done } = await run();
    for (const s of ALL) expect(done(s), s).toBeTruthy();
    expect(events.at(-1)).toEqual({ type: "done" });

    const research = done("research")!.data as NonNullable<Analysis["research"]>;
    expect(research.mode).toBe("live");
    expect(research.findings.flatMap((f) => f.sourceIds)).not.toContain("S99");

    const competitors = done("competitors")!.data as NonNullable<Analysis["competitors"]>;
    expect(competitors.competitors.find((c) => c.name === "Tailspin Mentors")!.verified).toBe(false);
    expect(competitors.competitors.find((c) => c.name === "Northwind Careers")!.verified).toBe(true);
  });

  it("emits the gathered sources so citations survive a failed synthesis", async () => {
    process.env.MOCK_FAIL = "research";
    const { events, failed, done } = await run();
    const sources = events.find((e): e is Extract<StageEvent, { type: "sources" }> => e.type === "sources");
    expect(sources?.sources.items.length).toBeGreaterThan(0);
    expect(failed("research")).toBeTruthy();
    // Competitors still verify against the gathered sources.
    const c = done("competitors")!.data as NonNullable<Analysis["competitors"]>;
    expect(c.competitors.some((x) => x.verified)).toBe(true);
    expect(done("competitors")!.missingInputs).toEqual(["research"]);
  });

  it("runs competition, feasibility and risk concurrently after research", async () => {
    const { events } = await run();
    const idx = (s: StageId, status: string) => events.findIndex((e) => e.type === "stage" && e.stage === s && e.status === status);
    const researchDone = idx("research", "done");
    const starts = (["competitors", "feasibility", "risks"] as const).map((s) => idx(s, "running"));
    const firstFinish = Math.min(...(["competitors", "feasibility", "risks"] as const).map((s) => idx(s, "done")));
    for (const st of starts) {
      expect(st).toBeGreaterThan(researchDone);
      expect(st).toBeLessThan(firstFinish);
    }
  });

  it("isolates a failed agent: others continue and downstream agents are told what's missing", async () => {
    process.env.MOCK_FAIL = "feasibility";
    const { failed, done } = await run();
    expect(failed("feasibility")?.error.message).toMatch(/outage/);
    expect(failed("feasibility")?.error.detail?.status).toBe(503);
    expect(done("competitors")).toBeTruthy();
    expect(done("risks")).toBeTruthy();
    expect(done("critic")!.missingInputs).toEqual(["feasibility"]);
    expect(done("strategy")!.missingInputs).toEqual(["feasibility"]);
  });

  it("refuses to build a critique or strategy on too little", async () => {
    process.env.MOCK_FAIL = "research,competitors,feasibility";
    const { failed, done } = await run();
    expect(done("risks")).toBeTruthy();
    expect(failed("critic")?.error.code).toBe("unavailable");
    expect(failed("critic")?.error.message).toMatch(/1 of 4 inputs/);
    expect(failed("strategy")?.error.code).toBe("unavailable");
  });

  it("stops everything that needs the Idea Analyst when it fails", async () => {
    process.env.MOCK_FAIL = "understand";
    const { failed } = await run();
    for (const s of ALL.slice(1)) expect(failed(s)?.error.code, s).toBe("unavailable");
  });

  it("repairs an answer that fails validation, once", async () => {
    process.env.MOCK_FAIL_ONCE = "critic";
    const { done } = await run();
    expect(done("critic")!.trace.repaired).toBe(true);
    expect(done("critic")!.trace.calls).toBe(2);
    expect(done("feasibility")!.trace.repaired).toBe(false);
  });

  it("pauses stages that can't start before the deadline instead of starting them", async () => {
    const { failed } = await run(ALL, { deadline: Date.now() + 1_000 });
    expect(failed("understand")?.error.code).toBe("timeout");
    expect(failed("understand")?.error.message).toMatch(/Resume/);
  });
});
