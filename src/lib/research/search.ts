import "server-only";
import type { Source } from "@/types";
import { activeSearchProvider, type RawResult } from "./providers";

const PER_QUERY = 5;
const MAX_SOURCES = 24;

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function canonical(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "ref"].forEach((p) => u.searchParams.delete(p));
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}${u.search}`;
  } catch {
    return url;
  }
}

export interface GatherResult {
  sources: Source[];
  provider: string | null;
  queries: string[];
  failedQueries: number;
}

/** Runs every query in parallel and returns a deduplicated, numbered source list. */
export async function gatherSources(queries: string[]): Promise<GatherResult> {
  const provider = activeSearchProvider();
  const unique = [...new Set(queries.map((q) => q.trim()).filter(Boolean))].slice(0, 7);
  if (!provider || !unique.length) return { sources: [], provider: null, queries: unique, failedQueries: 0 };

  const settled = await Promise.allSettled(unique.map((q) => provider.search(q, PER_QUERY).then((r) => ({ q, r }))));
  const seen = new Set<string>();
  const sources: Source[] = [];
  let failedQueries = 0;

  // Interleave results across queries so one query can't crowd out the others.
  const lists = settled.map((s) => {
    if (s.status === "rejected") {
      failedQueries++;
      console.warn("IdeaGuard research: query failed", s.reason);
      return { q: "", r: [] as RawResult[] };
    }
    return s.value;
  });
  for (let rank = 0; rank < PER_QUERY && sources.length < MAX_SOURCES; rank++) {
    for (const { q, r } of lists) {
      const item = r[rank];
      if (!item?.url || !item.title) continue;
      const key = canonical(item.url);
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push({
        id: `S${sources.length + 1}`,
        title: item.title.trim().slice(0, 200),
        url: item.url,
        domain: domainOf(item.url),
        snippet: item.snippet.trim().slice(0, 1200),
        publishedAt: item.publishedAt,
        query: q,
      });
      if (sources.length >= MAX_SOURCES) break;
    }
  }
  return { sources, provider: provider.label, queries: unique, failedQueries };
}

export function researchProviderLabel(): string | null {
  return activeSearchProvider()?.label ?? null;
}
