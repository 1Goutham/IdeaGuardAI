"use client";

import { LevelMeter } from "@/components/ui";
import { EvidenceLine } from "@/components/report/Evidence";
import { RiskMatrix } from "@/components/report/RiskMatrix";
import { Block, SectionHeader } from "@/components/report/Section";
import { StageGate } from "@/components/workspace/StageGate";
import { sectionIndex } from "@/components/workspace/nav";
import { LEVEL_RANK } from "@/lib/scoring/signals";
import type { RiskResult } from "@/types";

export function Risks() {
  return <StageGate stage="risks" header={{ index: `${sectionIndex("risks")} — Risks`, title: "What could sink it" }}>{(r) => <RisksView r={r} />}</StageGate>;
}

function RisksView({ r }: { r: RiskResult }) {
  // Keep the model's order for numbering, so the matrix and list agree.
  const critical = r.risks.filter((x) => LEVEL_RANK[x.severity] + LEVEL_RANK[x.likelihood] >= 5).length;
  return (
    <article className="animate-fade">
      <SectionHeader
        index={`${sectionIndex("risks")} — Risks`}
        title="What could sink it"
        description="Market, adoption, technical, legal and ethical exposure, with a mitigation for each."
        meta={
          <>
            <span>{r.risks.length} risks</span>
            <span>{critical} need attention now</span>
            <span>{r.regulations.length} regulations to check</span>
          </>
        }
      />

      <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Block title="Register" id="register" className="xl:order-1">
          <ol className="border-t border-line">
            {r.risks.map((x, i) => (
              <li key={x.title} className="grid grid-cols-[2rem_1fr] gap-3 border-b border-line py-5">
                <span className="mono pt-1 text-[11px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-[16px] text-ink">{x.title}</p>
                    <span className="mono text-[10.5px] uppercase tracking-[0.1em] text-ink-3">{x.category}</span>
                  </div>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{x.description}</p>
                  <p className="mt-3 text-[14px] leading-relaxed text-ink">
                    <span className="label mr-2">Mitigation</span>
                    {x.mitigation}
                  </p>
                  <div className="mono mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-ink-3">
                    <span className="inline-flex items-center gap-2">
                      Severity <LevelMeter level={x.severity} label={`Severity ${x.severity}`} />
                    </span>
                    <span className="inline-flex items-center gap-2">
                      Likelihood <LevelMeter level={x.likelihood} label={`Likelihood ${x.likelihood}`} />
                    </span>
                    <EvidenceLine basis={x.basis} ids={x.sourceIds} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Block>
        <div className="xl:order-2">
          <div className="xl:sticky xl:top-24">
            <Block title="Matrix" id="matrix">
              <RiskMatrix risks={r.risks} />
            </Block>
          </div>
        </div>
      </div>

      <Block title="Regulation and governance" id="regulation">
        {r.regulations.length ? (
          <ul className="border-t border-line">
            {r.regulations.map((g) => (
              <li key={g.name} className="grid gap-x-8 gap-y-2 border-b border-line py-5 md:grid-cols-[12rem_minmax(0,1fr)]">
                <div>
                  <p className="text-[15px] text-ink">{g.name}</p>
                  {g.jurisdiction && <p className="mono mt-1 text-[11px] text-ink-3">{g.jurisdiction}</p>}
                </div>
                <div>
                  <p className="text-[14px] leading-relaxed text-ink-2">{g.relevance}</p>
                  <EvidenceLine basis={g.basis} ids={g.sourceIds} className="mt-3" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-ink-3">No specific regulation was identified. That is a judgement, not legal advice.</p>
        )}
        <p className="mt-4 max-w-2xl text-[12.5px] leading-relaxed text-ink-3">Regulatory notes are a starting point for your own research, not legal advice.</p>
      </Block>
    </article>
  );
}
