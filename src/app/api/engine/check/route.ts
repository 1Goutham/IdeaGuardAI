import { NextResponse } from "next/server";
import { connectionCheck } from "@/lib/ai/check";
import { checkRateLimit, clientKey } from "@/lib/ai/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Live check: one tiny request per configured provider. Rate limited; costs a few hundred tokens. */
export async function POST(req: Request) {
  const limit = checkRateLimit(`check:${clientKey(req)}`, 4);
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, error: { code: "rate_limited", message: `Checked recently. Try again in ${limit.retryAfterSec}s.`, retryable: true } }, { status: 429 });
  }
  return NextResponse.json({ ok: true, data: await connectionCheck() });
}
