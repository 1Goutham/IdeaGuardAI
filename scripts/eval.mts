/**
 * IdeaGuard evaluation suite. Runs golden ideas through the real pipeline
 * with whatever providers are configured, scores each with deterministic
 * metrics, and compares against a saved baseline.
 *
 *   npm run eval                       # all cases
 *   npm run eval -- --only vague,micro-loans
 *   npm run eval -- --save-baseline    # record this run as the baseline
 *   EVAL_JUDGE=1 npm run eval          # also ask the model to grade each report (costs tokens)
 *
 * Writes evals/results/latest.json and latest.md. Exits 1 on a regression.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { z } from "zod";
import { runAnalysis, type StageEvent } from "../src/lib/agents/orchestrator.ts";
import { generateStructured } from "../src/lib/ai/engine.ts";
import { compare, scoreCase, summarise, type CaseMetrics, type EvalCase, type StageRecord, type Summary } from "../src/lib/eval/metrics.ts";
import { STAGE_IDS, type Analysis, type StageId } from "../src/types/index.ts";

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1]?.split(",") : null;
const saveBaseline = args.includes("--save-baseline");
const judge = process.env.EVAL_JUDGE === "1";

const cases = (JSON.parse(readFileSync("evals/ideas.json", "utf8")) as EvalCase[]).filter((c) => !only || only.includes(c.id));
if (!cases.length) {
  console.error("No eval cases matched.");
  process.exit(1);
}

const Grade = z.object({
  specificity: z.number().int().min(1).max(5).describe("1 = generic advice that fits any idea; 5 = specific to this idea, its users and market."),
  honesty: z.number().int().min(1).max(5).describe("1 = overclaims or invents facts; 5 = separates evidence from inference and states uncertainty."),
  actionability: z.number().int().min(1).max(5).describe("1 = no clear next step; 5 = cheap, concrete, falsifiable next steps."),
  weakest: z.string().max(300).describe("The single weakest part of the report, in one sentence."),
});
type Grade = z.infer<typeof Grade>;

async function grade(c: EvalCase, a: Analysis): Promise<Grade | { error: string }> {
  const brief = JSON.stringify({ idea: c.idea, understand: a.understand, competitors: a.competitors?.competitors.map((x) => ({ name: x.name, verified: x.verified })), risks: a.risks?.risks, critic: a.critic?.assumptions, strategy: a.strategy }).slice(0, 14_000);
  const res = await generateStructured({
    tag: "judge",
    schema: Grade,
    system: "You grade product-analysis reports strictly. Most reports deserve a 3. Give 5 only when nothing could be improved.",
    prompt: `Grade this report.\n\n${brief}`,
    maxOutputTokens: 1200,
    reasoning: "low",
  });
  return res.ok ? res.data.value : { error: res.error.message };
}

const engines = new Set<string>();
const results: (CaseMetrics & { grade?: Grade | { error: string } })[] = [];
for (const c of cases) {
  const t0 = Date.now();
  const analysis: Analysis = {};
  const stages: Partial<Record<StageId, StageRecord>> = {};
  const started: Partial<Record<StageId, number>> = {};
  process.stdout.write(`▶ ${c.id.padEnd(18)}`);
  await runAnalysis({ idea: c.idea, stages: [...STAGE_IDS], prior: {} }, (e: StageEvent) => {
    if (e.type === "sources") analysis.sources = e.sources;
    if (e.type !== "stage") return;
    if (e.status === "running") return void (started[e.stage] = Date.now());
    const ms = Date.now() - (started[e.stage] ?? t0);
    if (e.status === "done") {
      (analysis as Record<string, unknown>)[e.stage] = e.data;
      engines.add(e.engine);
      stages[e.stage] = { status: "done", ms, trace: e.trace, missingInputs: e.missingInputs };
      process.stdout.write("●");
    } else {
      stages[e.stage] = { status: "error", ms, errorCode: e.error.code };
      process.stdout.write("○");
    }
  });
  const m: CaseMetrics & { grade?: Grade | { error: string } } = scoreCase(c, analysis, stages, Date.now() - t0);
  if (judge && analysis.strategy) m.grade = await grade(c, analysis);
  results.push(m);
  const failedChecks = m.checks.filter((x) => !x.pass).length;
  console.log(`  ${m.completed}/7 · ${(m.durationMs / 1000).toFixed(0)}s · ${m.checks.length - failedChecks}/${m.checks.length} checks${m.failed.length ? ` · failed: ${m.failed.join(", ")}` : ""}`);
}

const summary = summarise(results);
const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
const baselinePath = "evals/baseline.json";
const baseline = existsSync(baselinePath) ? (JSON.parse(readFileSync(baselinePath, "utf8")) as { summary: Summary; engine: string }) : null;
const diff = baseline ? compare(summary, baseline.summary) : [];
const engine = [...engines].join(", ");

const md = [
  `# IdeaGuard eval · ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`,
  "",
  `Engine: ${engine || "none"}${baseline ? ` · baseline engine: ${baseline.engine || "none"}` : ""}`,
  "",
  `${summary.cases} cases · completion ${pct(summary.completionRate)} · checks ${summary.checksPassed}/${summary.checksTotal} · evidence rate ${pct(summary.meanEvidenceRate)} · competitors verified ${pct(summary.meanCompetitorVerification)} · citations dropped ${summary.citationsDropped} · generic density ${summary.meanGenericDensity.toFixed(1)}/1k words · repairs ${summary.repairs} · mean ${(summary.meanDurationMs / 1000).toFixed(0)}s · ${summary.totalTokens.toLocaleString()} tokens`,
  "",
  "| Case | Stages | Time | Evidence | Verified | Dropped | Generic | Stance | Checks |" + (judge ? " Judge (S/H/A) |" : ""),
  "|---|---|---|---|---|---|---|---|---|" + (judge ? "---|" : ""),
  ...results.map((r) => {
    const checks = r.checks.map((c) => `${c.pass ? "✓" : "✗"} ${c.name}: ${c.detail}`).join("<br>") || "—";
    const g = r.grade ? ("error" in r.grade ? ` ${r.grade.error} |` : ` ${r.grade.specificity}/${r.grade.honesty}/${r.grade.actionability} — ${r.grade.weakest} |`) : judge ? " — |" : "";
    return `| ${r.id} | ${r.completed}/7${r.failed.length ? ` (${r.failed.join(", ")})` : ""} | ${(r.durationMs / 1000).toFixed(0)}s | ${pct(r.evidenceRate)} | ${pct(r.competitorVerification)} | ${r.citationsDropped} | ${r.genericDensity} | ${r.stance ?? "—"} | ${checks} |${g}`;
  }),
  "",
  ...(baseline
    ? ["## Against baseline", "", "| Metric | Baseline | Now | |", "|---|---|---|---|", ...diff.map((d) => `| ${d.metric} | ${d.base ?? "—"} | ${d.now ?? "—"} | ${d.regression ? "regression" : ""} |`)]
    : ["No baseline yet. Run with `--save-baseline` to record one."]),
  "",
].join("\n");

mkdirSync("evals/results", { recursive: true });
writeFileSync("evals/results/latest.json", JSON.stringify({ at: new Date().toISOString(), engine, summary, results }, null, 2));
writeFileSync("evals/results/latest.md", md);
if (saveBaseline) writeFileSync(baselinePath, JSON.stringify({ at: new Date().toISOString(), engine, summary }, null, 2));
console.log(`\n${md}`);
console.log(`Wrote evals/results/latest.md${saveBaseline ? " and evals/baseline.json" : ""}.`);
if (diff.some((d) => d.regression)) process.exit(1);
