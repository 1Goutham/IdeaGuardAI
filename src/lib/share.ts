import { z } from "zod";
import type { IdeaVersion, Project } from "@/types";

/**
 * What a shared report contains: one version of one project, without
 * anything private to this browser (experiment notes, run state, the
 * share's own token). Client-safe.
 */
export interface SharedReport {
  schema: 1;
  title: string;
  version: Pick<IdeaVersion, "number" | "idea" | "createdAt" | "analysis" | "stages" | "prd" | "blueprint"> & {
    experiments: Record<string, { status: IdeaVersion["experiments"][string]["status"] }>;
  };
  sharedAt: string;
}

export function toSharedReport(project: Project, v: IdeaVersion): SharedReport {
  return {
    schema: 1,
    title: project.title,
    sharedAt: new Date().toISOString(),
    version: {
      number: v.number,
      idea: v.idea,
      createdAt: v.createdAt,
      analysis: v.analysis,
      stages: v.stages,
      prd: v.prd,
      blueprint: v.blueprint,
      // Statuses are part of the story; free-text results may be private.
      experiments: Object.fromEntries(Object.entries(v.experiments).map(([id, e]) => [id, { status: e.status }])),
    },
  };
}

/** A stable fingerprint of what would be published, to tell whether a share is out of date. */
export function shareHash(v: IdeaVersion): string {
  const s = JSON.stringify([v.analysis, v.stages, v.prd?.generatedAt, v.blueprint?.generatedAt, Object.entries(v.experiments).map(([k, e]) => [k, e.status])]);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export const MAX_SHARE_BYTES = 900_000;

/** Shape check for incoming reports. Contents are this app's own data, so the check is structural. */
export const SharedReportSchema = z.object({
  schema: z.literal(1),
  title: z.string().min(1).max(200),
  sharedAt: z.string().max(40),
  version: z.object({
    number: z.number().int().min(1).max(999),
    idea: z.string().min(1).max(6000),
    createdAt: z.string().max(40),
    analysis: z.record(z.string(), z.unknown()),
    stages: z.record(z.string(), z.unknown()),
    prd: z.unknown().optional(),
    blueprint: z.unknown().optional(),
    experiments: z.record(z.string(), z.object({ status: z.enum(["unknown", "testing", "validated", "invalidated"]) })),
  }),
});
