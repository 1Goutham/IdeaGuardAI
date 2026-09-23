"use client";

import { LEVEL_LABEL } from "@/lib/scoring/signals";
import { LevelMeter, Tag } from "@/components/ui";
import { Block, NumberedList, SectionHeader } from "@/components/report/Section";
import { StageGate } from "@/components/workspace/StageGate";
import { sectionIndex } from "@/components/workspace/nav";
import type { FeasibilityOutput } from "@/types";

const AVAILABILITY = { available: "Available", obtainable: "Obtainable", hard: "Hard to get" } as const;

export function Feasibility() {
  return <StageGate stage="feasibility" header={{ index: `${sectionIndex("feasibility")} — Feasibility`, title: "Can it be built?" }}>{(f) => <FeasibilityView f={f} />}</StageGate>;
}

function FeasibilityView({ f }: { f: FeasibilityOutput }) {
  return (
    <article className="animate-fade">
      <SectionHeader
        index={`${sectionIndex("feasibility")} — Feasibility`}
        title="Can it be built?"
        description={f.summary}
        meta={
          <>
            <span className="inline-flex items-center gap-2">
              Build effort <LevelMeter level={f.effort.level} /> {LEVEL_LABEL[f.effort.level]}
            </span>
            <span>{f.components.length} components</span>
          </>
        }
      />

      <Block title="Effort" id="effort">
        <p className="measure text-[16px] leading-relaxed text-ink">{f.effort.rationale}</p>
      </Block>

      <Block title="Components" id="components" aside="Complexity · approach">
        <ul className="border-t border-line">
          {f.components.map((c) => (
            <li key={c.name} className="grid gap-x-8 gap-y-2 border-b border-line py-5 md:grid-cols-[minmax(0,1fr)_11rem]">
              <div>
                <p className="text-[16px] text-ink">{c.name}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{c.description}</p>
                {c.note && <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{c.note}</p>}
              </div>
              <div className="flex items-center gap-3 md:flex-col md:items-end md:gap-2.5">
                <span className="mono inline-flex items-center gap-2 text-[11px] text-ink-3">
                  <LevelMeter level={c.complexity} label={`Complexity: ${c.complexity}`} /> {c.complexity}
                </span>
                <Tag>{c.approach}</Tag>
              </div>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Hardest problems" id="hard">
        <NumberedList items={f.hardestProblems} />
      </Block>

      {f.dataNeeds.length > 0 && (
        <Block title="Data dependencies" id="data">
          <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {f.dataNeeds.map((d) => (
              <li key={d.need} className={d.availability === "hard" ? "border-l border-ink pl-4" : "border-l border-line-2 pl-4"}>
                <p className="mono text-[10.5px] uppercase tracking-[0.1em] text-ink-3">{AVAILABILITY[d.availability]}</p>
                <p className="mt-1.5 text-[15px] text-ink">{d.need}</p>
                {d.note && <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{d.note}</p>}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {f.skills.length > 0 && (
        <Block title="Skills the team needs" id="skills">
          <ul className="flex flex-wrap gap-2">
            {f.skills.map((s) => (
              <li key={s}>
                <Tag>{s}</Tag>
              </li>
            ))}
          </ul>
        </Block>
      )}
    </article>
  );
}
