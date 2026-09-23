import { z } from "zod";
import { exactlyOneOf, level, list, oneOf, optText, sourceIds, strings, text } from "./primitives";

/**
 * Output contracts for each agent. These schemas are the single source of
 * truth: they are rendered into the prompt as JSON Schema, used to validate
 * the model's answer, and inferred into the app's TypeScript types.
 */

export const SIGNAL_KEYS = [
  "problemClarity",
  "differentiation",
  "competition",
  "technicalComplexity",
  "dataDependency",
  "marketUncertainty",
  "mvpComplexity",
] as const;

/** Strict: a signal with an unknown key is dropped rather than mislabelled. */
export const signalKey = exactlyOneOf(SIGNAL_KEYS);

const signal = z.object({
  key: signalKey.describe(`One of: ${SIGNAL_KEYS.join(", ")}`),
  level: level.describe("low | medium | high — the magnitude of this dimension, not whether it is good"),
  rationale: text("One or two sentences explaining why, referring to specifics of the idea"),
});

/* ------------------------------------------------------------------ */
/* 01 Understand                                                       */
/* ------------------------------------------------------------------ */

export const UnderstandSchema = z.object({
  title: text("A short, neutral working name for the project, 2–4 words. Not a brand pitch."),
  oneLiner: text("One sentence: what it is and for whom."),
  problem: text("The problem being solved, as experienced by the user."),
  targetUser: text("The specific primary user. Narrow is better than broad."),
  solution: text("What the product actually does."),
  valueProposition: text("Why the target user would choose it over what they do today."),
  category: text("Market category, e.g. 'Career services', 'Developer tools'."),
  productType: text("Form factor and model, e.g. 'B2C mobile app', 'B2B SaaS', 'API'."),
  differentiation: optText("What is claimed to be different. Empty if nothing is."),
  scope: optText("The scope as described: core features the user mentioned."),
  signals: list(signal, "Exactly one entry for each of the seven signal keys. A first read before research.", 7),
  unclear: strings("Important things the idea leaves ambiguous, phrased as short questions.", 5),
  searchPlan: z
    .object({
      market: strings("2 web search queries about market demand, size signals, trends or user complaints.", 3),
      competitors: strings("2 web search queries likely to surface existing products that solve this problem, e.g. 'best X apps', 'X alternatives'.", 3),
      context: strings("0–2 queries on relevant technology, pricing or regulation.", 2),
    })
    .describe("Queries a research agent will run. Specific, not generic."),
});

/* ------------------------------------------------------------------ */
/* 02 Research                                                         */
/* ------------------------------------------------------------------ */

export const FINDING_TOPICS = ["market", "demand", "pricing", "complaints", "technology", "regulation", "trend"] as const;

const finding = z.object({
  topic: oneOf(FINDING_TOPICS, "market").describe(FINDING_TOPICS.join(" | ")),
  headline: text("The finding in under 12 words."),
  detail: text("Two sentences at most. What was found and why it matters for this idea."),
  sourceIds,
  confidence: level.describe("How much weight this finding can bear."),
});

export const ResearchSchema = z.object({
  summary: text("Two or three sentences: what the research says about this space overall."),
  findings: list(finding, "4–8 findings. Prefer findings supported by sources.", 10),
  openQuestions: strings("What research could not answer and the founder should find out.", 5),
});

/* ------------------------------------------------------------------ */
/* 03 Competition                                                      */
/* ------------------------------------------------------------------ */

const competitor = z.object({
  name: text("Product or company name exactly as it appears in the sources."),
  url: optText("Homepage URL if present in the sources, otherwise empty."),
  kind: oneOf(["direct", "indirect", "substitute"] as const, "direct").describe("direct | indirect | substitute"),
  description: text("What it is, in one sentence."),
  audience: text("Who it serves."),
  offering: text("Its core offering."),
  pricing: optText("Pricing only if stated in the sources, e.g. 'Free; Pro $12/mo'. Empty if unknown."),
  strengths: strings("1–3 strengths.", 3),
  weaknesses: strings("1–3 weaknesses or gaps, especially ones users complain about.", 3),
  opportunity: text("Where the new idea could differentiate against this competitor."),
  sourceIds,
});

const axis = z.object({
  label: text("What the axis measures, e.g. 'Guidance'."),
  low: text("Label for the low end, e.g. 'Self-serve'."),
  high: text("Label for the high end, e.g. 'Coached'."),
});

export const CompetitorSchema = z.object({
  competitors: list(competitor, "3–6 competitors. Only products you can name with confidence.", 8),
  whitespace: text("Where the gap in the market appears to be, in two sentences."),
  axes: z
    .object({ x: axis, y: axis })
    .nullable()
    .catch(null)
    .describe("Two axes that genuinely separate these products. null if the descriptions don't support a meaningful map."),
  placements: list(
    z.object({ name: text("Competitor name, or 'Your idea'"), x: level, y: level }),
    "Coarse placement of each competitor and of 'Your idea' on the axes. Omit entries you can't justify.",
    9,
  ),
});

