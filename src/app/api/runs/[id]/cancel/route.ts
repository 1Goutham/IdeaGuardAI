import { NextResponse } from "next/server";
import { getRun } from "workflow/api";

export const runtime = "nodejs";

/** Stops a durable run. Steps already in flight finish; nothing new starts. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = getRun(id);
  if (!(await run.exists)) return NextResponse.json({ ok: false, error: { code: "invalid_request", message: "Run not found.", retryable: false } }, { status: 404 });
  await run.cancel();
  return NextResponse.json({ ok: true, data: { status: "cancelled" } });
}
