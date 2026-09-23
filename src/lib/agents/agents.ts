import "server-only";
import { generateStructured, type CallTrace } from "@/lib/ai/engine";
import type { AiResponse } from "@/lib/ai/contracts";
import type { ReasoningEffort } from "@/lib/ai/providers/types";
import { groundItems, verifyCompetitor } from "@/lib/research/grounding";
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
  CompetitorOutput,
  CompetitorResult,
  CriticOutput,
  FeasibilityOutput,
  PrdOutput,
  ResearchOutput,
  ResearchResult,
  RiskOutput,
  RiskResult,
  SourceSet,
  StageId,
  StrategyOutput,
  StrategyResult,
  UnderstandOutput,
} from "@/types";
import {
  competitorDigest,
  criticDigest,
  feasibilityDigest,
  ideaCard,
  join,
  pickSources,
  researchDigest,
  riskDigest,
  sourcesBlock,
  unavailableBlock,
} from "./context";
import { ideaBlock, SYSTEM, today } from "./prompts";

/**
 * The agents. Each one is a single structured call with a narrow role, a
 * compact context built for that role, a zod contract, and post-processing
 * that enforces evidence rules in code.
 */

export interface AgentContext {
  idea: string;
  analysis: Analysis;
  /** Sources gathered for this run (may exist even if research synthesis failed). */
  sources: SourceSet | undefined;
  /** Optional inputs that are unavailable for this agent. */
  missing: StageId[];
  deadline: number;
  signal?: AbortSignal;
  /** Progress hook for rate-limit waits. */
  onWait?: (reason: "capacity" | "rate_limited", ms?: number) => void;
}

export type AgentResult<T> = AiResponse<{ value: T; trace: CallTrace }>;

/** Output and reasoning budgets per agent: enough room, no waste of a free-tier token budget. */
const BUDGET: Record<string, { out: number; reasoning: ReasoningEffort }> = {
  understand: { out: 2500, reasoning: "low" },
  research: { out: 2500, reasoning: "low" },
  competitors: { out: 3000, reasoning: "low" },
  feasibility: { out: 2200, reasoning: "low" },
  risks: { out: 2400, reasoning: "low" },
  critic: { out: 3000, reasoning: "medium" },
  strategy: { out: 3500, reasoning: "medium" },
  prd: { out: 5000, reasoning: "medium" },
  blueprint: { out: 5000, reasoning: "medium" },
};

function run<T>(tag: string, ctx: Pick<AgentContext, "deadline" | "signal" | "onWait">, schema: Parameters<typeof generateStructured<T>>[0]["schema"], prompt: string, temperature = 0.3) {
  return generateStructured<T>({
    tag,
    schema,
    system: SYSTEM,
    prompt,
    temperature,
    maxOutputTokens: BUDGET[tag].out,
    reasoning: BUDGET[tag].reasoning,
    deadline: ctx.deadline,
    signal: ctx.signal,
    onWait: ctx.onWait,
  });
}

function map<A, B>(res: AgentResult<A>, fn: (a: A) => B): AgentResult<B> {
  return res.ok ? { ok: true, data: { value: fn(res.data.value), trace: res.data.trace } } : res;
}

const items = (ctx: AgentContext) => ctx.sources?.items ?? [];

/* 01 Idea Analyst ----------------------------------------------------- */

