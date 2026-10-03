import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { AnalyseRequestSchema } from "@/lib/ai/requests";
import { readBody } from "@/lib/ai/route";
import type { Analysis } from "@/types";
import { analysisWorkflow } from "@/workflows/analysis";

export const runtime = "nodejs";

/** Starts a durable analysis run and returns its ID. Progress is read from /api/runs/[id]/events. */
export async function POST(req: Request) {
  const body = await readBody(req, AnalyseRequestSchema, 12);
  if (body instanceof NextResponse) return body;
  const run = await start(analysisWorkflow, [{ idea: body.idea, stages: body.stages, prior: body.prior as Analysis }]);
  return NextResponse.json({ ok: true, data: { runId: run.runId } });
}
