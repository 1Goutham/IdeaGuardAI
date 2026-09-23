import { describe, expect, it } from "vitest";
import { TokenBudget } from "./budget";
import { sanitize } from "./contracts";
import { parseDuration, rateFromHeaders, retryAfterFromText } from "./rate";
import { plain } from "@/lib/schemas/primitives";

describe("rate-limit parsing", () => {
  it("reads Groq's duration formats", () => {
    expect(parseDuration("2")).toBe(2000);
    expect(parseDuration("7.66s")).toBe(7660);
    expect(parseDuration("1m2.5s")).toBe(62_500);
    expect(parseDuration("250ms")).toBe(250);
    expect(retryAfterFromText("Please try again in 12.3s.")).toBe(12_300);
  });

  it("collects limit and retry information from headers", () => {
    const h = new Headers({ "x-ratelimit-limit-tokens": "8000", "x-ratelimit-remaining-tokens": "120", "x-ratelimit-reset-tokens": "7.66s", "retry-after": "3" });
    expect(rateFromHeaders(h)).toEqual({ limitTokens: 8000, remainingTokens: 120, resetMs: 7660, retryAfterMs: 3000 });
  });
});

describe("TokenBudget", () => {
  it("lets requests through while they fit and holds the next one until the window frees", async () => {
    const b = new TokenBudget(1000);
    const first = await b.reserve(500, Date.now() + 5_000);
    const second = await b.reserve(400, Date.now() + 5_000);
    expect(first && second).toBeTruthy();
    // 500 + 400 + 300 exceeds 92% of 1000 and the window won't free within 2s.
    expect(await b.reserve(300, Date.now() + 2_000)).toBeNull();
  });

  it("releases the reservation of a request that generated nothing", async () => {
    const b = new TokenBudget(1000);
    const r = await b.reserve(800, Date.now() + 1_000);
    r!.settle(0);
    expect(await b.reserve(800, Date.now() + 1_000)).not.toBeNull();
  });

  it("honours a provider's retry-after for everyone", async () => {
    const b = new TokenBudget();
    b.learn({ retryAfterMs: 5_000 });
    expect(await b.reserve(10, Date.now() + 1_000)).toBeNull();
  });
});

describe("sanitize", () => {
  it("removes keys and account identifiers from provider messages", () => {
    const out = sanitize("Rate limit reached in organization org_01hx9abc for key gsk_abcdefghijklmnop, Bearer xyz");
    expect(out).not.toMatch(/org_01hx9abc|gsk_abcdefghijklmnop|xyz/);
    expect(out).toContain("[account]");
  });
});

describe("plain", () => {
  it("strips markdown but keeps meaning", () => {
    expect(plain("**Bold** claim")).toBe("Bold claim");
    expect(plain("- item one\n- item two")).toBe("item one\nitem two");
    expect(plain("# Heading")).toBe("Heading");
    expect(plain("Use `code` in C# fine")).toBe("Use code in C# fine");
  });
});
