import "server-only";
import { completeStructured, type EngineMeta } from "@/lib/ai/engine";
import type { AiResponse } from "@/lib/ai/contracts";
import { groundItems, sourcesForPrompt, verifyCompetitor } from "@/lib/research/grounding";
import type { GatherResult } from "@/lib/research/search";
import {
  BlueprintSchema,
  CompetitorSchema,
  CriticSchema,
  FeasibilitySchema,
  PrdSchema,
  ResearchSchema,
  RiskSchema,
  SIGNAL_KEYS,
  StrategySchema,
  UnderstandSchema,
} from "@/lib/schemas/agents";
import type {
  Analysis,
  BlueprintOutput,
  CompetitorResult,
  CriticOutput,
  FeasibilityOutput,
  PrdOutput,
  ResearchResult,
  RiskResult,
  Source,
  StrategyResult,
  UnderstandOutput,
} from "@/types";
import { brief, ideaBlock, SYSTEM, today } from "./prompts";

/**
 * The agents. Each one is a single structured call with a narrow role, a
 * zod contract, and post-processing that enforces evidence rules in code.
 */

type Result<T> = Promise<AiResponse<{ value: T } & EngineMeta>>;

function map<A, B>(res: AiResponse<{ value: A } & EngineMeta>, fn: (a: A) => B): AiResponse<{ value: B } & EngineMeta> {
  return res.ok ? { ok: true, data: { value: fn(res.data.value), engine: res.data.engine } } : res;
}

/* 01 ---------------------------------------------------------------- */

export async function understand(idea: string): Result<UnderstandOutput> {
  const res = await completeStructured({
    tag: "understand",
    schema: UnderstandSchema,
    system: SYSTEM,
    temperature: 0.3,
    prompt: `ROLE: Idea Analyst. Restate the founder's idea precisely, as a sharp product manager would after a first conversation. Where the idea is vague, choose the most plausible specific reading and list what remains ambiguous under "unclear".

Then give a first-read signal for each of these seven dimensions (level = magnitude, not quality):
- problemClarity: how clearly a real, specific problem is defined
- differentiation: how distinct the solution is from obvious alternatives
- competition: how crowded the space likely is
- technicalComplexity: how hard it is to build well
- dataDependency: how much it relies on data that must be acquired, labelled or kept fresh
- marketUncertainty: how unproven demand and willingness to pay are
- mvpComplexity: how hard a credible first version is

Finally, plan the web research: specific search queries a researcher should run. Today is ${today()}.

${ideaBlock(idea)}`,
  });
  if (!res.ok) return res;
  // Guarantee one signal per key, in a stable order.
  const byKey = new Map(res.data.value.signals.map((s) => [s.key, s]));
  const signals = SIGNAL_KEYS.map((key) => byKey.get(key)).filter((s): s is NonNullable<typeof s> => !!s);
  return { ok: true, data: { ...res.data, value: { ...res.data.value, signals } } };
}

/* 02 ---------------------------------------------------------------- */

export function researchQueries(u: UnderstandOutput): string[] {
  return [...u.searchPlan.market, ...u.searchPlan.competitors, ...u.searchPlan.context];
}

export async function research(idea: string, a: Analysis, gathered: GatherResult): Result<ResearchResult> {
  const live = gathered.sources.length > 0;
  const res = await completeStructured({
    tag: "research",
    schema: ResearchSchema,
    system: SYSTEM,
    temperature: 0.2,
    prompt: `ROLE: Research Agent. Synthesise what is known about the market this idea enters: demand, trends, pricing norms, user complaints about existing solutions, enabling technology and regulation.

${
  live
    ? "Base findings on the numbered sources below. Cite the IDs that support each finding. A finding you cannot tie to a source is allowed only if clearly useful; give it an empty sourceIds array and low confidence."
    : "No web sources were retrieved. Give fewer findings (3–5), drawn from well-established general knowledge only, each with an empty sourceIds array and at most medium confidence. Do not state specific numbers."
}

Today is ${today()}. Prefer recent information.

${ideaBlock(idea)}

${brief(a, ["understand"])}

SOURCES
${sourcesForPrompt(gathered.sources)}`,
  });
  return map(res, (v) => ({
    ...v,
    findings: groundItems(v.findings, gathered.sources),
    sources: gathered.sources,
    mode: live ? "live" : "offline",
    provider: gathered.provider,
    queries: gathered.queries,
    researchedAt: new Date().toISOString(),
  }));
}

