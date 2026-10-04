import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Minimal key-value storage for server-side data (shared reports).
 *
 *  - Redis over REST when configured: Vercel KV / Upstash Redis
 *    (KV_REST_API_URL + KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL + _TOKEN).
 *    Added from the Vercel Marketplace in one click; no SDK needed.
 *  - The local filesystem otherwise, for development. Disabled on Vercel,
 *    where the filesystem isn't persistent.
 */

export interface KV {
  readonly kind: "redis" | "file";
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

function restConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

function redis(cfg: { url: string; token: string }): KV {
  async function command(args: (string | number)[]): Promise<unknown> {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as { result?: unknown; error?: string } | null;
    if (!res.ok || body?.error) throw new Error(`KV ${args[0]} failed: ${res.status} ${body?.error ?? ""}`.trim());
    return body?.result ?? null;
  }
  return {
    kind: "redis",
    async get(key) {
      const r = await command(["GET", key]);
      return typeof r === "string" ? r : null;
    },
    async set(key, value, ttl) {
      await command(ttl ? ["SET", key, value, "EX", ttl] : ["SET", key, value]);
    },
    async del(key) {
      await command(["DEL", key]);
    },
  };
}

function file(): KV {
  const dir = path.join(process.cwd(), ".data", "kv");
  const fileFor = (key: string) => path.join(dir, `${encodeURIComponent(key)}.json`);
  return {
    kind: "file",
    async get(key) {
      try {
        return await fs.readFile(fileFor(key), "utf8");
      } catch {
        return null;
      }
    },
    async set(key, value) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fileFor(key), value, "utf8");
    },
    async del(key) {
      await fs.rm(fileFor(key), { force: true });
    },
  };
}

/** The configured store, or null when none is available (e.g. Vercel without KV). */
export function kv(): KV | null {
  const cfg = restConfig();
  if (cfg) return redis(cfg);
  if (process.env.VERCEL) return null;
  return file();
}
