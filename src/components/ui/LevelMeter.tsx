import type { Level } from "@/types";
import { cx } from "@/lib/utils";
import { LEVEL_RANK } from "@/lib/scoring/signals";

/** Three hairline segments. Shows magnitude only; meaning comes from the label beside it. */
export function LevelMeter({ level, className, label }: { level: Level; className?: string; label?: string }) {
  const n = LEVEL_RANK[level];
  return (
    <span className={cx("inline-flex items-center gap-[3px]", className)} role="img" aria-label={label ?? `${level} of three`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={cx("h-[5px] w-4 rounded-[1px] transition-colors", i <= n ? "bg-ink" : "bg-line-2")} />
      ))}
    </span>
  );
}
