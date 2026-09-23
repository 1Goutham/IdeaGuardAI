import type { Analysis, Basis } from "@/types";

/**
 * How much of the analysis rests on retrieved sources versus model
 * reasoning. A count, not a score: it tells the founder how much to trust
 * the report and where to look harder.
 */
export interface EvidenceTally {
  sourced: number;
  inferred: number;
  sources: number;
  verifiedCompetitors: number;
  unverifiedCompetitors: number;
}

export function tallyEvidence(a: Analysis): EvidenceTally {
  const bases: Basis[] = [
    ...(a.research?.findings.map((f) => f.basis) ?? []),
    ...(a.risks?.risks.map((r) => r.basis) ?? []),
    ...(a.risks?.regulations.map((r) => r.basis) ?? []),
    ...(a.strategy?.signals.map((s) => s.basis) ?? []),
  ];
  const competitors = a.competitors?.competitors ?? [];
  return {
    sourced: bases.filter((b) => b === "evidence").length,
    inferred: bases.filter((b) => b === "inference").length,
    sources: a.research?.sources.length ?? 0,
    verifiedCompetitors: competitors.filter((c) => c.verified).length,
    unverifiedCompetitors: competitors.filter((c) => !c.verified).length,
  };
}
