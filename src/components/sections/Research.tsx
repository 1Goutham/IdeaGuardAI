"use client";

import { useMemo, useState } from "react";
import { formatDate } from "@/lib/utils";
import { Disclosure, LevelMeter, Segmented } from "@/components/ui";
import { EvidenceLine } from "@/components/report/Evidence";
import { Block, SectionHeader } from "@/components/report/Section";
import { SourceList } from "@/components/report/SourceList";
import { StageGate } from "@/components/workspace/StageGate";
import { sectionIndex } from "@/components/workspace/nav";
import type { Finding, ResearchResult } from "@/types";

const TOPIC_LABEL: Record<Finding["topic"], string> = {
  market: "Market",
  demand: "Demand",
  pricing: "Pricing",
  complaints: "User complaints",
  technology: "Technology",
  regulation: "Regulation",
  trend: "Trends",
};

type Filter = "all" | "evidence" | "inference";

export function Research() {
  return <StageGate stage="research" header={{ index: `${sectionIndex("research")} — Research`, title: "What the market says" }}>{(r) => <ResearchView r={r} />}</StageGate>;
}

function ResearchView({ r }: { r: ResearchResult }) {
  const [filter, setFilter] = useState<Filter>("all");
  const sourced = r.findings.filter((f) => f.basis === "evidence").length;
  const shown = useMemo(() => r.findings.filter((f) => filter === "all" || f.basis === filter), [r.findings, filter]);

  return (
    <article className="animate-fade">
      <SectionHeader
        index={`${sectionIndex("research")} — Research`}
        title="What the market says"
        description={r.summary}
        meta={
          r.mode === "live" ? (
            <>
              <span>{r.sources.length} sources</span>
              <span>via {r.provider}</span>
              <span>Last researched {formatDate(r.researchedAt)}</span>
            </>
          ) : (
            <span className="text-warn">Live research was off for this run</span>
          )
        }
      />

      {r.mode === "offline" && (
        <div className="-mt-6 mb-14 border-l border-dashed border-warn pl-4">
          <p className="text-[14px] text-ink">These findings are model inference, not research.</p>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-ink-3">
            No search provider was configured, so nothing below is backed by a source. Add <span className="mono">TAVILY_API_KEY</span> or <span className="mono">BRAVE_API_KEY</span> and re-run
            research to replace them with sourced evidence.
          </p>
        </div>
      )}

      <Block
        title="Findings"
        id="findings"
        aside={
          <span>
            {sourced} sourced · {r.findings.length - sourced} inferred
          </span>
        }
      >
        <Segmented<Filter>
          ariaLabel="Filter findings"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "evidence", label: "Sourced" },
            { value: "inference", label: "Inference" },
          ]}
          className="mb-6"
        />
        {shown.length ? (
          <ul className="space-y-0 border-t border-line">
            {shown.map((f, i) => (
              <li key={`${f.headline}-${i}`} className="grid gap-x-8 gap-y-2 border-b border-line py-6 md:grid-cols-[9rem_minmax(0,1fr)]">
                <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-2">
                  <span className="label">{TOPIC_LABEL[f.topic]}</span>
                  <span className="mono inline-flex items-center gap-2 text-[10.5px] text-ink-3" title="Confidence">
                    <LevelMeter level={f.confidence} label={`Confidence: ${f.confidence}`} /> {f.confidence} confidence
                  </span>
                </div>
                <div className={f.basis === "evidence" ? "rule-sourced pl-5" : "rule-inferred pl-5"}>
                  <p className="text-[17px] leading-snug text-ink">{f.headline}</p>
                  <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-2">{f.detail}</p>
                  <EvidenceLine basis={f.basis} ids={f.sourceIds} className="mt-3" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-y border-line py-6 text-[14px] text-ink-3">No {filter === "evidence" ? "sourced" : "inferred"} findings.</p>
        )}
      </Block>

      {r.openQuestions.length > 0 && (
        <Block title="What research couldn't answer" id="open">
          <ul className="grid gap-3 sm:grid-cols-2">
            {r.openQuestions.map((q) => (
              <li key={q} className="border-l border-dashed border-line-2 pl-3 text-[14px] leading-relaxed text-ink-2">
                {q}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {r.sources.length > 0 && (
        <Block title="Sources" id="sources" aside={`${r.sources.length} retrieved`}>
          <SourceList sources={r.sources} />
        </Block>
      )}

      <Block title="Method" id="method">
        <Disclosure summary={<span className="text-[13.5px] text-ink-2">Search queries used ({r.queries.length})</span>}>
          <ul className="mono space-y-1.5 text-[12px] text-ink-2">
            {r.queries.map((q) => (
              <li key={q}>“{q}”</li>
            ))}
          </ul>
        </Disclosure>
        <p className="mt-4 max-w-2xl text-[12.5px] leading-relaxed text-ink-3">
          Queries are planned by the Idea Analyst and run in parallel. Results are deduplicated and numbered; the Research Agent may only cite those numbers, and citations are checked in code.
        </p>
      </Block>
    </article>
  );
}
