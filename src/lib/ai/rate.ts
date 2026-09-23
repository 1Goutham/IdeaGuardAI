import type { RateInfo } from "./providers/types";

/**
 * Parsing rate-limit signals. Providers express "wait" in several ways:
 * a `retry-after` header in seconds, `x-ratelimit-reset-tokens: 7.66s`
 * or `1m2.5s`, or prose like "Please try again in 12.3s".
 */

export function parseDuration(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (/^\d+(\.\d+)?$/.test(v)) return Math.round(Number(v) * 1000);
  let ms = 0;
  let matched = false;
  for (const [, n, unit] of v.matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)) {
    matched = true;
    const x = Number(n);
    ms += unit === "h" ? x * 3_600_000 : unit === "m" ? x * 60_000 : unit === "s" ? x * 1000 : x;
  }
  return matched ? Math.round(ms) : undefined;
}

export function retryAfterFromText(text: string): number | undefined {
  const m = /try again in ((?:\d+(?:\.\d+)?(?:ms|h|m|s))+)/i.exec(text);
  return m ? parseDuration(m[1]) : undefined;
}

export function rateFromHeaders(h: Headers, bodyText = ""): RateInfo {
  const num = (k: string) => {
    const v = h.get(k);
    return v && /^\d+$/.test(v) ? Number(v) : undefined;
  };
  return {
    limitTokens: num("x-ratelimit-limit-tokens"),
    remainingTokens: num("x-ratelimit-remaining-tokens"),
    resetMs: parseDuration(h.get("x-ratelimit-reset-tokens")),
    retryAfterMs: parseDuration(h.get("retry-after")) ?? retryAfterFromText(bodyText),
  };
}

/** Rough token estimate: good enough for scheduling, never used for billing. */
export const estimateTokens = (text: string) => Math.ceil(text.length / 4);
