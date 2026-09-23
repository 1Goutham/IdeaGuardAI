import { z } from "zod";
import { STAGE_IDS } from "@/types";

/** Request bodies accepted by the API routes. Shared so the client builds the same shape. */

export const IDEA_MIN = 20;
export const IDEA_MAX = 6000;

const idea = z
  .string()
  .trim()
  .min(IDEA_MIN, `Describe the idea in at least ${IDEA_MIN} characters.`)
  .max(IDEA_MAX, `Keep the idea under ${IDEA_MAX} characters.`);

/** Earlier stage results. Produced by this app; shape-checked loosely and bounded in size. */
const prior = z.record(z.string(), z.unknown()).default({});

export const AnalyseRequestSchema = z.object({
  idea,
  stages: z.array(z.enum(STAGE_IDS)).min(1).max(STAGE_IDS.length),
  prior,
});
export type AnalyseRequest = z.infer<typeof AnalyseRequestSchema>;

export const DocumentRequestSchema = z.object({
  kind: z.enum(["prd", "blueprint"]),
  idea,
  analysis: prior,
});
export type DocumentRequest = z.infer<typeof DocumentRequestSchema>;
