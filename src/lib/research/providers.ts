import "server-only";

/**
 * Web search providers. Each returns raw results; `gather` in search.ts
 * dedupes them into the numbered source list the agents cite from.
 * Configure with TAVILY_API_KEY or BRAVE_API_KEY. Without either, research
 * runs offline and nothing is presented as sourced.
 */

export interface RawResult {
  title: string;
  url: string;
  snippet: string;
  publishedAt: string | null;
}

export interface SearchProvider {
  id: string;
  label: string;
  configured(): boolean;
  search(query: string, limit: number): Promise<RawResult[]>;
}

const TIMEOUT = 15_000;

export const tavily: SearchProvider = {
  id: "tavily",
  label: "Tavily",
  configured: () => !!process.env.TAVILY_API_KEY,
  async search(query, limit) {
    const res = await fetch(`${(process.env.TAVILY_API_BASE || "https://api.tavily.com").replace(/\/$/, "")}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
      signal: AbortSignal.timeout(TIMEOUT),
      body: JSON.stringify({ query, max_results: limit, search_depth: "basic", include_answer: false }),
    });
    if (!res.ok) throw new Error(`Tavily ${res.status}`);
    const data = (await res.json()) as { results?: { title?: string; url?: string; content?: string; published_date?: string }[] };
    return (data.results ?? []).map((r) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: r.content ?? "",
      publishedAt: r.published_date ?? null,
    }));
  },
};

export const brave: SearchProvider = {
  id: "brave",
  label: "Brave Search",
  configured: () => !!process.env.BRAVE_API_KEY,
  async search(query, limit) {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}&extra_snippets=true`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "X-Subscription-Token": process.env.BRAVE_API_KEY ?? "" },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) throw new Error(`Brave ${res.status}`);
    const data = (await res.json()) as {
      web?: { results?: { title?: string; url?: string; description?: string; extra_snippets?: string[]; page_age?: string }[] };
    };
    return (data.web?.results ?? []).map((r) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: [r.description, ...(r.extra_snippets ?? [])].filter(Boolean).join(" … ").replace(/<\/?strong>/g, ""),
      publishedAt: r.page_age ?? null,
    }));
  },
};

/**
 * Development-only search stub (RESEARCH_PROVIDER=mock). Returns clearly
 * labelled example.com pages so the pipeline can be exercised offline.
 */
export const mockSearch: SearchProvider = {
  id: "mock",
  label: "Mock search (development)",
  configured: () => process.env.RESEARCH_PROVIDER === "mock",
  async search(query) {
    await new Promise((r) => setTimeout(r, 400));
    const { MOCK_RESULTS } = await import("../ai/providers/mockFixtures");
    return MOCK_RESULTS.filter((r) => r.queries.some((q) => query.toLowerCase().includes(q))).map((r) => ({ title: r.title, url: r.url, snippet: r.snippet, publishedAt: r.publishedAt }));
  },
};

export function activeSearchProvider(): SearchProvider | null {
  const pinned = process.env.RESEARCH_PROVIDER?.trim().toLowerCase();
  const all = [mockSearch, tavily, brave];
  if (pinned) return all.find((p) => p.id === pinned && p.configured()) ?? null;
  return [tavily, brave].find((p) => p.configured()) ?? null;
}
