import { describe, expect, it } from "vitest";
import { pickSources, sourcesBlock, unavailableBlock } from "./context";
import type { Source } from "@/types";

const sources: Source[] = Array.from({ length: 24 }, (_, i) => ({
  id: `S${i + 1}`,
  title: `Title ${i + 1}`,
  url: `https://example.com/${i}`,
  domain: "example.com",
  snippet: "word ".repeat(240),
  publishedAt: null,
  query: i < 5 ? "competitor query" : "market query",
}));

describe("compact context", () => {
  it("prefers relevant sources, keeps their original IDs and order, and caps the count", () => {
    const picked = pickSources(sources, { queries: ["competitor query"], ids: ["S20"], max: 6, snippet: 200 });
    expect(picked.map((s) => s.id)).toEqual(["S1", "S2", "S3", "S4", "S5", "S20"]);
  });

  it("keeps the competitor context far smaller than the full source dump", () => {
    const full = sourcesBlock(sources, 600).length;
    const compact = sourcesBlock(pickSources(sources, { max: 10, snippet: 380 }), 380).length;
    expect(compact).toBeLessThan(full / 3);
  });

  it("tells the agent what's missing and not to invent it", () => {
    const block = unavailableBlock(["feasibility"]);
    expect(block).toMatch(/Feasibility Agent: did not complete/);
    expect(block).toMatch(/Do not guess or invent/);
  });
});
