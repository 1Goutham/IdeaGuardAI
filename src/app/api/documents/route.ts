import { NextResponse } from "next/server";
import { blueprint, prd } from "@/lib/agents/agents";
import { DocumentRequestSchema } from "@/lib/ai/requests";
import { readBody, respond } from "@/lib/ai/route";
import type { Analysis } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/** On-demand documents built from a completed analysis: the PRD and the technical blueprint. */
export async function POST(req: Request) {
  const body = await readBody(req, DocumentRequestSchema, 10);
  if (body instanceof NextResponse) return body;
  const analysis = body.analysis as Analysis;
  if (!analysis.understand || !analysis.strategy) {
    return respond({ ok: false, error: { code: "invalid_request", message: "Finish the analysis before generating documents.", retryable: false } });
  }
  const res = body.kind === "prd" ? await prd(body.idea, analysis) : await blueprint(body.idea, analysis);
  return respond(res.ok ? { ok: true, data: { data: res.data.value, engine: res.data.engine } } : res);
}
