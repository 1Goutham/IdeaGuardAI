import type { DocKind, StageId } from "@/types";

export interface NavItem {
  slug: string;
  label: string;
  /** The pipeline stage whose output this section shows. */
  stage?: StageId;
  doc?: DocKind;
}

export const NAV: NavItem[] = [
  { slug: "", label: "Overview" },
  { slug: "research", label: "Research", stage: "research" },
  { slug: "competition", label: "Competition", stage: "competitors" },
  { slug: "feasibility", label: "Feasibility", stage: "feasibility" },
  { slug: "risks", label: "Risks", stage: "risks" },
  { slug: "stress-test", label: "Stress test", stage: "critic" },
  { slug: "experiments", label: "Experiments", stage: "critic" },
  { slug: "mvp", label: "MVP", stage: "strategy" },
  { slug: "prd", label: "PRD", doc: "prd" },
  { slug: "architecture", label: "Architecture", doc: "blueprint" },
];

export const sectionIndex = (slug: string) => String(NAV.findIndex((n) => n.slug === slug) + 1).padStart(2, "0");
