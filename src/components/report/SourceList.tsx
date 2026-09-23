import type { Source } from "@/types";
import { formatDate } from "@/lib/utils";

export function SourceList({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <ol className="divide-y divide-line border-y border-line">
      {sources.map((s) => (
        <li key={s.id} id={`source-${s.id}`} className="grid grid-cols-[2.5rem_1fr] gap-3 py-3.5">
          <span className="mono pt-0.5 text-[11px] text-ink-3">{s.id}</span>
          <div className="min-w-0">
            <a href={s.url} target="_blank" rel="noreferrer" className="group text-[14px] leading-snug text-ink">
              <span className="link-underline">{s.title}</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <p className="mono mt-1 truncate text-[11px] text-ink-3">
              {s.domain}
              {s.publishedAt ? ` · ${formatDate(s.publishedAt)}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
