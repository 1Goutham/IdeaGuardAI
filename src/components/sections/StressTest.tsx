"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LEVEL_LABEL } from "@/lib/scoring/signals";
import { Disclosure, IconArrowRight, LevelMeter, Tag } from "@/components/ui";
import { AssumptionMap } from "@/components/report/AssumptionMap";
import { Block, SectionHeader } from "@/components/report/Section";
import { StageGate } from "@/components/workspace/StageGate";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { sectionIndex } from "@/components/workspace/nav";
import type { CriticOutput } from "@/types";

export function StressTest() {
  return <StageGate stage="critic" header={{ index: `${sectionIndex("stress-test")} — Stress test`, title: "What has to be true" }}>{(c) => <StressView c={c} />}</StageGate>;
}

const EVIDENCE_LABEL = { none: "No evidence", weak: "Weak evidence", moderate: "Moderate evidence", strong: "Strong evidence" } as const;

function StressView({ c }: { c: CriticOutput }) {
  const { href } = useWorkspace();
  const biggest = c.assumptions.find((a) => a.id === c.biggestAssumptionId) ?? c.assumptions[0];
  const experiment = biggest && c.experiments.find((e) => e.assumptionId === biggest.id);

  return (
    <article className="animate-fade">
      <SectionHeader
        index={`${sectionIndex("stress-test")} — Stress test`}
        title="What has to be true"
        description="The beliefs this idea stands on, challenged the way a sceptical investor or user would."
        meta={
          <>
            <span>{c.assumptions.length} assumptions</span>
            <span>{c.assumptions.filter((a) => a.importance === "high" && (a.evidence === "none" || a.evidence === "weak")).length} high-stakes and under-evidenced</span>
          </>
        }
      />

      {biggest && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} aria-labelledby="biggest" className="border-y border-ink py-10 md:py-14">
          <p id="biggest" className="label flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-accent ring-1 ring-ink" aria-hidden="true" /> Biggest assumption · {biggest.id}
          </p>
          <blockquote className="display mt-6 max-w-3xl text-[32px] leading-[1.08] text-ink md:text-[48px]">“{biggest.statement}”</blockquote>
          <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-14">
            <div>
              <p className="label">Why this may fail</p>
              <p className="mt-3 text-[16px] leading-relaxed text-ink">{biggest.whyItMayFail}</p>
            </div>
            <div>
              <p className="label">How to test it</p>
              <p className="mt-3 text-[16px] leading-relaxed text-ink">{biggest.howToTest}</p>
              {experiment && (
                <Link href={href("experiments")} className="group mt-4 inline-flex items-center gap-1.5 text-[13.5px] text-ink-2 hover:text-ink">
                  <span className="link-underline">Track “{experiment.title}”</span> <IconArrowRight size={14} className="nudge" />
                </Link>
              )}
            </div>
          </div>
        </motion.section>
      )}

      {c.counterpoints.length > 0 && (
        <Block title="Challenges" id="challenges">
          <ul className="border-t border-line">
            {c.counterpoints.map((p) => (
              <li key={p.claim} className="grid gap-x-10 gap-y-3 border-b border-line py-6 md:grid-cols-2">
                <div>
                  <p className="label">The idea assumes</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{p.claim}</p>
                </div>
                <div className="md:border-l md:border-line md:pl-10">
                  <p className="label">A sceptic would say</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink">{p.challenge}</p>
                </div>
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block title="Assumption map" id="map" aside="Top-left: test first">
        <AssumptionMap assumptions={c.assumptions} biggestId={biggest?.id ?? ""} />
      </Block>

      <Block title="All assumptions" id="all">
        <div className="border-b border-line">
          {c.assumptions.map((a) => (
            <Disclosure
              key={a.id}
              defaultOpen={a.id === biggest?.id}
              summary={
                <span className="grid grid-cols-[2.25rem_1fr] gap-2">
                  <span className="mono pt-0.5 text-[11px] text-ink-3">{a.id}</span>
                  <span>
                    <span className="block text-[15.5px] leading-snug text-ink">{a.statement}</span>
                    <span className="mono mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-ink-3">
                      <span className="uppercase tracking-[0.1em]">{a.category}</span>
                      <span className="inline-flex items-center gap-1.5">
                        Importance <LevelMeter level={a.importance} label={`Importance ${a.importance}`} /> {LEVEL_LABEL[a.importance]}
                      </span>
                      <span>{EVIDENCE_LABEL[a.evidence]}</span>
                    </span>
                  </span>
                </span>
              }
            >
              <div className="grid gap-6 pl-[2.75rem] md:grid-cols-2">
                <div>
                  <p className="label">Why it may fail</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{a.whyItMayFail}</p>
                </div>
                <div>
                  <p className="label">How to test it</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{a.howToTest}</p>
                </div>
              </div>
            </Disclosure>
          ))}
        </div>
        {c.assumptions.some((a) => a.evidence === "strong") && (
          <p className="mt-4 text-[12.5px] text-ink-3">
            <Tag className="mr-2">Note</Tag>“Strong evidence” is the critic&apos;s reading of the research above, not independent proof.
          </p>
        )}
      </Block>
    </article>
  );
}
