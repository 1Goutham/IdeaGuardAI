import type { StageStatus } from "@/types";
import { cx } from "@/lib/utils";

/**
 * Stage state as a mark. Accent is reserved for "running", the one state
 * that deserves attention. Every state also has a text label nearby.
 */
export function StatusDot({ status, className }: { status: StageStatus; className?: string }) {
  if (status === "done") {
    return (
      <svg viewBox="0 0 12 12" className={cx("size-3 text-ink", className)} aria-hidden="true">
        <path d="m2.5 6.2 2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "error") {
    return (
      <svg viewBox="0 0 12 12" className={cx("size-3 text-danger", className)} aria-hidden="true">
        <path d="M3 3l6 6M9 3 3 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (status === "running") {
    return (
      <span className={cx("relative inline-flex size-3 items-center justify-center", className)} aria-hidden="true">
        <span className="absolute size-2.5 rounded-full bg-accent animate-pulse-dot" />
        <span className="relative size-1.5 rounded-full bg-ink" />
      </span>
    );
  }
  return (
    <span className={cx("inline-flex size-3 items-center justify-center", className)} aria-hidden="true">
      <span className={cx("size-1.5 rounded-full border", status === "queued" ? "border-ink-3" : "border-ink-4")} />
    </span>
  );
}
