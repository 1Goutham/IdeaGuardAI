"use client";

import type { Basis } from "@/types";
import { cx, formatDate } from "@/lib/utils";
import { useSources } from "./SourcesContext";

/**
 * The visual grammar for evidence:
 *   Sourced    — solid mark, source references beside it.
 *   Inference  — dashed mark, the word "Inference". Never dressed up as fact.
 */
export function EvidenceMark({ basis, className }: { basis: Basis; className?: string }) {
  return basis === "evidence" ? (
    <span className={cx("mono inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.1em] text-ink-2", className)} title="Supported by at least one retrieved source">
      <span className="h-3 w-px bg-ink" aria-hidden="true" />
      Sourced
    </span>
  ) : (
    <span className={cx("mono inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.1em] text-ink-3", className)} title="Model reasoning. No retrieved source supports this directly.">
      <span className="h-3 border-l border-dashed border-ink-3" aria-hidden="true" />
      Inference
    </span>
  );
}

/** Inline source references: [S2] [S5]. Each links to the page and names it on hover or focus. */
export function SourceRefs({ ids, className }: { ids: string[]; className?: string }) {
  const sources = useSources();
  if (!ids.length) return null;
  return (
    <span className={cx("inline-flex flex-wrap items-center gap-1", className)}>
      {ids.map((id) => {
        const s = sources.find((x) => x.id === id);
        if (!s) return null;
        return (
          <a
            key={id}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="group/ref relative mono inline-flex h-5 items-center rounded-sm border border-line-2 px-1.5 text-[10.5px] text-ink-2 transition-colors hover:border-ink hover:text-ink"
            aria-label={`Source ${id}: ${s.title}, ${s.domain} (opens in a new tab)`}
          >
            {id}
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-72 rounded-md bg-ink px-3 py-2.5 text-left font-sans text-[12px] leading-snug text-on-ink shadow-lg group-hover/ref:block group-focus-visible/ref:block"
            >
              <span className="block">{s.title}</span>
              <span className="mono mt-1 block text-[10.5px] opacity-70">
                {s.domain}
                {s.publishedAt ? ` · ${formatDate(s.publishedAt)}` : ""}
              </span>
            </span>
          </a>
        );
      })}
    </span>
  );
}

/** Evidence line for an item: mark + references. */
export function EvidenceLine({ basis, ids, className }: { basis: Basis; ids: string[]; className?: string }) {
  return (
    <span className={cx("flex flex-wrap items-center gap-2", className)}>
      <EvidenceMark basis={basis} />
      <SourceRefs ids={ids} />
    </span>
  );
}
