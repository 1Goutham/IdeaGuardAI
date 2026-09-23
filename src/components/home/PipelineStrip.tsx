import { STAGE_IDS } from "@/types";
import { STAGE_COPY } from "@/lib/agents/pipeline";
import { pad2 } from "@/lib/utils";

const WHAT: Record<(typeof STAGE_IDS)[number], string> = {
  understand: "Restates the idea precisely and flags what's unclear.",
  research: "Searches the web and cites what it finds.",
  competitors: "Names existing products and checks them against sources.",
  feasibility: "Breaks the build into components and hard problems.",
  risks: "Market, technical, legal and ethical exposure.",
  critic: "Challenges the assumptions the idea depends on.",
  strategy: "A stance, a focused MVP, and what to test first.",
};

/** The pipeline as a quiet diagram: seven agents, in order. */
export function PipelineStrip() {
  return (
    <section aria-labelledby="pipeline-title" className="border-t border-line pt-6">
      <div className="flex items-baseline justify-between gap-6">
        <h2 id="pipeline-title" className="label">
          What happens next
        </h2>
        <p className="mono hidden text-[11px] text-ink-4 md:block">7 agents · sourced where possible · labelled where not</p>
      </div>
      <ol className="mt-8 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-7 lg:gap-x-4">
        {STAGE_IDS.map((id, i) => (
          <li key={id} className="relative lg:pr-2">
            <div className="flex items-center gap-3">
              <span className="mono text-[11px] text-ink-3">{pad2(i + 1)}</span>
              <span className="hidden h-px flex-1 bg-line-2 lg:block" aria-hidden="true" />
            </div>
            <p className="mt-3 text-[14px] text-ink">{STAGE_COPY[id].agent}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{WHAT[id]}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
