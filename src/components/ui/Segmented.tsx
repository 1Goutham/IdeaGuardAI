"use client";

import { useRef } from "react";
import { cx } from "@/lib/utils";

interface Option<T extends string> {
  value: T;
  label: string;
}

/** Radio group drawn as text options; the active one is underlined. Arrow keys move selection. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  layout = "row",
}: {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  ariaLabel: string;
  className?: string;
  /** "grid" stacks options two per row, for narrow columns. */
  layout?: "row" | "grid";
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cx(layout === "grid" ? "grid w-fit grid-cols-2 gap-x-6" : "inline-flex flex-wrap items-center gap-x-5 gap-y-2", className)}>
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(o.value)}
            className={cx("relative w-fit py-1 text-left text-[13.5px] transition-colors", active ? "text-ink" : "text-ink-3 hover:text-ink")}
          >
            {o.label}
            <span className={cx("absolute inset-x-0 -bottom-px h-px origin-left bg-ink transition-transform duration-300", active ? "scale-x-100" : "scale-x-0")} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
