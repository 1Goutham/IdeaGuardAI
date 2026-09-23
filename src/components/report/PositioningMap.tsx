import type { CompetitorResult, Level } from "@/types";
import { cx } from "@/lib/utils";

const ORDER: Level[] = ["low", "medium", "high"];

/**
 * A coarse 3×3 map. Positions are qualitative judgements from product
 * descriptions, so the grid deliberately has no finer resolution than that.
 */
export function PositioningMap({ axes, placements }: { axes: NonNullable<CompetitorResult["axes"]>; placements: CompetitorResult["placements"] }) {
  const cell = (x: Level, y: Level) => placements.filter((p) => p.x === x && p.y === y);
  return (
    <figure>
      <div className="grid grid-cols-[1.5rem_1fr] gap-2 md:grid-cols-[2rem_1fr]">
        <div className="relative">
          <span className="mono absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
            {axes.y.label}
          </span>
        </div>
        <div>
          <div className="mono pb-1.5 text-[10.5px] text-ink-3">↑ {axes.y.high}</div>
          <div className="grid grid-cols-3 grid-rows-3 border-l border-b border-ink">
            {[...ORDER].reverse().map((y) =>
              ORDER.map((x) => (
                <div key={`${x}-${y}`} className={cx("min-h-[92px] border-r border-t border-line p-2.5 md:min-h-[110px] md:p-3", y === "high" && x === "high" && "bg-ink/[0.025]")}>
                  <ul className="space-y-1.5">
                    {cell(x, y).map((p) => {
                      const you = p.name.toLowerCase() === "your idea";
                      return (
                        <li key={p.name} className={cx("flex items-center gap-2 text-[12.5px] leading-tight md:text-[13px]", you ? "text-ink" : "text-ink-2")}>
                          <span className={cx("size-2 shrink-0 rounded-full", you ? "bg-accent ring-1 ring-ink" : "bg-ink/70")} aria-hidden="true" />
                          <span className={you ? "font-medium" : ""}>{p.name}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )),
            )}
          </div>
          <div className="mono pt-1.5 text-[10.5px] text-ink-3">↓ {axes.y.low}</div>
          <div className="mono mt-3 flex justify-between border-t border-line pt-2 text-[10.5px] text-ink-3">
            <span>← {axes.x.low}</span>
            <span className="uppercase tracking-[0.12em]">{axes.x.label}</span>
            <span>{axes.x.high} →</span>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 max-w-xl text-[12.5px] leading-relaxed text-ink-3">
        Qualitative placement from product descriptions, not measured data. Use it to see the gap, not to settle arguments.
      </figcaption>
    </figure>
  );
}
