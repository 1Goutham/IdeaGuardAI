import type { Basis, Source } from "@/types";

/**
 * Evidence discipline.
 *
 * Models are told to cite only the numbered sources they were given, but a
 * prompt is not a guarantee. Everything a model cites passes through here:
 * unknown source IDs are dropped, and an item is only marked "evidence" if at
 * least one real, retrieved source remains. Everything else is "inference".
 */

export function groundItems<T extends { sourceIds: string[] }>(items: T[], sources: Source[]): (T & { basis: Basis })[] {
  const known = new Set(sources.map((s) => s.id));
  return items.map((item) => {
    const valid = [...new Set(item.sourceIds.filter((id) => known.has(id)))];
    return { ...item, sourceIds: valid, basis: valid.length ? "evidence" : "inference" };
  });
}

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * A competitor counts as verified only when a retrieved source actually names
 * it: in the title, snippet, or domain. Cited sources are checked first; if
 * the model cited nothing, any source that names it is attached instead.
 */
export function verifyCompetitor<T extends { name: string; sourceIds: string[]; url: string }>(
  competitor: T,
  sources: Source[],
): T & { verified: boolean } {
  const name = normalise(competitor.name);
  const compact = name.replace(/ /g, "");
  if (!name) return { ...competitor, sourceIds: [], verified: false };
  const mentions = (s: Source) => {
    const hay = normalise(`${s.title} ${s.snippet}`);
    return hay.includes(name) || s.domain.replace(/\./g, "").includes(compact);
  };
  const byId = new Map(sources.map((s) => [s.id, s]));
  const cited = competitor.sourceIds.map((id) => byId.get(id)).filter((s): s is Source => !!s && mentions(s));
  const supporting = cited.length ? cited : sources.filter(mentions).slice(0, 3);
  const url = competitor.url && /^https?:\/\//.test(competitor.url) ? competitor.url : "";
  return { ...competitor, url, sourceIds: supporting.map((s) => s.id), verified: supporting.length > 0 };
}

/** The numbered source list as the model sees it. */
export function sourcesForPrompt(sources: Source[], maxSnippet = 600): string {
  if (!sources.length) return "NO SOURCES WERE RETRIEVED. Every item must have an empty sourceIds array.";
  return sources
    .map(
      (s) =>
        `[${s.id}] ${s.title}\n    ${s.domain}${s.publishedAt ? ` · ${s.publishedAt.slice(0, 10)}` : ""}\n    ${s.snippet.slice(0, maxSnippet).replace(/\s+/g, " ")}`,
    )
    .join("\n");
}
