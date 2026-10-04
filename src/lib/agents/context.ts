import "server-only";
import type { Analysis, Source, StageId } from "@/types";
import { STAGE_COPY } from "./pipeline";

/**
 * Compact, per-agent context.
 *
 * Earlier versions passed every source snippet to several agents, which made
 * each request several thousand tokens and blew through free-tier
 * tokens-per-minute limits. Each agent now receives a digest of what earlier
 * agents concluded, and only the sources relevant to its job, trimmed.
 */

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

export function ideaCard(a: Analysis): string {
  const u = a.understand;
  if (!u) return "";
  return [
    "UNDERSTANDING (from the Idea Analyst)",
    `Problem: ${u.problem}`,
    `Target user: ${u.targetUser}`,
    `Solution: ${u.solution}`,
    `Value proposition: ${u.valueProposition}`,
    `Category: ${u.category} · ${u.productType}`,
    `Claimed differentiation: ${u.differentiation || "none stated"}`,
  ].join("\n");
}

/** Research findings as short lines, optionally filtered by topic. */
export function researchDigest(a: Analysis, opts: { topics?: string[]; max?: number } = {}): string {
  const r = a.research;
  if (!r) return "";
  const findings = r.findings.filter((f) => !opts.topics || opts.topics.includes(f.topic)).slice(0, opts.max ?? 8);
  const lines = findings.map((f) => `- [${f.topic}] ${f.headline}: ${clip(oneLine(f.detail), 220)} (${f.sourceIds.length ? f.sourceIds.join(", ") : "inference"})`);
  return [`RESEARCH (${r.mode === "live" ? `${r.sources.length} web sources` : "no web sources; model knowledge only"})`, clip(oneLine(r.summary), 500), ...lines].join("\n");
}

export interface SourcePick {
  /** Prefer sources retrieved by these queries. */
  queries?: string[];
  /** Always include these source IDs (e.g. ones cited by relevant findings). */
  ids?: string[];
  max: number;
  /** Characters of snippet to keep; 0 for title-only. */
  snippet: number;
}

/** Choose a small, relevant subset of sources, keeping their original IDs. */
export function pickSources(sources: Source[], pick: SourcePick): Source[] {
  const wantedQueries = new Set((pick.queries ?? []).map((q) => q.toLowerCase()));
  const wantedIds = new Set(pick.ids ?? []);
  const score = (s: Source) => (wantedIds.has(s.id) ? 2 : 0) + (wantedQueries.has(s.query.toLowerCase()) ? 1 : 0);
  return [...sources]
    .map((s, i) => ({ s, i, score: score(s) }))
    .sort((x, y) => y.score - x.score || x.i - y.i)
    .slice(0, pick.max)
    .sort((x, y) => x.i - y.i)
    .map(({ s }) => s);
}

export function sourcesBlock(sources: Source[], snippet: number): string {
  if (!sources.length) return "SOURCES\nNone available. Every item must have an empty sourceIds array.";
  return [
    "SOURCES (cite only these IDs)",
    ...sources.map((s) => {
      const head = `[${s.id}] ${clip(s.title, 120)} — ${s.domain}${s.publishedAt ? `, ${s.publishedAt.slice(0, 10)}` : ""}`;
      return snippet > 0 ? `${head}\n    ${clip(oneLine(s.snippet), snippet)}` : head;
    }),
  ].join("\n");
}

export function competitorDigest(a: Analysis): string {
  const c = a.competitors;
  if (!c) return "";
  const lines = c.competitors
    .slice(0, 6)
    .map((x) => `- ${x.name}${x.verified ? "" : " (unverified)"}: ${clip(oneLine(x.description), 140)} Weakness: ${clip(x.weaknesses.join("; ") || "unknown", 140)}`);
  return ["COMPETITION (from the Competitor Agent)", ...lines, `Gap: ${clip(oneLine(c.whitespace), 300)}`].join("\n");
}

export function feasibilityDigest(a: Analysis): string {
  const f = a.feasibility;
  if (!f) return "";
  return [
    "FEASIBILITY (from the Feasibility Agent)",
    clip(oneLine(f.summary), 300),
    `Build effort: ${f.effort.level}. ${clip(oneLine(f.effort.rationale), 200)}`,
    `Hard problems: ${f.hardestProblems.map((p) => clip(p, 140)).join("; ")}`,
    `Hard-to-get data: ${f.dataNeeds.filter((d) => d.availability === "hard").map((d) => d.need).join("; ") || "none identified"}`,
  ].join("\n");
}

export function riskDigest(a: Analysis): string {
  const k = a.risks;
  if (!k) return "";
  return [
    "RISKS (from the Risk & Governance Agent)",
    ...k.risks.slice(0, 7).map((x) => `- ${x.title} [${x.category}; severity ${x.severity}, likelihood ${x.likelihood}]`),
    k.regulations.length ? `Regulation: ${k.regulations.map((x) => x.name).join(", ")}` : "Regulation: none identified",
  ].join("\n");
}

export function criticDigest(a: Analysis): string {
  const c = a.critic;
  if (!c) return "";
  const biggest = c.assumptions.find((x) => x.id === c.biggestAssumptionId);
  return [
    "STRESS TEST (from the Critic)",
    biggest ? `Biggest assumption: ${biggest.id} "${biggest.statement}" (evidence ${biggest.evidence}). May fail because: ${clip(oneLine(biggest.whyItMayFail), 200)}` : "",
    ...c.assumptions.filter((x) => x.id !== c.biggestAssumptionId).slice(0, 5).map((x) => `- ${x.id} ${x.statement} (importance ${x.importance}, evidence ${x.evidence})`),
    ...c.experiments.slice(0, 4).map((e) => `- Experiment ${e.id} for ${e.assumptionId}: ${e.title}`),
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Tells an agent exactly which inputs are missing and that it must not fill
 * the gap. The strings name the agent so the model can refer to it.
 */
export function unavailableBlock(missing: StageId[]): string {
  if (!missing.length) return "";
  return [
    "UNAVAILABLE INPUTS",
    ...missing.map((id) => `- ${STAGE_COPY[id].agent}: did not complete. There is no ${STAGE_COPY[id].subject} for this run.`),
    "Do not guess or invent what these would have said. Where they matter, say the information is unavailable and lower your confidence.",
  ].join("\n");
}

export function join(...parts: string[]): string {
  return parts.filter((p) => p.trim()).join("\n\n");
}