export async function understand(ctx: AgentContext): Promise<AgentResult<UnderstandOutput>> {
  const res = await run<UnderstandOutput>(
    "understand",
    ctx,
    UnderstandSchema,
    `ROLE: Idea Analyst. Restate the founder's idea precisely, as a sharp product manager would after a first conversation. Where the idea is vague, choose the most plausible specific reading and list what remains ambiguous under "unclear".

Then give a first-read signal for each of these seven dimensions (level = magnitude, not quality):
- problemClarity: how clearly a real, specific problem is defined
- differentiation: how distinct the solution is from obvious alternatives
- competition: how crowded the space likely is
- technicalComplexity: how hard it is to build well
- dataDependency: how much it relies on data that must be acquired, labelled or kept fresh
- marketUncertainty: how unproven demand and willingness to pay are
- mvpComplexity: how hard a credible first version is

Finally, plan the web research: specific search queries a researcher should run. Today is ${today()}.

${ideaBlock(ctx.idea)}`,
  );
  // One signal per key, in a stable order.
  return map(res, (v) => {
    const byKey = new Map(v.signals.map((s) => [s.key, s]));
    return { ...v, signals: SIGNAL_KEYS.map((k) => byKey.get(k)).filter((s): s is NonNullable<typeof s> => !!s) };
  });
}

export function researchQueries(u: UnderstandOutput): string[] {
  return [...u.searchPlan.market, ...u.searchPlan.competitors, ...u.searchPlan.context];
}

/* 02 Research Agent --------------------------------------------------- */

export async function research(ctx: AgentContext): Promise<AgentResult<ResearchResult>> {
  const all = items(ctx);
  const live = all.length > 0;
  // Synthesis sees most sources, but short.
  const shown = pickSources(all, { max: 18, snippet: 320 });
  const res = await run<ResearchOutput>(
    "research",
    ctx,
    ResearchSchema,
    join(
      `ROLE: Research Agent. Synthesise what is known about the market this idea enters: demand, trends, pricing norms, user complaints about existing solutions, enabling technology and regulation.`,
      live
        ? "Base findings on the numbered sources. Cite the IDs that directly support each finding. A finding you cannot tie to a source is allowed only if clearly useful; give it an empty sourceIds array and low confidence."
        : "No web sources are available for this run. Give 3–5 findings from well-established general knowledge only, each with an empty sourceIds array and at most medium confidence. Do not state specific numbers.",
      `Today is ${today()}. Prefer recent information.`,
      ideaBlock(ctx.idea),
      ideaCard(ctx.analysis),
      sourcesBlock(shown, 320),
    ),
    0.2,
  );
  return map(res, (v) => ({
    ...v,
    findings: groundItems(v.findings, all),
    sources: all,
    mode: live ? "live" : "offline",
    provider: ctx.sources?.provider ?? null,
    queries: ctx.sources?.queries ?? [],
    researchedAt: new Date().toISOString(),
  }));
}

/* 03 Competitor Agent ------------------------------------------------- */

export async function competitors(ctx: AgentContext): Promise<AgentResult<CompetitorResult>> {
  const all = items(ctx);
  const plan = ctx.analysis.understand?.searchPlan.competitors ?? [];
  const shown = pickSources(all, { queries: plan, max: 10, snippet: 380 });
  const res = await run<CompetitorOutput>(
    "competitors",
    ctx,
    CompetitorSchema,
    join(
      `ROLE: Competitor Agent. Identify the existing products this idea would compete with, including indirect alternatives and substitutes (what users do today instead).`,
      shown.length
        ? "Only include products that are named in the sources below, and cite the sources that describe them. Take pricing only from the sources; otherwise leave it empty."
        : "No web sources are available for this run. Include only widely known products you are highly confident exist; they will be shown to the user as unverified. Leave pricing empty. Fewer is better than wrong.",
      `For the positioning map, pick two axes that genuinely separate these products, and place each competitor and "Your idea" coarsely (low / medium / high). Return axes: null if a map would be misleading.`,
      ideaBlock(ctx.idea),
      ideaCard(ctx.analysis),
      researchDigest(ctx.analysis, { topics: ["complaints", "pricing", "market"], max: 4 }),
      unavailableBlock(ctx.missing),
      sourcesBlock(shown, 380),
    ),
    0.2,
  );
  return map(res, (v) => {
    // Verify against every gathered source, not only those shown, so a correct name is never penalised.
    const verified = v.competitors.map((c) => verifyCompetitor(c, all));
    const names = new Set([...verified.map((c) => c.name.toLowerCase()), "your idea"]);
    return { ...v, competitors: verified, placements: v.axes ? v.placements.filter((p) => names.has(p.name.toLowerCase())) : [] };
  });
}

