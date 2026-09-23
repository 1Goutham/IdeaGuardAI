import "server-only";

/**
 * Small in-memory sliding-window limiter per client IP. Enough to stop
 * accidental hammering on a single instance; swap for a shared store
 * (Redis, Upstash) when running several.
 */
const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

export function checkRateLimit(key: string, limit: number): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { allowed: false, retryAfterSec: Math.ceil((WINDOW_MS - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return { allowed: true, retryAfterSec: 0 };
}

export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}
