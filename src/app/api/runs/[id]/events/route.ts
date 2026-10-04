import { getRun } from "workflow/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * The run's events as NDJSON, from `?from=<index>`. Each line is
 * `{ "i": <index>, "e": <StageEvent> }`, so a client that disconnects can
 * resume exactly where it stopped. The run itself is unaffected by
 * disconnects.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const from = Math.max(0, Number(new URL(req.url).searchParams.get("from")) || 0);
  const run = getRun(id);
  if (!(await run.exists)) return new Response(JSON.stringify({ ok: false, error: { code: "invalid_request", message: "Run not found.", retryable: false } }), { status: 404 });

  const encoder = new TextEncoder();
  let i = from;
  const body = run.getReadable({ startIndex: from }).pipeThrough(
    new TransformStream<unknown, Uint8Array>({
      transform(event, controller) {
        controller.enqueue(encoder.encode(`${JSON.stringify({ i: i++, e: event })}\n`));
      },
    }),
  );
  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
  });
}