/* 03 ---------------------------------------------------------------- */

export async function competitors(idea: string, a: Analysis, sources: Source[]): Result<CompetitorResult> {
  const res = await completeStructured({
    tag: "competitors",
    schema: CompetitorSchema,
    system: SYSTEM,
    temperature: 0.2,
    prompt: `ROLE: Competitor Agent. Identify the existing products this idea would compete with, including indirect alternatives and substitutes (what users do today instead).

${
  sources.length
    ? "Only include products that are named in the sources below, and cite the sources that describe them. Take pricing only from the sources; otherwise leave it empty."
    : "No web sources were retrieved. Include only widely known products you are highly confident exist (they will be shown to the user as unverified). Leave pricing empty. Fewer is better than wrong."
}

For the positioning map, pick two axes that genuinely separate these products, and place each competitor and "Your idea" coarsely (low / medium / high). Return axes: null if a map would be misleading.

${ideaBlock(idea)}

${brief(a, ["understand"])}

SOURCES
${sourcesForPrompt(sources)}`,
  });
  return map(res, (v) => {
    const verified = v.competitors.map((c) => verifyCompetitor(c, sources));
    const names = new Set([...verified.map((c) => c.name.toLowerCase()), "your idea"]);
    return {
      ...v,
      competitors: verified,
      placements: v.axes ? v.placements.filter((p) => names.has(p.name.toLowerCase())) : [],
    };
  });
}

/* 04 ---------------------------------------------------------------- */

export async function feasibility(idea: string, a: Analysis): Result<FeasibilityOutput> {
  return completeStructured({
    tag: "feasibility",
    schema: FeasibilitySchema,
    system: SYSTEM,
    temperature: 0.3,
    prompt: `ROLE: Feasibility Agent. Assess how this could be built by a small team today: the major components, what to build versus buy or integrate, the data it depends on and how obtainable that data is, and the genuinely hard problems. Be concrete about technology; avoid generic advice.

${ideaBlock(idea)}

${brief(a, ["understand", "research"])}`,
  });
}

/* 05 ---------------------------------------------------------------- */

export async function risks(idea: string, a: Analysis): Result<RiskResult> {
  const sources = a.research?.sources ?? [];
  const res = await completeStructured({
    tag: "risks",
    schema: RiskSchema,
    system: SYSTEM,
    temperature: 0.3,
    prompt: `ROLE: Risk & Governance Agent. Identify the risks that could sink this product: market, adoption, technical, legal, privacy, ethical (bias, misuse, over-reliance on AI), operational and financial. Rate severity and likelihood honestly; not everything is high. List regulations only where they plausibly apply to this specific idea, and say why.

Cite a source ID only when a source below directly supports the risk or regulation.

${ideaBlock(idea)}

${brief(a, ["understand", "research"])}

SOURCES
${sourcesForPrompt(sources, 300)}`,
  });
  return map(res, (v) => ({ risks: groundItems(v.risks, sources), regulations: groundItems(v.regulations, sources) }));
}

/* 06 ---------------------------------------------------------------- */

export async function critic(idea: string, a: Analysis): Result<CriticOutput> {
  const res = await completeStructured({
    tag: "critic",
    schema: CriticSchema,
    system: SYSTEM,
    temperature: 0.5,
    prompt: `ROLE: Critic. Your job is to stress-test this idea the way a sharp, fair investor or a sceptical target user would. Do not summarise; challenge.

1. List the load-bearing assumptions: things that must be true for this to work. Phrase each as the founder's belief. Judge how much the research actually supports each (evidence: none / weak / moderate / strong).
2. Name the single biggest assumption: the one that, if false, kills the idea.
3. Give direct counterpoints to the idea's claims.
4. Design one cheap, fast, falsifiable experiment for each of the most important assumptions, with a success threshold decided in advance. Prefer interviews, landing pages, concierge tests and prototypes over building the product.

${ideaBlock(idea)}

${brief(a, ["understand", "research", "competitors", "feasibility", "risks"])}`,
  });
  if (!res.ok) return res;
  const v = res.data.value;
  const ids = new Set(v.assumptions.map((x) => x.id));
  const biggestAssumptionId = ids.has(v.biggestAssumptionId) ? v.biggestAssumptionId : (v.assumptions[0]?.id ?? "");
  const experiments = v.experiments.filter((e) => ids.has(e.assumptionId));
  return { ok: true, data: { ...res.data, value: { ...v, biggestAssumptionId, experiments } } };
}

