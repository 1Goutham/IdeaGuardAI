import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { MAX_SHARE_BYTES, SharedReportSchema, type SharedReport } from "@/lib/share";

/** Request parsing shared by the share routes. */

export const fail = (status: number, message: string) => NextResponse.json({ ok: false, error: { code: status === 429 ? "rate_limited" : "invalid_request", message, retryable: status >= 500 || status === 429 } }, { status });

export async function parseReport(req: Request): Promise<{ report: SharedReport; token?: string } | NextResponse> {
  const raw = await req.text();
  if (raw.length > MAX_SHARE_BYTES) return fail(413, "This report is too large to share.");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail(400, "Request body must be JSON.");
  }
  const parsed = z.object({ report: SharedReportSchema, token: z.string().max(200).optional() }).safeParse(json);
  if (!parsed.success) return fail(400, "That doesn't look like an IdeaGuard report.");
  return { report: parsed.data.report as unknown as SharedReport, token: parsed.data.token };
}

