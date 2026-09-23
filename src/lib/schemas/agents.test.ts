import { describe, expect, it } from "vitest";
import { CompetitorSchema, UnderstandSchema } from "./agents";
import { level, oneOf } from "./primitives";
import { MOCK_OUTPUTS } from "@/lib/ai/providers/mockFixtures";
import { z } from "zod";

describe("lenient enums", () => {
  it("maps case and punctuation variants to the canonical value", () => {
    expect(level.parse("High ")).toBe("high");
    const key = oneOf(["problemClarity", "mvpComplexity"] as const, "problemClarity");
    expect(key.parse("mvp_complexity")).toBe("mvpComplexity");
    expect(key.parse("MVP Complexity")).toBe("mvpComplexity");
  });

  it("falls back for unknown values when a fallback is given", () => {
    expect(level.parse("extreme")).toBe("medium");
  });
});

describe("UnderstandSchema", () => {
  const base = MOCK_OUTPUTS.understand as Record<string, unknown>;

  it("keeps all seven camelCase signal keys distinct", () => {
    const parsed = UnderstandSchema.parse(base);
    expect(new Set(parsed.signals.map((s) => s.key)).size).toBe(7);
  });

  it("drops a signal with an unknown key instead of mislabelling it", () => {
    const signals = [...(base.signals as object[]), { key: "vibes", level: "high", rationale: "x" }];
    const parsed = UnderstandSchema.parse({ ...base, signals });
    expect(parsed.signals.map((s) => s.key)).not.toContain("vibes");
    expect(parsed.signals.filter((s) => s.key === "problemClarity")).toHaveLength(1);
  });

  it("drops one malformed list item without failing the section", () => {
    const parsed = UnderstandSchema.parse({ ...base, unclear: ["Who pays?", 42, "", null] });
    expect(parsed.unclear).toEqual(["Who pays?"]);
  });

  it("fails when a required field is missing, so the repair pass can run", () => {
    const rest = { ...base };
    delete rest.problem;
    expect(UnderstandSchema.safeParse(rest).success).toBe(false);
  });

  it("renders a clean JSON Schema for the prompt", () => {
    const json = JSON.stringify(z.toJSONSchema(UnderstandSchema, { io: "input", unrepresentable: "any" }));
    expect(json).toContain("problemClarity");
    expect(json).toContain('"required"');
  });
});

describe("CompetitorSchema", () => {
  it("normalises source ids and accepts null axes", () => {
    const parsed = CompetitorSchema.parse({ ...(MOCK_OUTPUTS.competitors as object), axes: "nonsense" });
    expect(parsed.axes).toBeNull();
    const withNumbers = CompetitorSchema.parse({
      ...(MOCK_OUTPUTS.competitors as object),
      competitors: [{ ...(MOCK_OUTPUTS.competitors as { competitors: object[] }).competitors[0], sourceIds: [3, "s4", "bogus"] }],
    });
    expect(withNumbers.competitors[0].sourceIds).toEqual(["S3", "S4"]);
  });
});