/* 07 ---------------------------------------------------------------- */

export async function strategy(idea: string, a: Analysis): Result<StrategyResult> {
  const sources = a.research?.sources ?? [];
  const firstRead = a.understand?.signals.map((s) => `${s.key}: ${s.level}`).join(", ") ?? "";
  const res = await completeStructured({
    tag: "strategy",
    schema: StrategySchema,
    system: SYSTEM,
    temperature: 0.4,
    prompt: `ROLE: Product Strategist. Weigh everything the other agents found and decide what the founder should do next.

- stance: pursue, refine or rethink. Be decisive and explain the trade-off.
- Revise the seven signals in light of the research, competition and critique (first read was: ${firstRead}). Cite source IDs where a signal is supported by a source.
- Positioning: a sharp statement and the narrow wedge to win first.
- MVP: the smallest thing that tests the biggest assumption. Be ruthless about what not to build yet; name tempting features explicitly.
- refinedIdea: rewrite the idea so it addresses the biggest weaknesses found, in the founder's voice.

${ideaBlock(idea)}

${brief(a, ["understand", "research", "competitors", "feasibility", "risks", "critic"])}

SOURCES (for signal citations)
${sourcesForPrompt(sources, 200)}`,
  });
  if (!res.ok) return res;
  const v = res.data.value;
  const byKey = new Map(v.signals.map((s) => [s.key, s]));
  const ordered = SIGNAL_KEYS.map((k) => byKey.get(k)).filter((s): s is NonNullable<typeof s> => !!s);
  return { ok: true, data: { ...res.data, value: { ...v, signals: groundItems(ordered, sources) } } };
}

/* Documents ---------------------------------------------------------- */

function strategyBrief(a: Analysis): string {
  const s = a.strategy;
  if (!s) return "";
  return `STRATEGY\nStance: ${s.stance}. ${s.headline}\nPositioning: ${s.positioning.statement}\nWedge: ${s.positioning.wedge}\nMVP goal: ${s.mvp.goal}\nBuild first: ${s.mvp.buildFirst.map((x) => x.title).join("; ")}\nDon't build yet: ${s.mvp.dontBuildYet.map((x) => x.title).join("; ")}\nSuccess metric: ${s.mvp.successMetric}`;
}

export async function prd(idea: string, a: Analysis): Result<PrdOutput> {
  return completeStructured({
    tag: "prd",
    schema: PrdSchema,
    system: SYSTEM,
    temperature: 0.3,
    maxOutputTokens: 12_000,
    prompt: `ROLE: Senior Product Manager. Write a PRD for the MVP of this product, grounded in the analysis below. Scope it to the MVP the strategist defined; anything deferred belongs in out-of-scope. Requirements must be testable. Success metric targets are goals for the MVP, not claims about the market.

${ideaBlock(idea)}

${brief(a, ["understand", "research", "competitors", "feasibility", "risks", "critic"])}

${strategyBrief(a)}`,
  });
}

export async function blueprint(idea: string, a: Analysis): Result<BlueprintOutput> {
  return completeStructured({
    tag: "blueprint",
    schema: BlueprintSchema,
    system: SYSTEM,
    temperature: 0.3,
    maxOutputTokens: 12_000,
    prompt: `ROLE: Staff Engineer. Design a pragmatic high-level technical architecture for the MVP of this product, buildable by a small team. Favour boring, well-supported technology; justify every choice by this product's needs. Include AI components only if the product needs them, with guardrails. Layers go in order: client, api, ai, data, external (omit a layer that doesn't apply).

${ideaBlock(idea)}

${brief(a, ["understand", "feasibility", "risks"])}

${strategyBrief(a)}`,
  });
}
