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
    <header className="mb-10 md:mb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="mono text-[10.5px] text-ink-4">[{index.replace(/ — .*/, "")}]</p>
          <h2 className="mt-2 text-[20px] font-normal tracking-[-0.01em] text-ink">{title}</h2>
          {description && <p className="mt-2 max-w-xl text-[13.5px] font-light leading-relaxed text-ink-3">{description}</p>}
        </div>
        {actions && <div className="no-print flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
      </div>
      {meta && <div className="mono mt-5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[10.5px] text-ink-4">{meta}</div>}
    </header>
  );
}

/** A titled block within a section. */
export function Block({ title, aside, children, className, id }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section className={cx("mt-14 first:mt-0", className)} aria-labelledby={id} id={id ? `${id}-section` : undefined}>
      <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-line pb-2.5">
        <h3 id={id} className="text-[13px] font-medium text-ink">
          {title}
        </h3>
        {aside && <span className="mono text-[10.5px] text-ink-4">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

/** Two-column definition list for short facts. */
export function Facts({ items, className, single }: { items: { label: string; value: React.ReactNode }[]; className?: string; single?: boolean }) {
  return (
    <dl className={cx("grid gap-x-10 gap-y-6", !single && "sm:grid-cols-2", className)}>
      {items.map((it) => (
        <div key={it.label}>
          <dt className="text-[13px] font-medium text-ink">{it.label}</dt>
          <dd className="mt-1.5 text-[13.5px] font-light leading-relaxed text-ink-2">{it.value}</dd>
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
          <div className={cx("text-[14px] font-light leading-relaxed", muted ? "text-ink-3" : "text-ink-2")}>{item}</div>
        </li>
      ))}
    </ol>
  );
}
