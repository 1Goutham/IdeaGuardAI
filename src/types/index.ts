import type { AiErrorCode, AiErrorDetail } from "@/lib/ai/contracts";
import type {
  BlueprintOutput,
  CompetitorOutput,
  CriticOutput,
  FeasibilityOutput,
  Level,
  PrdOutput,
  ResearchOutput,
  RiskOutput,
  SignalKey,
  StrategyOutput,
  UnderstandOutput,
} from "@/lib/schemas/agents";

export type { Level, SignalKey };
export type {
  BlueprintOutput,
  CompetitorOutput,
  CriticOutput,
  FeasibilityOutput,
  PrdOutput,
  ResearchOutput,
  RiskOutput,
  StrategyOutput,
  UnderstandOutput,
};

/* ------------------------------------------------------------------ */
/* Evidence                                                            */
/* ------------------------------------------------------------------ */

/** A web page retrieved by the research layer. Never produced by a model. */
export interface Source {
  id: string; // "S1"
  title: string;
  url: string;
  domain: string;
  snippet: string;
  publishedAt: string | null;
  query: string;
}

/**
 * "evidence": at least one retrieved source supports it.
 * "inference": the model's reasoning, with no supporting source.
 */
export type Basis = "evidence" | "inference";

export type Grounded<T> = T & { basis: Basis };

/* ------------------------------------------------------------------ */
/* Stage results as stored (after grounding)                           */
/* ------------------------------------------------------------------ */

export type Finding = Grounded<ResearchOutput["findings"][number]>;

export interface ResearchResult extends Omit<ResearchOutput, "findings"> {
  findings: Finding[];
  sources: Source[];
  /** "live": a search provider ran. "offline": model knowledge only, nothing sourced. */
  mode: "live" | "offline";
  provider: string | null;
  queries: string[];
  researchedAt: string;
}

export type Competitor = CompetitorOutput["competitors"][number] & {
  /** True when at least one retrieved source mentions this product by name. */
  verified: boolean;
};

export interface CompetitorResult extends Omit<CompetitorOutput, "competitors"> {
  competitors: Competitor[];
}

export type Risk = Grounded<RiskOutput["risks"][number]>;
export type Regulation = Grounded<RiskOutput["regulations"][number]>;

export interface RiskResult {
  risks: Risk[];
  regulations: Regulation[];
}

export type Signal = UnderstandOutput["signals"][number];
export type RevisedSignal = Grounded<StrategyOutput["signals"][number]>;

export interface StrategyResult extends Omit<StrategyOutput, "signals"> {
  signals: RevisedSignal[];
}

/**
 * Sources gathered for this run. Kept separately from the research synthesis
 * so that if synthesis fails, agents that cite sources still have them and
 * the citations still resolve in the report.
 */
export interface SourceSet {
  items: Source[];
  provider: string | null;
  queries: string[];
  gatheredAt: string;
  /** Search queries that errored, if any. */
  failedQueries: number;
}

export interface Analysis {
  sources?: SourceSet;
  understand?: UnderstandOutput;
  research?: ResearchResult;
  competitors?: CompetitorResult;
  feasibility?: FeasibilityOutput;
  risks?: RiskResult;
  critic?: CriticOutput;
  strategy?: StrategyResult;
}

/* ------------------------------------------------------------------ */
/* Pipeline                                                            */
/* ------------------------------------------------------------------ */

export const STAGE_IDS = ["understand", "research", "competitors", "feasibility", "risks", "critic", "strategy"] as const;
export type StageId = (typeof STAGE_IDS)[number];

export type StageStatus = "idle" | "queued" | "running" | "done" | "error";

/** How a stage was produced, for the technical layer of "How this was produced". */
export interface StageTrace {
  provider: string;
  model: string;
  /** Provider requests, including rate-limit retries and the repair pass. */
  calls: number;
  waitedMs: number;
  repaired: boolean;
  inputTokens: number;
  outputTokens: number;
  reasoning?: string;
}

export interface StageState {
  status: StageStatus;
  error?: string;
  errorCode?: AiErrorCode;
  errorDetail?: AiErrorDetail;
  startedAt?: string;
  finishedAt?: string;
  /** Engine that produced the result, e.g. "Google Gemini · gemini-2.5-flash". */
  engine?: string;
  /** Short factual note shown in progress, e.g. "14 sources". */
  note?: string;
  trace?: StageTrace;
  /** Optional inputs that were unavailable when this stage ran. */
  missingInputs?: StageId[];
}

export type StageMap = Record<StageId, StageState>;

/* ------------------------------------------------------------------ */
/* Workspace                                                           */
/* ------------------------------------------------------------------ */

export type ExperimentStatus = "unknown" | "testing" | "validated" | "invalidated";

export interface ExperimentState {
  status: ExperimentStatus;
  result: string;
  updatedAt: string;
}

export interface GeneratedDoc<T> {
  data: T;
  generatedAt: string;
  engine?: string;
}

export type DocKind = "prd" | "blueprint";

export interface IdeaVersion {
  id: string;
  number: number;
  idea: string;
  /** What the founder changed and why, optional. */
  note: string;
  createdAt: string;
  analysis: Analysis;
  stages: StageMap;
  experiments: Record<string, ExperimentState>;
  prd?: GeneratedDoc<PrdOutput>;
  blueprint?: GeneratedDoc<BlueprintOutput>;
}

export interface Project {
  id: string;
  /** Owner seam for future accounts; "local" until auth exists. */
  ownerId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  currentVersionId: string;
  versions: IdeaVersion[];
}
