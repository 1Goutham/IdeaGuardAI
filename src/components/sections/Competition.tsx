"use client";

import { Disclosure, Tag } from "@/components/ui";
import { SourceRefs } from "@/components/report/Evidence";
import { PositioningMap } from "@/components/report/PositioningMap";
import { Block, SectionHeader } from "@/components/report/Section";
import { StageGate } from "@/components/workspace/StageGate";
import { sectionIndex } from "@/components/workspace/nav";
import type { Competitor, CompetitorResult } from "@/types";

const KIND: Record<Competitor["kind"], string> = { direct: "Direct", indirect: "Indirect", substitute: "Substitute" };

export function Competition() {
  return <StageGate stage="competitors" header={{ index: `${sectionIndex("competition")} — Competition`, title: "Who you're up against" }}>{(c) => <CompetitionView c={c} />}</StageGate>;
}

function Verified({ c }: { c: Competitor }) {
  return c.verified ? (
    <Tag title="Named in at least one retrieved source">Verified</Tag>
  ) : (
    <Tag tone="muted" title="Not found in the retrieved sources. From model knowledge; check before relying on it.">
      Unverified
    </Tag>
  );
}

function List({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-ink-4">—</span>;
  return (
    <ul className="space-y-1">
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  );
}

function CompetitionView({ c }: { c: CompetitorResult }) {
  const verified = c.competitors.filter((x) => x.verified).length;
  return (
    <article className="animate-fade">
      <SectionHeader
        index={`${sectionIndex("competition")} — Competition`}
        title="Who you're up against"
        description={c.whitespace}
        meta={
          <>
            <span>{c.competitors.length} products</span>
            <span>
              {verified} verified in sources · {c.competitors.length - verified} unverified
            </span>
          </>
        }
      />

      {c.competitors.length === 0 ? (
        <p className="border-y border-line py-8 text-[15px] text-ink-2">No competitors could be identified with confidence. That is not the same as having none: search for how your target users solve this today.</p>
      ) : (
        <>
          <Block title="Comparison" id="compare">
            {/* Desktop: a real table. */}
            <div className="hidden md:block">
              <table className="w-full border-collapse text-left text-[13.5px]">
                <caption className="sr-only">Competitor comparison</caption>
                <thead>
                  <tr className="border-b border-ink">
                    {["Product", "Audience", "Pricing", "Strengths", "Weaknesses"].map((h) => (
                      <th key={h} scope="col" className="label py-3 pr-5 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {c.competitors.map((x) => (
                    <tr key={x.name} className="border-b border-line align-top">
                      <th scope="row" className="py-4 pr-5 font-normal">
                        <span className="block text-[15px] text-ink">
                          {x.url ? (
                            <a href={x.url} target="_blank" rel="noreferrer" className="link-underline">
                              {x.name}
                            </a>
                          ) : (
                            x.name
                          )}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="mono text-[10.5px] uppercase tracking-[0.1em] text-ink-3">{KIND[x.kind]}</span>
                          <Verified c={x} />
                        </span>
                      </th>
                      <td className="py-4 pr-5 text-ink-2">{x.audience}</td>
                      <td className="py-4 pr-5 text-ink-2">{x.pricing || <span className="text-ink-4">Not found</span>}</td>
                      <td className="py-4 pr-5 text-ink-2">
                        <List items={x.strengths} />
                      </td>
                      <td className="py-4 text-ink-2">
                        <List items={x.weaknesses} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: one product at a time. */}
            <div className="md:hidden">
              {c.competitors.map((x) => (
                <Disclosure
                  key={x.name}
                  summary={
                    <span>
                      <span className="block text-[16px] text-ink">{x.name}</span>
                      <span className="mono mt-1 block text-[10.5px] uppercase tracking-[0.1em] text-ink-3">
                        {KIND[x.kind]} · {x.verified ? "Verified" : "Unverified"}
                      </span>
                    </span>
                  }
                >
                  <dl className="space-y-4 text-[14px]">
                    {[
                      ["Audience", x.audience],
                      ["Pricing", x.pricing || "Not found"],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="label">{k}</dt>
                        <dd className="mt-1 text-ink-2">{v}</dd>
                      </div>
                    ))}
                    <div>
                      <dt className="label">Strengths</dt>
                      <dd className="mt-1 text-ink-2">
                        <List items={x.strengths} />
                      </dd>
                    </div>
                    <div>
                      <dt className="label">Weaknesses</dt>
                      <dd className="mt-1 text-ink-2">
                        <List items={x.weaknesses} />
                      </dd>
                    </div>
                  </dl>
                </Disclosure>
              ))}
            </div>
          </Block>

          {c.axes && c.placements.length >= 3 && (
            <Block title="Positioning" id="map" aside={`${c.axes.x.label} × ${c.axes.y.label}`}>
              <PositioningMap axes={c.axes} placements={c.placements} />
            </Block>
          )}

          <Block title="Where you can win" id="win">
            <ul className="border-t border-line">
              {c.competitors.map((x) => (
                <li key={x.name} className="grid gap-x-8 gap-y-2 border-b border-line py-5 md:grid-cols-[12rem_minmax(0,1fr)]">
                  <div>
                    <p className="text-[15px] text-ink">{x.name}</p>
                    <p className="mt-1 text-[12.5px] leading-snug text-ink-3">{x.offering}</p>
                  </div>
                  <div>
                    <p className="text-[15px] leading-relaxed text-ink">{x.opportunity}</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{x.description}</p>
                    {x.sourceIds.length > 0 && <SourceRefs ids={x.sourceIds} className="mt-3" />}
                  </div>
                </li>
              ))}
            </ul>
          </Block>
        </>
      )}
    </article>
  );
}
