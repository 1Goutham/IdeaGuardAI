import { SIGNAL_META } from "@/lib/scoring/signals";
import type { BlueprintOutput, IdeaVersion, PrdOutput, Project, Source } from "@/types";
import { formatDate } from "./index";

/** Plain-markdown exports. Evidence labels travel with the content. */

const refs = (ids: string[]) => (ids.length ? ` [${ids.join(", ")}]` : " _(inference)_");
const bullets = (items: string[]) => items.map((x) => `- ${x}`).join("\n");

function sourcesMd(sources: Source[]): string {
  return sources.map((s) => `- **${s.id}** [${s.title}](${s.url}) — ${s.domain}${s.publishedAt ? `, ${formatDate(s.publishedAt)}` : ""}`).join("\n");
}

export function reportToMarkdown(project: Project, v: IdeaVersion): string {
  const a = v.analysis;
  const out: string[] = [`# ${project.title} — v${v.number}`, `_IdeaGuard report · ${formatDate(v.createdAt)}_`, "", "## Idea", "", `> ${v.idea.replace(/\n/g, "\n> ")}`];

  if (a.strategy) {
    out.push("", "## Recommendation", "", `**${a.strategy.stance.toUpperCase()}** — ${a.strategy.headline}`, "", a.strategy.reasoning);
  }
  if (a.understand) {
    const u = a.understand;
    out.push("", "## Overview", "", `- **Problem:** ${u.problem}`, `- **Target user:** ${u.targetUser}`, `- **Solution:** ${u.solution}`, `- **Value proposition:** ${u.valueProposition}`, `- **Category:** ${u.category} · ${u.productType}`);
  }
  const signals = a.strategy?.signals ?? a.understand?.signals;
  if (signals) {
    out.push("", "## Opportunity signals", "", "| Signal | Level | Why |", "| --- | --- | --- |");
    signals.forEach((s) => out.push(`| ${SIGNAL_META[s.key].label} | ${s.level} | ${s.rationale.replace(/\|/g, "/")} |`));
  }
  if (a.research) {
    out.push("", "## Research", "", a.research.mode === "live" ? `_${a.research.sources.length} sources · researched ${formatDate(a.research.researchedAt)}_` : "_No live search: findings are model inference._", "", a.research.summary, "");
    a.research.findings.forEach((f) => out.push(`- **${f.headline}** ${f.detail}${refs(f.sourceIds)}`));
  }
  if (a.competitors) {
    out.push("", "## Competition", "", a.competitors.whitespace, "");
    a.competitors.competitors.forEach((c) =>
      out.push(`### ${c.name}${c.verified ? "" : " _(unverified)_"}`, "", c.description, "", `- Audience: ${c.audience}`, `- Pricing: ${c.pricing || "not found"}`, `- Strengths: ${c.strengths.join("; ")}`, `- Weaknesses: ${c.weaknesses.join("; ")}`, `- Opportunity: ${c.opportunity}`, ""),
    );
  }
  if (a.feasibility) {
    out.push("", "## Feasibility", "", a.feasibility.summary, "", `Effort: **${a.feasibility.effort.level}** — ${a.feasibility.effort.rationale}`, "", "Hard problems:", bullets(a.feasibility.hardestProblems));
  }
  if (a.risks) {
    out.push("", "## Risks", "");
    a.risks.risks.forEach((r) => out.push(`- **${r.title}** (${r.category}; severity ${r.severity}, likelihood ${r.likelihood}) ${r.description} _Mitigation:_ ${r.mitigation}${refs(r.sourceIds)}`));
    if (a.risks.regulations.length) {
      out.push("", "Regulation:", "");
      a.risks.regulations.forEach((r) => out.push(`- **${r.name}**${r.jurisdiction ? ` (${r.jurisdiction})` : ""}: ${r.relevance}${refs(r.sourceIds)}`));
    }
  }
  if (a.critic) {
    const big = a.critic.assumptions.find((x) => x.id === a.critic!.biggestAssumptionId);
    out.push("", "## Stress test", "");
    if (big) out.push(`**Biggest assumption:** "${big.statement}"`, "", `Why it may fail: ${big.whyItMayFail}`, "", `How to test it: ${big.howToTest}`, "");
    out.push("### Experiments", "", "| Assumption | Experiment | Success criteria | Status |", "| --- | --- | --- | --- |");
    a.critic.experiments.forEach((e) => {
      const as = a.critic!.assumptions.find((x) => x.id === e.assumptionId);
      out.push(`| ${as?.statement ?? e.assumptionId} | ${e.title}: ${e.method} | ${e.successCriteria} | ${v.experiments[e.id]?.status ?? "unknown"} |`);
    });
  }
  if (a.strategy) {
    const m = a.strategy.mvp;
    out.push("", "## MVP", "", m.goal, "", "**Build first**", "", ...m.buildFirst.map((x, i) => `${i + 1}. ${x.title} — ${x.why}`), "", "**Don't build yet**", "", ...m.dontBuildYet.map((x, i) => `${i + 1}. ${x.title} — ${x.why}`), "", `Scope: ${m.scope}`, "", `Success metric: ${m.successMetric}`, "", "## Next steps", "", ...a.strategy.nextSteps.map((x, i) => `${i + 1}. ${x}`));
  }
  if (a.research?.sources.length) out.push("", "## Sources", "", sourcesMd(a.research.sources));
  return out.join("\n");
}

