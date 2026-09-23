import "server-only";
import type { Analysis } from "@/types";

export const SYSTEM = `You are one agent inside IdeaGuard, a product intelligence workspace that helps founders turn early-stage ideas into evidence-backed product strategy.

Principles:
- Be specific to this idea. A sentence that could apply to any startup is a wasted sentence.
- Be honest and sceptical, but constructive. The goal is a better product decision, not a verdict.
- Never invent facts, statistics, market sizes, prices, quotes, companies or sources. If you don't know, say so or leave the field empty.
- Keep what sources say separate from what you infer. Only cite a source ID when that source directly supports the statement.
- Plain, precise language. No hype, no filler, no emojis, no markdown.`;

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ideaBlock(idea: string): string {
  return `FOUNDER'S IDEA (verbatim):\n"""\n${idea.trim().slice(0, 6000)}\n"""`;
}

/** A compact brief of earlier stages, so later agents reason over the same understanding. */
export function brief(a: Analysis, include: ("understand" | "research" | "competitors" | "feasibility" | "risks" | "critic")[]): string {
  const parts: string[] = [];
  const u = a.understand;
  if (include.includes("understand") && u) {
    parts.push(
      `UNDERSTANDING\nProblem: ${u.problem}\nTarget user: ${u.targetUser}\nSolution: ${u.solution}\nValue proposition: ${u.valueProposition}\nCategory: ${u.category} · ${u.productType}\nClaimed differentiation: ${u.differentiation || "none stated"}`,
    );
  }
  const r = a.research;
  if (include.includes("research") && r) {
    const findings = r.findings
      .map((f) => `- [${f.topic}] ${f.headline}: ${f.detail}${f.sourceIds.length ? ` (${f.sourceIds.join(", ")})` : " (inference)"}`)
      .join("\n");
    parts.push(`RESEARCH (${r.mode === "live" ? `${r.sources.length} web sources` : "no web sources; model knowledge only"})\n${r.summary}\n${findings}`);
  }
  const c = a.competitors;
  if (include.includes("competitors") && c) {
    const list = c.competitors
      .map((x) => `- ${x.name}${x.verified ? "" : " (unverified)"}: ${x.description} Weakness: ${x.weaknesses.join("; ") || "unknown"}`)
      .join("\n");
    parts.push(`COMPETITION\n${list || "- none identified"}\nWhitespace: ${c.whitespace}`);
  }
  const f = a.feasibility;
  if (include.includes("feasibility") && f) {
    parts.push(`FEASIBILITY\n${f.summary}\nEffort: ${f.effort.level} (${f.effort.rationale})\nHardest problems: ${f.hardestProblems.join("; ")}`);
  }
  const k = a.risks;
  if (include.includes("risks") && k) {
    parts.push(`RISKS\n${k.risks.map((x) => `- ${x.title} [${x.category}, severity ${x.severity}, likelihood ${x.likelihood}]`).join("\n")}${k.regulations.length ? `\nRegulation: ${k.regulations.map((x) => x.name).join(", ")}` : ""}`);
  }
  const cr = a.critic;
  if (include.includes("critic") && cr) {
    parts.push(
      `STRESS TEST\nBiggest assumption: ${cr.biggestAssumptionId}\n${cr.assumptions.map((x) => `- ${x.id} ${x.statement} (importance ${x.importance}, evidence ${x.evidence}). May fail because: ${x.whyItMayFail}`).join("\n")}`,
    );
  }
  return parts.join("\n\n");
}
