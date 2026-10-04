import { describe, expect, it } from "vitest";
import { compare, genericDensity, scoreCase, summarise } from "./metrics";
import type { Analysis } from "@/types";

const analysis = {
  understand: { title: "Leverage synergy", oneLiner: "A seamless platform" },
  research: { findings: [{ basis: "evidence" }, { basis: "inference" }], sources: [] },
  competitors: { competitors: [{ name: "A", verified: true }, { name: "B", verified: false }] },
  risks: { risks: [{ risk: "GDPR exposure on CVs", basis: "evidence" }], regulations: [] },
  strategy: { stance: "refine", signals: [] },
} as unknown as Analysis;

describe("eval metrics", () => {
  it("counts generic phrases per thousand words", () => {
    const g = genericDensity("We leverage synergy to deliver a seamless experience for every user today");
    expect(g.hits).toBe(3);
    expect(g.density).toBeCloseTo((3 / 12) * 1000);
  });

  it("scores evidence, verification and expectations", () => {
    const m = scoreCase(
      { id: "x", idea: "x", expect: { riskKeywords: ["gdpr"], stanceIn: ["pursue"], minCompetitors: 2 } },
      analysis,
      { understand: { status: "done", ms: 1, trace: { calls: 2, inputTokens: 10, outputTokens: 5, waitedMs: 0, repaired: true, citationsDropped: 1 } as never } },
      100,
    );
    expect(m.evidenceRate).toBeCloseTo(2 / 3);
    expect(m.competitorVerification).toBe(0.5);
    expect(m.repairs).toBe(1);
    expect(m.citationsDropped).toBe(1);
    expect(m.checks.map((c) => [c.name, c.pass])).toEqual([
      ["risk coverage", true],
      ["stance", false],
      ["competitors", true],
    ]);
  });

  it("flags regressions beyond tolerance only", () => {
    const base = summarise([]);
    const now = { ...base, completionRate: base.completionRate - 0.2, meanGenericDensity: base.meanGenericDensity + 0.5 };
    const diff = compare(now, { ...base, completionRate: 0, meanGenericDensity: 0 });
    expect(diff.find((d) => d.metric === "completionRate")?.regression).toBe(true);
    expect(diff.find((d) => d.metric === "meanGenericDensity")?.regression).toBe(false);
  });
});
