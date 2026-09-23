"use client";

import { useId, useState } from "react";
import { cx } from "@/lib/utils";

/** "+" that turns into "−". */
export function PlusMinus({ open, className }: { open: boolean; className?: string }) {
  return (
    <span className={cx("relative block size-3 text-ink-3 transition-colors group-hover:text-ink", className)} aria-hidden="true">
      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
      <span className={cx("absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current transition-transform duration-300", open ? "scale-y-0" : "scale-y-100")} />
    </span>
  );
}

interface DisclosureProps {
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  /** Extra content right-aligned in the header row. */
  meta?: React.ReactNode;
}

/** Hairline accordion row. Content height animates via grid rows. */
export function Disclosure({ summary, children, defaultOpen, className, meta }: DisclosureProps) {
  const [open, setOpen] = useState(!!defaultOpen);
  const id = useId();
  return (
    <div className={cx("border-t border-line", className)}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} className="group flex w-full items-center justify-between gap-6 py-4 text-left">
        <span className="min-w-0 flex-1">{summary}</span>
        <span className="flex shrink-0 items-center gap-4">
          {meta}
          <PlusMinus open={open} />
        </span>
      </button>
      <div id={id} className={cx("grid transition-[grid-template-rows] duration-300 ease-[var(--ease-out-expo)]", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden" inert={!open}>
          <div className="pb-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
