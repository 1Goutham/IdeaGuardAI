import { NextResponse } from "next/server";
import { checkRateLimit, clientKey } from "@/lib/ai/rateLimit";
import { createShare, sharingAvailable } from "@/lib/server/shares";
import { fail, parseReport } from "@/lib/server/shareRequest";

export const runtime = "nodejs";

/** Publishes a read-only copy of one report version. */
export async function POST(req: Request) {
  if (!sharingAvailable()) return fail(503, "Sharing needs a KV store. Add Vercel KV / Upstash Redis to this project to enable it.");
  if (!checkRateLimit(`share:${clientKey(req)}`, 10).allowed) return fail(429, "Too many shares in a minute. Try again shortly.");
  const body = await parseReport(req);
  if (body instanceof NextResponse) return body;
  const { id, token } = await createShare(body.report);
  return NextResponse.json({ ok: true, data: { id, token, path: `/r/${id}` } });
}

export async function GET() {
  return NextResponse.json({ ok: true, data: { available: sharingAvailable() } });
}
