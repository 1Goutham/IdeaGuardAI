import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import type { AiError, AiResponse } from "./contracts";
import { checkRateLimit, clientKey } from "./rateLimit";

const STATUS: Record<AiError["code"], number> = {
  not_configured: 503,
  invalid_request: 400,
  rate_limited: 429,
  timeout: 504,
  upstream: 502,
  blocked: 422,
  empty: 502,
  malformed: 502,
  network: 502,
};

const MAX_BODY = 1_000_000;

export function respond<T>(result: AiResponse<T>, headers?: HeadersInit): NextResponse {
  return NextResponse.json(result, { status: result.ok ? 200 : STATUS[result.error.code], headers });
}

function fail(code: AiError["code"], message: string, retryable = false, headers?: HeadersInit) {
  return respond({ ok: false, error: { code, message, retryable } }, headers);
}

/** Rate limit, size limit, JSON parse and schema validation. Returns the body or a ready response. */
export async function readBody<T>(req: Request, schema: z.ZodType<T>, limit: number): Promise<T | NextResponse> {
  const rl = checkRateLimit(clientKey(req), limit);
  if (!rl.allowed) {
    return fail("rate_limited", `Too many requests. Try again in ${rl.retryAfterSec}s.`, true, { "Retry-After": String(rl.retryAfterSec) });
  }
  const raw = await req.text();
  if (raw.length > MAX_BODY) return fail("invalid_request", "Request is too large.");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail("invalid_request", "Request body must be JSON.");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return fail("invalid_request", parsed.error.issues[0]?.message ?? "Invalid request.");
  return parsed.data;
}