/* ------------------------------------------------------------------ */
/* 04 Feasibility                                                      */
/* ------------------------------------------------------------------ */

export const FeasibilitySchema = z.object({
  summary: text("Two sentences on how hard this is to build and why."),
  effort: z.object({ level, rationale: text("Why.") }).describe("Overall build effort for a small team."),
  components: list(
    z.object({
      name: text("Component name"),
      description: text("What it does"),
      complexity: level,
      approach: oneOf(["build", "buy", "integrate"] as const, "build").describe("build | buy | integrate"),
      note: optText("What makes it easy or hard."),
    }),
    "4–7 major technical components.",
    8,
  ),
  dataNeeds: list(
    z.object({
      need: text("Data the product needs"),
      availability: oneOf(["available", "obtainable", "hard"] as const, "obtainable").describe("available | obtainable | hard"),
      note: optText("Where it comes from or why it is hard."),
    }),
    "Data the product depends on.",
    6,
  ),
  hardestProblems: strings("The 2–3 genuinely hard technical problems.", 4),
  skills: strings("Skills the team needs.", 6),
});

/* ------------------------------------------------------------------ */
/* 05 Risks                                                            */
/* ------------------------------------------------------------------ */

export const RISK_CATEGORIES = ["market", "adoption", "technical", "legal", "privacy", "ethical", "operational", "financial"] as const;

export const RiskSchema = z.object({
  risks: list(
    z.object({
      title: text("Risk in under 10 words."),
      category: oneOf(RISK_CATEGORIES, "market").describe(RISK_CATEGORIES.join(" | ")),
      severity: level,
      likelihood: level,
      description: text("What could go wrong, specifically."),
      mitigation: text("A concrete mitigation."),
      sourceIds,
    }),
    "5–8 risks across categories.",
    10,
  ),
  regulations: list(
    z.object({
      name: text("Regulation or standard, e.g. 'GDPR', 'EU AI Act', 'HIPAA'."),
      jurisdiction: optText("Where it applies."),
      relevance: text("Why it applies to this idea, specifically."),
      sourceIds,
    }),
    "Only regulations that plausibly apply. Empty if none.",
    6,
  ),
});

/* ------------------------------------------------------------------ */
/* 06 Stress test                                                      */
/* ------------------------------------------------------------------ */

export const ASSUMPTION_CATEGORIES = ["desirability", "viability", "feasibility", "usability"] as const;

export const CriticSchema = z.object({
  assumptions: list(
    z.object({
      id: text('"A1", "A2", …'),
      statement: text("The assumption, phrased as something the founder believes, e.g. 'Students will trust AI to choose internships for them.'"),
      category: oneOf(ASSUMPTION_CATEGORIES, "desirability").describe(ASSUMPTION_CATEGORIES.join(" | ")),
      importance: level.describe("How much the idea depends on it."),
      evidence: oneOf(["none", "weak", "moderate", "strong"] as const, "none").describe("How much the research supports it: none | weak | moderate | strong"),
      whyItMayFail: text("The most credible reason it may be false."),
      howToTest: text("The cheapest way to find out."),
    }),
    "4–7 load-bearing assumptions, most important first.",
    8,
  ),
  biggestAssumptionId: text("ID of the single assumption that, if wrong, kills the idea."),
  counterpoints: list(
    z.object({
      claim: text("Something the idea implies or claims."),
      challenge: text("The sharpest honest challenge to it."),
    }),
    "2–4 direct challenges a sceptical investor or user would raise.",
    5,
  ),
  experiments: list(
    z.object({
      id: text('"E1", "E2", …'),
      assumptionId: text("Which assumption it tests."),
      title: text("Short name, e.g. 'Trust interviews'."),
      method: text("What to do, in one or two sentences."),
      expectedSignal: text("What you would observe if the assumption holds."),
      successCriteria: text("A concrete threshold decided in advance, e.g. '≥ 8 of 15 would act on the recommendation'."),
      effort: level,
      timeframe: text("e.g. '1 week'."),
    }),
    "One experiment for each of the 3–5 most important assumptions. Cheap, fast, falsifiable.",
    6,
  ),
});

/* ------------------------------------------------------------------ */
/* 07 Strategy                                                         */
/* ------------------------------------------------------------------ */

const scopeItem = z.object({ title: text("Feature or capability"), why: text("One sentence on why.") });

