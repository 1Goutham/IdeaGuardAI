import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { kv } from "./kv";
import type { SharedReport } from "@/lib/share";

/**
 * Shared, read-only reports. Each share has a public, unguessable ID and a
 * private token; only a hash of the token is stored, so the link can be
 * updated or revoked only by the browser that created it.
 */

const PREFIX = "share:";
const ID_ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

interface StoredShare {
  report: SharedReport;
  tokenHash: string;
  createdAt: string;
  updatedAt: string;
}

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

function newId(length = 12): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("");
}

export const isShareId = (id: string) => /^[A-Za-z0-9]{8,32}$/.test(id);

function tokenMatches(stored: string, token: string): boolean {
  const a = Buffer.from(stored, "hex");
  const b = Buffer.from(hash(token), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sharingAvailable(): boolean {
  return kv() !== null;
}

export async function createShare(report: SharedReport): Promise<{ id: string; token: string }> {
  const store = kv();
  if (!store) throw new Error("not_configured");
  const id = newId();
  const token = randomBytes(24).toString("base64url");
  const now = new Date().toISOString();
  const value: StoredShare = { report, tokenHash: hash(token), createdAt: now, updatedAt: now };
  await store.set(PREFIX + id, JSON.stringify(value));
  return { id, token };
}

export async function getShare(id: string): Promise<(SharedReport & { updatedAt: string }) | null> {
  const store = kv();
  if (!store || !isShareId(id)) return null;
  const raw = await store.get(PREFIX + id);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as StoredShare;
    return { ...v.report, updatedAt: v.updatedAt };
  } catch {
    return null;
  }
}

/** "ok", "forbidden" or "missing". */
export async function updateShare(id: string, token: string, report: SharedReport): Promise<"ok" | "forbidden" | "missing"> {
  const store = kv();
  if (!store || !isShareId(id)) return "missing";
  const raw = await store.get(PREFIX + id);
  if (!raw) return "missing";
  const v = JSON.parse(raw) as StoredShare;
  if (!tokenMatches(v.tokenHash, token)) return "forbidden";
  await store.set(PREFIX + id, JSON.stringify({ ...v, report, updatedAt: new Date().toISOString() }));
  return "ok";
}

export async function deleteShare(id: string, token: string): Promise<"ok" | "forbidden" | "missing"> {
  const store = kv();
  if (!store || !isShareId(id)) return "missing";
  const raw = await store.get(PREFIX + id);
  if (!raw) return "missing";
  const v = JSON.parse(raw) as StoredShare;
  if (!tokenMatches(v.tokenHash, token)) return "forbidden";
  await store.del(PREFIX + id);
  return "ok";
}
