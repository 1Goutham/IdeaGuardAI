import { describe, expect, it } from "vitest";
import type { Source } from "@/types";
import { groundItems, sourcesForPrompt, verifyCompetitor } from "./grounding";

const src = (id: string, title: string, domain = "example.com", snippet = ""): Source => ({ id, title, url: `https://${domain}/x`, domain, snippet, publishedAt: null, query: "q" });
const sources = [src("S1", "Northwind Careers — internships", "northwind.example"), src("S2", "Survey of students", "example.com", "Students apply widely.")];

describe("groundItems", () => {
  it("drops unknown source ids and marks the item as evidence when a real one remains", () => {
    const [item] = groundItems([{ text: "x", sourceIds: ["S1", "S99", "S1"] }], sources);
    expect(item.sourceIds).toEqual(["S1"]);
    expect(item.basis).toBe("evidence");
  });

  it("downgrades an item whose citations are all invented to inference", () => {
    const [item] = groundItems([{ text: "x", sourceIds: ["S42"] }], sources);
    expect(item.sourceIds).toEqual([]);
    expect(item.basis).toBe("inference");
  });

  it("treats everything as inference when nothing was retrieved", () => {
    expect(groundItems([{ sourceIds: ["S1"] }], [])[0].basis).toBe("inference");
  });
});

describe("verifyCompetitor", () => {
  it("verifies a competitor named in a cited source", () => {
    const c = verifyCompetitor({ name: "Northwind Careers", url: "", sourceIds: ["S1"] }, sources);
    expect(c.verified).toBe(true);
    expect(c.sourceIds).toEqual(["S1"]);
  });

  it("does not verify a competitor whose cited source doesn't mention it", () => {
    const c = verifyCompetitor({ name: "Contoso Jobs", url: "", sourceIds: ["S2"] }, sources);
    expect(c.verified).toBe(false);
    expect(c.sourceIds).toEqual([]);
  });

  it("finds an uncited source that names the competitor", () => {
    const c = verifyCompetitor({ name: "Northwind Careers", url: "", sourceIds: [] }, sources);
    expect(c.verified).toBe(true);
  });

  it("strips non-http urls", () => {
    expect(verifyCompetitor({ name: "X", url: "javascript:alert(1)", sourceIds: [] }, sources).url).toBe("");
  });
});

describe("sourcesForPrompt", () => {
  it("tells the model explicitly when there are no sources", () => {
    expect(sourcesForPrompt([])).toMatch(/NO SOURCES/);
  });
});
