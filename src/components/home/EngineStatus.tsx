"use client";

import { useEngine } from "@/lib/store/useEngine";
import { cx } from "@/lib/utils";

/** What the analysis will run on. Honest about offline research and development engines. */
export function EngineStatus({ className }: { className?: string }) {
  const { info, loading } = useEngine();
  if (loading) return <span className={cx("mono text-[11px] text-ink-4", className)}>Checking engine…</span>;
  if (!info?.model) {
    return (
      <span className={cx("mono text-[11px] text-danger", className)} role="status">
        No model connected
      </span>
    );
  }
  return (
    <span className={cx("mono flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3", className)}>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-accent ring-1 ring-ink/30" aria-hidden="true" />
        {info.model.label}
        {info.model.model ? ` · ${info.model.model}` : ""}
      </span>
      <span className={info.research ? "" : "text-warn"}>Research: {info.research ?? "offline"}</span>
    </span>
  );
}