/* 04 Feasibility Agent ------------------------------------------------ */

export async function feasibility(ctx: AgentContext): Promise<AgentResult<FeasibilityOutput>> {
  return run<FeasibilityOutput>(
    "feasibility",
    ctx,
    FeasibilitySchema,
    join(
      `ROLE: Feasibility Agent. Assess how this could be built by a small team today: the major components, what to build versus buy or integrate, the data it depends on and how obtainable that data is, and the genuinely hard problems. Be concrete about technology; avoid generic advice.`,
      ideaBlock(ctx.idea),
      ideaCard(ctx.analysis),
      researchDigest(ctx.analysis, { topics: ["technology", "regulation", "complaints"], max: 4 }),
      unavailableBlock(ctx.missing),
    ),
  );
}

/* 05 Risk & Governance Agent ----------------------------------------- */

export async function risks(ctx: AgentContext): Promise<AgentResult<RiskResult>> {
  const all = items(ctx);
  const relevant = ctx.analysis.research?.findings.filter((f) => ["regulation", "complaints", "market"].includes(f.topic)).flatMap((f) => f.sourceIds) ?? [];
  const shown = pickSources(all, { ids: relevant, queries: ctx.analysis.understand?.searchPlan.context, max: 6, snippet: 240 });
  const res = await run<RiskOutput>(
    "risks",
    ctx,
    RiskSchema,
    join(
      `ROLE: Risk & Governance Agent. Identify the risks that could sink this product: market, adoption, technical, legal, privacy, ethical (bias, misuse, over-reliance on AI), operational and financial. Rate severity and likelihood honestly; not everything is high. List regulations only where they plausibly apply to this specific idea, and say why.`,
      "Cite a source ID only when a source below directly supports the risk or regulation.",
      ideaBlock(ctx.idea),
      ideaCard(ctx.analysis),
      researchDigest(ctx.analysis, { max: 6 }),
      unavailableBlock(ctx.missing),
      sourcesBlock(shown, 240),
    ),
  );
  return map(res, (v) => ({ risks: groundItems(v.risks, all), regulations: groundItems(v.regulations, all) }));
}

/* 06 Critic ------------------------------------------------------------ */

export async function critic(ctx: AgentContext): Promise<AgentResult<CriticOutput>> {
  const res = await run<CriticOutput>(
    "critic",
    ctx,
    CriticSchema,
    join(
      `ROLE: Critic. Stress-test this idea the way a sharp, fair investor or a sceptical target user would. Do not summarise; challenge.

1. List the load-bearing assumptions: things that must be true for this to work. Phrase each as the founder's belief. Judge how much the research actually supports each (evidence: none / weak / moderate / strong). If research is unavailable, evidence is "none".
2. Name the single biggest assumption: the one that, if false, kills the idea.
3. Give direct counterpoints to the idea's claims.
4. Design one cheap, fast, falsifiable experiment for each of the most important assumptions, with a success threshold decided in advance. Prefer interviews, landing pages, concierge tests and prototypes over building the product.`,
      ideaBlock(ctx.idea),
      ideaCard(ctx.analysis),
      researchDigest(ctx.analysis, { max: 6 }),
      competitorDigest(ctx.analysis),
      feasibilityDigest(ctx.analysis),
      riskDigest(ctx.analysis),
      unavailableBlock(ctx.missing),
    ),
    0.5,
  );
  return map(res, (v) => {
    const ids = new Set(v.assumptions.map((x) => x.id));
    return {
      ...v,
      biggestAssumptionId: ids.has(v.biggestAssumptionId) ? v.biggestAssumptionId : (v.assumptions[0]?.id ?? ""),
      experiments: v.experiments.filter((e) => ids.has(e.assumptionId)),
    };
  });
}

/* 07 Product Strategist ------------------------------------------------ */

