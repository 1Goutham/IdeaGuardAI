import type { Level, Risk } from "@/types";
import { cx } from "@/lib/utils";

const ORDER: Level[] = ["low", "medium", "high"];

/** Severity × likelihood. Weight is shown with ink density, and every risk keeps its number. */
export function RiskMatrix({ risks }: { risks: Risk[] }) {
  const index = new Map(risks.map((r, i) => [r, i + 1]));
  return (
    <figure>
      <div className="grid grid-cols-[4.5rem_1fr] gap-2">
        <div className="mono flex flex-col justify-around text-right text-[10.5px] text-ink-3" aria-hidden="true">
          {[...ORDER].reverse().map((y) => (
            <span key={y} className="capitalize">
              {y}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-3 grid-rows-3 gap-px bg-line" role="img" aria-label="Risk matrix: severity by likelihood">
          {[...ORDER].reverse().map((sev, yi) =>
            ORDER.map((lik, xi) => {
              const weight = 2 - yi + xi; // 0..4
              const here = risks.filter((r) => r.severity === sev && r.likelihood === lik);
              return (
                <div key={`${sev}-${lik}`} className="relative min-h-[64px] bg-paper p-2 md:min-h-[76px]">
                  <div className="absolute inset-0" style={{ background: `color-mix(in srgb, var(--ink) ${weight * 2.5}%, transparent)` }} aria-hidden="true" />
                  <div className="relative flex flex-wrap gap-1.5">
                    {here.map((r) => (
                      <span
                        key={r.title}
                        title={r.title}
                        className={cx("mono inline-flex size-6 items-center justify-center rounded-full text-[11px]", weight >= 3 ? "bg-ink text-on-ink" : "border border-ink text-ink")}
                      >
                        {index.get(r)}
                      </span>
                    ))}
                  </div>
                  {sev === "high" && lik === "high" && <span className="mono absolute bottom-1.5 right-2 text-[9.5px] uppercase tracking-[0.1em] text-ink-3">Act now</span>}
                </div>
              );
            }),
          )}
        </div>
      </div>
      <div className="mono mt-2 grid grid-cols-[4.5rem_1fr] gap-2 text-[10.5px] text-ink-3" aria-hidden="true">
        <span className="text-right">Severity ↑</span>
        <div className="grid grid-cols-3 text-center capitalize">
          {ORDER.map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
      </div>
      <figcaption className="mono mt-1 text-center text-[10.5px] text-ink-3">Likelihood →</figcaption>
    </figure>
  );
}
