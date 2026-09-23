import { NextResponse } from "next/server";
import { runAnalysis, type StageEvent } from "@/lib/agents/orchestrator";
import { AnalyseRequestSchema } from "@/lib/ai/requests";
import { readBody } from "@/lib/ai/route";
import type { Analysis } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Runs the analysis pipeline and streams progress as newline-delimited JSON.
 * Every event corresponds to real work: a stage starting, a search note, a
 * stage finishing with its data, or a stage failing.
 */
export async function POST(req: Request) {
  const body = await readBody(req, AnalyseRequestSchema, 12);
  if (body instanceof NextResponse) return body;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const emit = (event: StageEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true;
        }
      };
      try {
        await runAnalysis({ idea: body.idea, stages: body.stages, prior: body.prior as Analysis }, emit);
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
