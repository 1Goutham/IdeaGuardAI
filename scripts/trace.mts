/**
 * Runs the full analysis pipeline from the command line and prints a
 * timestamped trace of every stage event. Uses whatever providers are
 * configured in the environment, so it works against real keys too:
 *
 *   node --conditions=react-server --env-file=.env.local --import tsx scripts/trace.ts "your idea"
 */
import { runAnalysis, type StageEvent } from "../src/lib/agents/orchestrator.ts";
import { STAGE_IDS, type Analysis } from "../src/types/index.ts";

const idea = process.argv.slice(2).join(" ").trim();
if (!idea) {
  console.error('Usage: trace.ts "an idea to analyse"');
  process.exit(1);
}

const t0 = Date.now();
const at = () => `${String(((Date.now() - t0) / 1000).toFixed(1)).padStart(6)}s`;
const analysis: Analysis = {};
const outcome: Record<string, string> = {};

await runAnalysis({ idea, stages: [...STAGE_IDS], prior: {} }, (e: StageEvent) => {
  if (e.type === "done") return;
  if (e.type === "sources") return console.log(`${at()}  sources      · ${e.sources.items.length} gathered via ${e.sources.provider ?? "no search provider"}`);
  if (e.type === "note") return console.log(`${at()}  ${e.stage.padEnd(12)} · ${e.note}`);
  if (e.status === "running") return console.log(`${at()}  ${e.stage.padEnd(12)} ▶ running`);
  if (e.status === "done") {
    (analysis as Record<string, unknown>)[e.stage] = e.data;
    outcome[e.stage] = "done";
    const extra = "missingInputs" in e && Array.isArray(e.missingInputs) && e.missingInputs.length ? ` (without: ${e.missingInputs.join(", ")})` : "";
    const t = e.trace;
    const how = [`${t.calls} call${t.calls === 1 ? "" : "s"}`, t.waitedMs ? `waited ${(t.waitedMs / 1000).toFixed(0)}s` : "", t.repaired ? "repaired" : "", `${t.inputTokens}→${t.outputTokens} tok`].filter(Boolean).join(", ");
    return console.log(`${at()}  ${e.stage.padEnd(12)} ✓ ${e.engine}${e.note ? ` · ${e.note}` : ""}${extra}  [${how}]`);
  }
  outcome[e.stage] = "error";
  console.log(`${at()}  ${e.stage.padEnd(12)} ✗ [${e.error.code}] ${e.error.message}`);
  const d = (e.error as { detail?: unknown }).detail;
  if (d) console.log(`${" ".repeat(22)}${JSON.stringify(d).slice(0, 400)}`);
});

console.log(`\n${at()}  finished · ${STAGE_IDS.map((s) => `${s}:${outcome[s] ?? "-"}`).join("  ")}`);
