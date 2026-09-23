import { cx } from "@/lib/utils";

/** Page header for a workspace section: mono index, display title, factual meta line. */
export function SectionHeader({
  index,
  title,
  description,
  meta,
  actions,
}: {
  index: string;
  title: string;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-12 md:mb-16">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="label">{index}</p>
          <h1 className="display mt-4 text-[40px] text-ink md:text-[56px]">{title}</h1>
          {description && <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-3">{description}</p>}
        </div>
        {actions && <div className="no-print flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
      </div>
      {meta && <div className="mono mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4 text-[11px] text-ink-3">{meta}</div>}
    </header>
  );
}

/** A titled block within a section. */
export function Block({ title, aside, children, className, id }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section className={cx("mt-16 first:mt-0", className)} aria-labelledby={id} id={id ? `${id}-section` : undefined}>
      <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-line pb-3">
        <h2 id={id} className="label">
          {title}
        </h2>
        {aside && <span className="mono text-[11px] text-ink-3">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

/** Two-column definition list for short facts. */
export function Facts({ items, className }: { items: { label: string; value: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cx("grid gap-x-10 gap-y-7 sm:grid-cols-2", className)}>
      {items.map((it) => (
        <div key={it.label}>
          <dt className="label">{it.label}</dt>
          <dd className="mt-2 text-[15px] leading-relaxed text-ink">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Numbered list with hairlines, used for steps and priorities. */
export function NumberedList({ items, muted }: { items: React.ReactNode[]; muted?: boolean }) {
  return (
    <ol className="border-t border-line">
      {items.map((item, i) => (
        <li key={i} className="grid grid-cols-[2rem_1fr] gap-3 border-b border-line py-3.5">
          <span className="mono pt-0.5 text-[11px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
          <div className={cx("text-[15px] leading-relaxed", muted ? "text-ink-2" : "text-ink")}>{item}</div>
        </li>
      ))}
    </ol>
  );
}
