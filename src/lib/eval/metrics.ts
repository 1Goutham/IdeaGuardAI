import { tallyEvidence } from "@/lib/scoring/evidence";
import { STAGE_IDS, type Analysis, type StageId, type StageTrace } from "@/types";

/**
 * Deterministic quality metrics for one analysis. No model involved, so the
 * same output always scores the same and runs can be compared over time.
 */

export interface Expectations {
  /** At least one of these words appears in the risks or regulations. */
  riskKeywords?: string[];
  /** The strategist's stance is one of these. */
  stanceIn?: ("pursue" | "refine" | "rethink")[];
  minCompetitors?: number;
  minSources?: number;
}

export interface EvalCase {
  id: string;
  idea: string;
  expect?: Expectations;
}

export interface StageRecord {
  status: "done" | "error";
  ms: number;
  trace?: StageTrace;
  errorCode?: string;
  missingInputs?: StageId[];
}

export interface CaseMetrics {
  id: string;
  completed: number;
  failed: StageId[];
  durationMs: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  repairs: number;
  waitedMs: number;
  sources: number;
  /** Sourced statements / all labelled statements. Null when nothing was labelled. */
  evidenceRate: number | null;
  citationsDropped: number;
  /** Verified / all competitors. Null without competitors. */
  competitorVerification: number | null;
  /** Buzzwords per 1,000 words of generated text. Lower is better. */
  genericDensity: number;
  words: number;
  stance: string | null;
  checks: { name: string; pass: boolean; detail: string }[];
}

export const GENERIC_PHRASES = [
  "leverage",
  "synergy",
  "synergies",
  "cutting-edge",
  "cutting edge",
  "seamless",
  "seamlessly",
  "revolutionize",
  "revolutionise",
  "game-changer",
  "game changer",
  "state-of-the-art",
  "best-in-class",
  "world-class",
  "next-generation",
  "paradigm",
  "holistic",
  "unlock the power",
  "empower",
  "robust solution",
  "innovative solution",
  "in today's fast-paced",
  "one-stop",
];

