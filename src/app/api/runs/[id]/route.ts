import { NextResponse } from "next/server";
import { getRun } from "workflow/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Status of a durable run. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = getRun(id);
  if (!(await run.exists)) return NextResponse.json({ ok: false, error: { code: "invalid_request", message: "Run not found.", retryable: false } }, { status: 404 });
  return NextResponse.json({ ok: true, data: { status: await run.status } });
}
