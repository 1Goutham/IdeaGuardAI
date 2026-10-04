import "server-only";
import type { RateInfo } from "./providers/types";

/**
 * Per-provider token budget.
 *
 * Free tiers limit tokens per minute (Groq's gpt-oss-120b: 8,000). Several
 * agents running at once can each be small and still exceed that together,
 * which is what made the downstream agents fail. The budget keeps a rolling
 * one-minute window of reserved tokens and makes a caller wait for room
 * instead of sending a request that is certain to be rejected. Agents still
 * run concurrently whenever the window allows it.
 *
 * The limit is learned from `x-ratelimit-limit-tokens` on every response,
 * so paid tiers with higher limits are throttled only until the first reply.
 */

const WINDOW_MS = 60_000;
const HEADROOM = 0.92;

interface Entry {
  at: number;
  tokens: number;
}

export interface Reservation {
  /** Replace the estimate with what the provider actually counted. */
  settle(actualTokens?: number): void;
  waitedMs: number;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    });
  });

export class TokenBudget {
  private entries: Entry[] = [];
  private blockedUntil = 0;

  constructor(private limit?: number) {}

  private used(now: number): number {
    this.entries = this.entries.filter((e) => now - e.at < WINDOW_MS);
    return this.entries.reduce((n, e) => n + e.tokens, 0);
  }

  /** Wait until `tokens` fit in the window. Returns null if the deadline would pass first. */
  async reserve(tokens: number, deadline: number, signal?: AbortSignal): Promise<Reservation | null> {
    const started = Date.now();
    for (;;) {
      if (signal?.aborted) return null;
      const now = Date.now();
      let waitMs = 0;
      if (now < this.blockedUntil) {
        waitMs = this.blockedUntil - now;
      } else if (this.limit) {
        const used = this.used(now);
        // A request bigger than the whole window can still go when the window is empty.
        if (used > 0 && used + tokens > this.limit * HEADROOM) {
          const oldest = this.entries[0];
          waitMs = oldest ? oldest.at + WINDOW_MS - now + 250 : 1000;
        }
      }
      if (waitMs <= 0) {
        const entry: Entry = { at: now, tokens };
        this.entries.push(entry);
        return {
          waitedMs: now - started,
          settle: (actual) => {
            if (actual !== undefined && actual >= 0) entry.tokens = actual;
          },
        };
      }
      if (now + waitMs > deadline) return null;
      await sleep(Math.min(waitMs, 15_000), signal);
    }
  }

  /** Update from what the provider reported. */
  learn(rate: RateInfo | undefined) {
    if (!rate) return;
    if (rate.limitTokens) this.limit = rate.limitTokens;
    if (rate.retryAfterMs) this.blockedUntil = Math.max(this.blockedUntil, Date.now() + rate.retryAfterMs);
  }
}

const budgets = new Map<string, TokenBudget>();

export function budgetFor(key: string, initialLimit?: number): TokenBudget {
  let b = budgets.get(key);
  if (!b) {
    b = new TokenBudget(initialLimit);
    budgets.set(key, b);
  }
  return b;
}

export { sleep };
