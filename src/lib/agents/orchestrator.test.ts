import { beforeAll, describe, expect, it } from "vitest";
import type { StageEvent } from "./orchestrator";
import type { Analysis, StageId } from "@/types";

beforeAll(() => {
  process.env.AI_PROVIDERS = "mock";
  process.env.RESEARCH_PROVIDER = "mock";
  process.env.MOCK_DELAY_MS = "1";
});

const idea = "An AI tool that recommends internships to university students based on their CV.";

async function run(stages: StageId[], prior: Analysis = {}): Promise<StageEvent[]> {
  const { runAnalysis } = await import("./orchestrator");
  const events: StageEvent[] = [];
  await runAnalysis({ idea, stages, prior }, (e) => events.push(e));
  return events;
}

const ALL: StageId[] = ["understand", "research", "competitors", "feasibility", "risks", "critic", "strategy"];

describe("orchestrator (mock engine)", () => {
  it("runs the full graph, grounds citations and verifies competitors", async () => {
    const events = await run(ALL);
    const done = events.filter((e): e is Extract<StageEvent, { status: "done" }> => e.type === "stage" && e.status === "done");
    expect(done.map((e) => e.stage).sort()).toEqual(["competitors", "critic", "feasibility", "research", "risks", "strategy", "understand"]);
    expect(events.at(-1)).toEqual({ type: "done" });

    const research = done.find((e) => e.stage === "research")!.data as NonNullable<Analysis["research"]>;
    expect(research.mode).toBe("live");
    // The fixture cites a non-existent S99; it must not survive grounding.
    expect(research.findings.flatMap((f) => f.sourceIds)).not.toContain("S99");

    const competitors = done.find((e) => e.stage === "competitors")!.data as NonNullable<Analysis["competitors"]>;
    const tailspin = competitors.competitors.find((c) => c.name === "Tailspin Mentors")!;
    expect(tailspin.verified).toBe(false);
    expect(competitors.competitors.find((c) => c.name === "Northwind Careers")!.verified).toBe(true);
  });

  it("starts competitor mapping before research synthesis finishes", async () => {
    const events = await run(["understand", "research", "competitors"]);
    const idx = (pred: (e: StageEvent) => boolean) => events.findIndex(pred);
    const competitorsStart = idx((e) => e.type === "stage" && e.stage === "competitors" && e.status === "running");
    const researchDone = idx((e) => e.type === "stage" && e.stage === "research" && e.status === "done");
    expect(competitorsStart).toBeGreaterThan(-1);
    expect(competitorsStart).toBeLessThan(researchDone);
  });

  it("blocks only the dependents of a failed stage", async () => {
    process.env.MOCK_FAIL = "feasibility";
    const events = await run(ALL);
    delete process.env.MOCK_FAIL;
    const status = (stage: string) => events.filter((e) => e.type === "stage" && e.stage === stage && e.status !== "running").map((e) => (e as { status: string }).status)[0];
    expect(status("feasibility")).toBe("error");
    expect(status("risks")).toBe("done");
    expect(status("competitors")).toBe("done");
    expect(status("critic")).toBe("error");
    expect(status("strategy")).toBe("error");
  });
});