export function prdToMarkdown(p: PrdOutput): string {
  const req = (list: { id: string; requirement: string; priority: string }[]) => list.map((r) => `- **${r.id}** (${r.priority}) ${r.requirement}`).join("\n");
  return [
    `# ${p.title}`,
    "",
    p.summary,
    "",
    "## Problem",
    "",
    p.problem,
    "",
    "## Target users",
    "",
    ...p.targetUsers.map((t) => `- **${t.segment}:** ${t.needs.join("; ")}`),
    "",
    "## User journeys",
    "",
    ...p.journeys.flatMap((j) => [`### ${j.name}`, "", ...j.steps.map((s, i) => `${i + 1}. ${s}`), ""]),
    "## Product requirements",
    "",
    req(p.productRequirements),
    "",
    "## Functional requirements",
    "",
    req(p.functionalRequirements),
    "",
    "## Non-functional requirements",
    "",
    ...p.nonFunctionalRequirements.map((r) => `- **${r.category}:** ${r.requirement}`),
    "",
    "## AI requirements",
    "",
    ...(p.aiRequirements.length ? p.aiRequirements.map((r) => `- **${r.capability}:** ${r.requirement} _Evaluation:_ ${r.evaluation}`) : ["None."]),
    "",
    "## Data requirements",
    "",
    ...p.dataRequirements.map((r) => `- **${r.entity}** — ${r.source}. ${r.handling}`),
    "",
    "## Success metrics",
    "",
    ...p.successMetrics.map((m) => `- **${m.metric}:** ${m.target} — ${m.why}`),
    "",
    "## MVP scope",
    "",
    "**In scope**",
    "",
    bullets(p.mvpScope.inScope),
    "",
    "**Out of scope**",
    "",
    bullets(p.mvpScope.outOfScope),
    "",
    "## Open questions",
    "",
    bullets(p.openQuestions),
  ].join("\n");
}

export function blueprintToMarkdown(b: BlueprintOutput): string {
  return [
    "# Technical blueprint",
    "",
    b.summary,
    "",
    "## Architecture",
    "",
    ...b.layers.flatMap((l) => [`### ${l.name}`, "", ...l.items.map((i) => `- **${i.name}** — ${i.role}`), ""]),
    "## Stack",
    "",
    "| Area | Choice | Why |",
    "| --- | --- | --- |",
    ...b.stack.map((s) => `| ${s.area} | ${s.choice} | ${s.why} |`),
    "",
    "## API",
    "",
    ...b.apis.map((a) => `- \`${a.method} ${a.path}\` — ${a.purpose}`),
    "",
    "## Data model",
    "",
    ...b.dataModel.map((d) => `- **${d.entity}**: ${d.fields.join(", ")}`),
    "",
    "## Data flow",
    "",
    ...b.dataFlow.map((s, i) => `${i + 1}. ${s}`),
    "",
    "## AI components",
    "",
    ...(b.aiComponents.length ? b.aiComponents.map((c) => `- **${c.name}** (${c.approach}): ${c.input} → ${c.output}. _Guardrails:_ ${c.guardrails}`) : ["None."]),
    "",
    "## Technical risks",
    "",
    ...b.risks.map((r) => `- **${r.risk}** — ${r.mitigation}`),
  ].join("\n");
}
