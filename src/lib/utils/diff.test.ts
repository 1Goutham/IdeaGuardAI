import { describe, expect, it } from "vitest";
import { changeRatio, diffWords } from "./diff";

describe("diffWords", () => {
  it("marks added and removed words", () => {
    const parts = diffWords("for university students", "for business students at one university");
    const added = parts.filter((p) => p.type === "added").map((p) => p.text).join("");
    const removed = parts.filter((p) => p.type === "removed").map((p) => p.text).join("");
    expect(added).toContain("business");
    expect(removed).toContain("university");
  });

  it("reconstructs both sides", () => {
    const a = "An AI tool for students";
    const b = "An AI assistant for penultimate-year students";
    const parts = diffWords(a, b);
    expect(parts.filter((p) => p.type !== "added").map((p) => p.text).join("")).toBe(a);
    expect(parts.filter((p) => p.type !== "removed").map((p) => p.text).join("")).toBe(b);
  });

  it("reports zero change for identical text", () => {
    expect(changeRatio(diffWords("same text", "same text"))).toBe(0);
  });
});
