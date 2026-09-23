import type { Level, SignalKey } from "@/types";

/**
 * Signals are levels, not scores. A level only means something alongside
 * which direction helps the founder, so each dimension carries its polarity.
 * No numbers are derived or averaged: a "total score" would imply a
 * precision the underlying judgement doesn't have.
 */

export interface SignalMeta {
  label: string;
  question: string;
  /** "up": a higher level helps the idea. "down": a higher level works against it. */
  polarity: "up" | "down";
}

export const SIGNAL_META: Record<SignalKey, SignalMeta> = {
  problemClarity: { label: "Problem clarity", question: "Is a real, specific problem defined?", polarity: "up" },
  differentiation: { label: "Differentiation", question: "How distinct is it from obvious alternatives?", polarity: "up" },
  competition: { label: "Competition", question: "How crowded is the space?", polarity: "down" },
  technicalComplexity: { label: "Technical complexity", question: "How hard is it to build well?", polarity: "down" },
  dataDependency: { label: "Data dependency", question: "How much does it rely on data you must acquire?", polarity: "down" },
  marketUncertainty: { label: "Market uncertainty", question: "How unproven are demand and willingness to pay?", polarity: "down" },
  mvpComplexity: { label: "MVP complexity", question: "How hard is a credible first version?", polarity: "down" },
};

export const LEVEL_LABEL: Record<Level, string> = { low: "Low", medium: "Medium", high: "High" };
export const LEVEL_RANK: Record<Level, number> = { low: 1, medium: 2, high: 3 };

export type Tone = "favourable" | "mixed" | "unfavourable";

export function signalTone(key: SignalKey, level: Level): Tone {
  if (level === "medium") return "mixed";
  const good = SIGNAL_META[key].polarity === "up" ? level === "high" : level === "low";
  return good ? "favourable" : "unfavourable";
}

export const TONE_LABEL: Record<Tone, string> = {
  favourable: "In your favour",
  mixed: "Mixed",
  unfavourable: "Against you",
};