export const StrategySchema = z.object({
  stance: oneOf(["pursue", "refine", "rethink"] as const, "refine").describe(
    "pursue: worth building now · refine: promising but needs sharper focus first · rethink: core premise is weak",
  ),
  headline: text("The recommendation in one sentence."),
  reasoning: text("Three or four sentences weighing the evidence, the competition and the stress test."),
  signals: list(
    signal.extend({ sourceIds }),
    "The seven signals again, revised in light of the research and critique. One entry per key.",
    7,
  ),
  positioning: z.object({
    statement: text("For [user] who [need], [product] is a [category] that [benefit]. Unlike [alternative], it [difference]."),
    wedge: text("The narrow entry point to win first."),
  }),
  mvp: z.object({
    goal: text("What the MVP must prove."),
    buildFirst: list(scopeItem, "3–5 things to build first.", 5),
    dontBuildYet: list(scopeItem, "3–5 tempting things to explicitly defer.", 5),
    scope: text("The MVP scope in two sentences."),
    successMetric: text("The single metric that says the MVP worked."),
  }),
  nextSteps: strings("3–5 concrete next actions for the coming two weeks, in order.", 5),
  refinedIdea: text("A rewritten version of the idea, in the founder's voice, that addresses the biggest weaknesses found. 2–4 sentences."),
});

/* ------------------------------------------------------------------ */
/* On-demand documents                                                 */
/* ------------------------------------------------------------------ */

const priority = oneOf(["must", "should", "could"] as const, "should").describe("must | should | could");

export const PrdSchema = z.object({
  title: text("Document title"),
  summary: text("Two-sentence product summary."),
  problem: text("The problem statement, a short paragraph."),
  targetUsers: list(z.object({ segment: text("User segment"), needs: strings("Their key needs", 4) }), "1–3 target user segments.", 4),
  journeys: list(z.object({ name: text("Journey name"), steps: strings("4–6 steps", 7) }), "2–3 core user journeys.", 4),
  productRequirements: list(z.object({ id: text('"PR1"…'), requirement: text("Requirement"), priority }), "What the product must achieve for users.", 8),
  functionalRequirements: list(z.object({ id: text('"FR1"…'), requirement: text("Requirement"), priority }), "Specific system behaviours.", 12),
  nonFunctionalRequirements: list(z.object({ category: text("e.g. Performance, Privacy"), requirement: text("Requirement") }), "Quality attributes.", 8),
  aiRequirements: list(
    z.object({ capability: text("AI capability"), requirement: text("What it must do"), evaluation: text("How quality will be measured") }),
    "AI behaviour requirements. Empty if the product uses no AI.",
    6,
  ),
  dataRequirements: list(z.object({ entity: text("Data"), source: text("Where it comes from"), handling: text("Storage, retention, consent") }), "Data requirements.", 6),
  successMetrics: list(z.object({ metric: text("Metric"), target: text("Target for the MVP"), why: text("Why it matters") }), "3–5 success metrics.", 6),
  mvpScope: z.object({ inScope: strings("In scope", 8), outOfScope: strings("Out of scope", 8) }),
  openQuestions: strings("Unresolved product questions.", 6),
});

export const LAYER_IDS = ["client", "api", "ai", "data", "external"] as const;

export const BlueprintSchema = z.object({
  summary: text("Two sentences describing the architecture."),
  layers: list(
    z.object({
      id: oneOf(LAYER_IDS, "api").describe(LAYER_IDS.join(" | ")),
      name: text("Layer name, e.g. 'Frontend'."),
      items: list(z.object({ name: text("Component"), role: text("What it does, briefly") }), "2–5 items", 6),
    }),
    "The architecture as layers from client to external services, in order.",
    5,
  ),
  stack: list(z.object({ area: text("e.g. Frontend, Database"), choice: text("Technology"), why: text("Why it fits this product") }), "Suggested stack.", 10),
  apis: list(
    z.object({ method: oneOf(["GET", "POST", "PUT", "PATCH", "DELETE"] as const, "GET"), path: text("/api/…"), purpose: text("What it does") }),
    "Core API endpoints.",
    10,
  ),
  dataModel: list(z.object({ entity: text("Entity name"), fields: strings("Key fields", 8) }), "Core entities.", 8),
  dataFlow: strings("The main request path as 4–7 ordered steps.", 8),
  aiComponents: list(
    z.object({
      name: text("Component"),
      approach: text("Model or technique, e.g. 'LLM with retrieval', 'classifier'."),
      input: text("Input"),
      output: text("Output"),
      guardrails: text("How failures and misuse are contained"),
    }),
    "AI components. Empty if none.",
    6,
  ),
  risks: list(z.object({ risk: text("Technical risk"), mitigation: text("Mitigation") }), "3–5 technical risks.", 6),
});

export type UnderstandOutput = z.infer<typeof UnderstandSchema>;
export type ResearchOutput = z.infer<typeof ResearchSchema>;
export type CompetitorOutput = z.infer<typeof CompetitorSchema>;
export type FeasibilityOutput = z.infer<typeof FeasibilitySchema>;
export type RiskOutput = z.infer<typeof RiskSchema>;
export type CriticOutput = z.infer<typeof CriticSchema>;
export type StrategyOutput = z.infer<typeof StrategySchema>;
export type PrdOutput = z.infer<typeof PrdSchema>;
export type BlueprintOutput = z.infer<typeof BlueprintSchema>;
export type SignalKey = (typeof SIGNAL_KEYS)[number];
export type Level = "low" | "medium" | "high";