/** Every generated string in the analysis, excluding retrieved source text. */
export function generatedText(a: Analysis): string {
  const out: string[] = [];
  const walk = (v: unknown, key = "") => {
    if (key === "sources" || key === "items" || key === "url" || key === "id" || key === "sourceIds") return;
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach((x) => walk(x));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  for (const id of STAGE_IDS) walk(a[id]);
  return out.join("\n");
}

export function genericDensity(text: string): { density: number; words: number; hits: number } {
  const words = text.split(/\s+/).filter(Boolean).length;
  const lower = text.toLowerCase();
  let hits = 0;
  for (const p of GENERIC_PHRASES) {
    const re = new RegExp(`\\b${p.replace(/[-']/g, (c) => `\\${c}`)}`, "g");
    hits += lower.match(re)?.length ?? 0;
  }
  return { density: words ? (hits / words) * 1000 : 0, words, hits };
}

function checksFor(a: Analysis, expect: Expectations | undefined): CaseMetrics["checks"] {
  if (!expect) return [];
  const checks: CaseMetrics["checks"] = [];
  if (expect.riskKeywords?.length) {
    const text = JSON.stringify([a.risks?.risks, a.risks?.regulations]).toLowerCase();
    const found = expect.riskKeywords.filter((k) => text.includes(k.toLowerCase()));
    checks.push({ name: "risk coverage", pass: found.length > 0, detail: found.length ? `mentions ${found.join(", ")}` : `none of ${expect.riskKeywords.join(", ")}` });
  }
  if (expect.stanceIn?.length) {
    const s = a.strategy?.stance ?? null;
    checks.push({ name: "stance", pass: !!s && expect.stanceIn.includes(s), detail: `${s ?? "none"} (expected ${expect.stanceIn.join(" or ")})` });
  }
  if (expect.minCompetitors !== undefined) {
    const n = a.competitors?.competitors.length ?? 0;
    checks.push({ name: "competitors", pass: n >= expect.minCompetitors, detail: `${n} (min ${expect.minCompetitors})` });
  }
  if (expect.minSources !== undefined) {
    const n = a.sources?.items.length ?? 0;
    checks.push({ name: "sources", pass: n >= expect.minSources, detail: `${n} (min ${expect.minSources})` });
  }
  return checks;
}

export function scoreCase(c: EvalCase, a: Analysis, stages: Partial<Record<StageId, StageRecord>>, durationMs: number): CaseMetrics {
  const records = Object.values(stages).filter(Boolean) as StageRecord[];
  const traces = records.map((r) => r.trace).filter(Boolean) as StageTrace[];
  const sum = (f: (t: StageTrace) => number) => traces.reduce((n, t) => n + f(t), 0);
  const tally = tallyEvidence(a);
  const labelled = tally.sourced + tally.inferred;
  const competitors = tally.verifiedCompetitors + tally.unverifiedCompetitors;
  const g = genericDensity(generatedText(a));
  return {
    id: c.id,
    completed: STAGE_IDS.filter((s) => stages[s]?.status === "done").length,
    failed: STAGE_IDS.filter((s) => stages[s]?.status !== "done"),
    durationMs,
    calls: sum((t) => t.calls),
    inputTokens: sum((t) => t.inputTokens),
    outputTokens: sum((t) => t.outputTokens),
    repairs: traces.filter((t) => t.repaired).length,
    waitedMs: sum((t) => t.waitedMs),
    sources: tally.sources,
    evidenceRate: labelled ? tally.sourced / labelled : null,
    citationsDropped: sum((t) => t.citationsDropped ?? 0),
    competitorVerification: competitors ? tally.verifiedCompetitors / competitors : null,
    genericDensity: Math.round(g.density * 10) / 10,
    words: g.words,
    stance: a.strategy?.stance ?? null,
    checks: checksFor(a, c.expect),
  };
}

export interface Summary {
  cases: number;
  completionRate: number;
  checksPassed: number;
  checksTotal: number;
  meanEvidenceRate: number | null;
  meanCompetitorVerification: number | null;
  citationsDropped: number;
  meanGenericDensity: number;
  repairs: number;
  meanDurationMs: number;
  totalTokens: number;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function summarise(cases: CaseMetrics[]): Summary {
  const checks = cases.flatMap((c) => c.checks);
  return {
    cases: cases.length,
    completionRate: cases.length ? cases.reduce((n, c) => n + c.completed, 0) / (cases.length * STAGE_IDS.length) : 0,
    checksPassed: checks.filter((c) => c.pass).length,
    checksTotal: checks.length,
    meanEvidenceRate: mean(cases.map((c) => c.evidenceRate).filter((x): x is number => x !== null)),
    meanCompetitorVerification: mean(cases.map((c) => c.competitorVerification).filter((x): x is number => x !== null)),
    citationsDropped: cases.reduce((n, c) => n + c.citationsDropped, 0),
    meanGenericDensity: mean(cases.map((c) => c.genericDensity)) ?? 0,
    repairs: cases.reduce((n, c) => n + c.repairs, 0),
    meanDurationMs: mean(cases.map((c) => c.durationMs)) ?? 0,
    totalTokens: cases.reduce((n, c) => n + c.inputTokens + c.outputTokens, 0),
  };
}

/** Metrics where a change beyond the tolerance counts as a regression. */
export function compare(now: Summary, base: Summary): { metric: string; base: number | null; now: number | null; regression: boolean }[] {
  const rows: { metric: string; base: number | null; now: number | null; higherIsBetter: boolean; tol: number }[] = [
    { metric: "completionRate", base: base.completionRate, now: now.completionRate, higherIsBetter: true, tol: 0.001 },
    { metric: "checksPassed", base: base.checksPassed, now: now.checksPassed, higherIsBetter: true, tol: 0 },
    { metric: "meanEvidenceRate", base: base.meanEvidenceRate, now: now.meanEvidenceRate, higherIsBetter: true, tol: 0.05 },
    { metric: "meanCompetitorVerification", base: base.meanCompetitorVerification, now: now.meanCompetitorVerification, higherIsBetter: true, tol: 0.1 },
    { metric: "meanGenericDensity", base: base.meanGenericDensity, now: now.meanGenericDensity, higherIsBetter: false, tol: 1 },
    { metric: "repairs", base: base.repairs, now: now.repairs, higherIsBetter: false, tol: 1 },
  ];
  return rows.map((r) => ({
    metric: r.metric,
    base: r.base,
    now: r.now,
    regression: r.base !== null && r.now !== null && (r.higherIsBetter ? r.now < r.base - r.tol : r.now > r.base + r.tol),
  }));
}