export async function strategy(ctx: AgentContext): Promise<AgentResult<StrategyResult>> {
  const all = items(ctx);
  const cited = new Set(ctx.analysis.research?.findings.flatMap((f) => f.sourceIds) ?? []);
  const shown = pickSources(all, { ids: [...cited], max: 12, snippet: 0 });
  const firstRead = ctx.analysis.understand?.signals.map((s) => `${s.key}: ${s.level}`).join(", ") ?? "";
  const res = await run<StrategyOutput>(
    "strategy",
    ctx,
    StrategySchema,
    join(
      `ROLE: Product Strategist. Weigh what the other agents found and decide what the founder should do next.

- stance: pursue, refine or rethink. Be decisive and explain the trade-off, based only on the inputs below.
- Revise the seven signals in light of the research, competition and critique (first read was: ${firstRead}). Cite source IDs where a signal is supported by a source.
- Positioning: a sharp statement and the narrow wedge to win first.
- MVP: the smallest thing that tests the biggest assumption. Be ruthless about what not to build yet; name tempting features explicitly.
- refinedIdea: rewrite the idea so it addresses the biggest weaknesses found, in the founder's voice.`,
      ideaBlock(ctx.idea),
      ideaCard(ctx.analysis),
      researchDigest(ctx.analysis, { max: 6 }),
      competitorDigest(ctx.analysis),
      feasibilityDigest(ctx.analysis),
      riskDigest(ctx.analysis),
      criticDigest(ctx.analysis),
      unavailableBlock(ctx.missing),
      sourcesBlock(shown, 0),
    ),
    0.4,
  );
  return map(res, (v) => {
    const byKey = new Map(v.signals.map((s) => [s.key, s]));
    const ordered = SIGNAL_KEYS.map((k) => byKey.get(k)).filter((s): s is NonNullable<typeof s> => !!s);
    return { ...v, signals: groundItems(ordered, all) };
  });
}

/* Documents ------------------------------------------------------------- */

function strategyBrief(a: Analysis): string {
  const s = a.strategy;
  if (!s) return "";
  return `STRATEGY\nStance: ${s.stance}. ${s.headline}\nPositioning: ${s.positioning.statement}\nWedge: ${s.positioning.wedge}\nMVP goal: ${s.mvp.goal}\nBuild first: ${s.mvp.buildFirst.map((x) => x.title).join("; ")}\nDon't build yet: ${s.mvp.dontBuildYet.map((x) => x.title).join("; ")}\nSuccess metric: ${s.mvp.successMetric}`;
}

const docDeadline = () => ({ deadline: Date.now() + 110_000 });

export async function prd(idea: string, a: Analysis): Promise<AgentResult<PrdOutput>> {
  return run<PrdOutput>(
    "prd",
    docDeadline(),
    PrdSchema,
    join(
      `ROLE: Senior Product Manager. Write a PRD for the MVP of this product, grounded in the analysis below. Scope it to the MVP the strategist defined; anything deferred belongs in out-of-scope. Requirements must be testable. Success metric targets are goals for the MVP, not claims about the market.`,
      ideaBlock(idea),
      ideaCard(a),
      researchDigest(a, { max: 5 }),
      competitorDigest(a),
      riskDigest(a),
      criticDigest(a),
      strategyBrief(a),
    ),
  );
}

export async function blueprint(idea: string, a: Analysis): Promise<AgentResult<BlueprintOutput>> {
  return run<BlueprintOutput>(
    "blueprint",
    docDeadline(),
    BlueprintSchema,
    join(
      `ROLE: Staff Engineer. Design a pragmatic high-level technical architecture for the MVP of this product, buildable by a small team. Favour boring, well-supported technology; justify every choice by this product's needs. Include AI components only if the product needs them, with guardrails. Layers go in order: client, api, ai, data, external (omit a layer that doesn't apply).`,
      ideaBlock(idea),
      ideaCard(a),
      feasibilityDigest(a),
      riskDigest(a),
      strategyBrief(a),
    ),
  );
}
