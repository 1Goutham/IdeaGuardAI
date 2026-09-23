import type { CriticOutput, Level } from "@/types";
import { cx } from "@/lib/utils";

type Assumption = CriticOutput["assumptions"][number];
const EVIDENCE: Assumption["evidence"][] = ["none", "weak", "moderate", "strong"];
const IMPORTANCE: Level[] = ["high", "medium", "low"];

/**
 * Assumption mapping: how much the idea depends on each belief versus how
 * much evidence supports it. Top-left is where to spend the next week.
 */
export function AssumptionMap({ assumptions, biggestId }: { assumptions: Assumption[]; biggestId: string }) {
  return (
    <figure>
      <div className="grid grid-cols-[4.5rem_1fr] gap-2">
        <div className="mono flex flex-col justify-around text-right text-[10.5px] capitalize text-ink-3" aria-hidden="true">
          {IMPORTANCE.map((y) => (
            <span key={y}>{y}</span>
          ))}
        </div>
        <div className="grid grid-cols-4 grid-rows-3 gap-px bg-line" role="img" aria-label="Assumption map: importance by evidence">
          {IMPORTANCE.map((imp) =>
            EVIDENCE.map((ev) => {
              const testFirst = imp === "high" && (ev === "none" || ev === "weak");
              const here = assumptions.filter((a) => a.importance === imp && a.evidence === ev);
              return (
                <div key={`${imp}-${ev}`} className={cx("relative min-h-[58px] p-2", testFirst ? "bg-surface-2" : "bg-paper")}>
                  <div className="flex flex-wrap gap-1.5">
                    {here.map((a) => (
                      <span
                        key={a.id}
                        title={a.statement}
                        className={cx(
                          "mono inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[10.5px]",
                          a.id === biggestId ? "bg-accent text-accent-ink ring-1 ring-ink" : testFirst ? "bg-ink text-on-ink" : "border border-ink-3 text-ink-2",
                        )}
                      >
                        {a.id}
                      </span>
                    ))}
                  </div>
                  {imp === "high" && ev === "none" && <span className="mono absolute bottom-1.5 left-2 text-[9.5px] uppercase tracking-[0.1em] text-ink-2">Test first</span>}
                </div>
              );
            }),
          )}
        </div>
      </div>
      <div className="mono mt-2 grid grid-cols-[4.5rem_1fr] gap-2 text-[10.5px] text-ink-3" aria-hidden="true">
        <span className="text-right">Importance ↑</span>
        <div className="grid grid-cols-4 text-center capitalize">
          {EVIDENCE.map((e) => (
            <span key={e}>{e}</span>
          ))}
        </div>
      </div>
      <figcaption className="mono mt-1 text-center text-[10.5px] text-ink-3">Evidence so far →</figcaption>
    </figure>
  );
}
