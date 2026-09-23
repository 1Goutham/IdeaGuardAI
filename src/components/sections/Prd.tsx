"use client";

import { prdToMarkdown } from "@/lib/utils/markdown";
import { cx } from "@/lib/utils";
import { Block, NumberedList } from "@/components/report/Section";
import { DocShell } from "@/components/report/DocShell";
import { sectionIndex } from "@/components/workspace/nav";
import type { PrdOutput } from "@/types";

const TOC = [
  ["problem", "Problem"],
  ["users", "Users"],
  ["journeys", "Journeys"],
  ["product", "Product requirements"],
  ["functional", "Functional"],
  ["nfr", "Non-functional"],
  ["ai", "AI"],
  ["data", "Data"],
  ["metrics", "Metrics"],
  ["scope", "MVP scope"],
] as const;

function Requirements({ items }: { items: { id: string; requirement: string; priority: "must" | "should" | "could" }[] }) {
  return (
    <ul className="border-t border-line">
      {items.map((r) => (
        <li key={r.id} className="grid grid-cols-[3.25rem_1fr_4.5rem] items-baseline gap-3 border-b border-line py-3.5">
          <span className="mono text-[11px] text-ink-3">{r.id}</span>
          <span className="text-[14.5px] leading-relaxed text-ink">{r.requirement}</span>
          <span className={cx("mono text-right text-[10.5px] uppercase tracking-[0.1em]", r.priority === "must" ? "text-ink" : "text-ink-3")}>{r.priority}</span>
        </li>
      ))}
    </ul>
  );
}

export function Prd() {
  return (
    <DocShell<PrdOutput>
      kind="prd"
      index={`${sectionIndex("prd")} — PRD`}
      title="Product requirements"
      description="A PRD for the MVP, written from the analysis: scoped to what the strategist said to build first."
      includes={["Problem and target users", "User journeys", "Product and functional requirements", "Non-functional, AI and data requirements", "Success metrics", "MVP scope and open questions"]}
      toMarkdown={prdToMarkdown}
    >
      {(p) => (
        <div>
          <nav aria-label="PRD contents" className="no-print mb-12 flex flex-wrap gap-x-5 gap-y-2 border-b border-line pb-4">
            {TOC.map(([id, label]) => (
              <a key={id} href={`#${id}-section`} className="link-underline mono text-[11.5px] text-ink-3 hover:text-ink">
                {label}
              </a>
            ))}
          </nav>

          <p className="display max-w-3xl text-[26px] leading-[1.2] text-ink md:text-[30px]">{p.summary}</p>

          <Block title="Problem" id="problem" className="mt-14">
            <p className="measure text-[15.5px] leading-relaxed text-ink">{p.problem}</p>
          </Block>

          <Block title="Target users" id="users">
            <div className="grid gap-8 sm:grid-cols-2">
              {p.targetUsers.map((u) => (
                <div key={u.segment}>
                  <p className="text-[16px] text-ink">{u.segment}</p>
                  <ul className="mt-2 space-y-1 text-[14px] text-ink-2">
                    {u.needs.map((n) => (
                      <li key={n}>— {n}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Block>

          <Block title="User journeys" id="journeys">
            <div className="space-y-10">
              {p.journeys.map((j) => (
                <div key={j.name}>
                  <p className="mb-4 text-[16px] text-ink">{j.name}</p>
                  <ol className="flex flex-col gap-0 md:flex-row md:flex-wrap md:gap-y-4">
                    {j.steps.map((s, i) => (
                      <li key={s} className="flex items-baseline gap-3 border-l border-line py-1.5 pl-4 md:w-1/3 md:border-l-0 md:border-t md:pl-0 md:pr-4 md:pt-3 lg:w-1/5">
                        <span className="mono text-[10.5px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                        <span className="text-[13.5px] leading-snug text-ink-2">{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Product requirements" id="product">
            <Requirements items={p.productRequirements} />
          </Block>
          <Block title="Functional requirements" id="functional">
            <Requirements items={p.functionalRequirements} />
          </Block>

          <Block title="Non-functional requirements" id="nfr">
            <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
              {p.nonFunctionalRequirements.map((r) => (
                <div key={r.category + r.requirement}>
                  <dt className="label">{r.category}</dt>
                  <dd className="mt-1.5 text-[14px] leading-relaxed text-ink">{r.requirement}</dd>
                </div>
              ))}
            </dl>
          </Block>

          <Block title="AI requirements" id="ai">
            {p.aiRequirements.length ? (
              <ul className="border-t border-line">
                {p.aiRequirements.map((r) => (
                  <li key={r.capability} className="grid gap-x-8 gap-y-2 border-b border-line py-4 md:grid-cols-[10rem_1fr_1fr]">
                    <span className="text-[15px] text-ink">{r.capability}</span>
                    <span className="text-[14px] leading-relaxed text-ink-2">{r.requirement}</span>
                    <span className="text-[13.5px] leading-relaxed text-ink-3">
                      <span className="label mr-2">Eval</span>
                      {r.evaluation}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-ink-3">The MVP doesn&apos;t need AI capabilities.</p>
            )}
          </Block>

          <Block title="Data requirements" id="data">
            <ul className="border-t border-line">
              {p.dataRequirements.map((d) => (
                <li key={d.entity} className="grid gap-x-8 gap-y-1 border-b border-line py-4 md:grid-cols-[10rem_1fr_1fr]">
                  <span className="text-[15px] text-ink">{d.entity}</span>
                  <span className="text-[14px] text-ink-2">{d.source}</span>
                  <span className="text-[13.5px] text-ink-3">{d.handling}</span>
                </li>
              ))}
            </ul>
          </Block>

          <Block title="Success metrics" id="metrics">
            <div className="grid gap-8 sm:grid-cols-2">
              {p.successMetrics.map((m) => (
                <div key={m.metric} className="border-t border-ink pt-4">
                  <p className="label">{m.metric}</p>
                  <p className="mt-2 text-[18px] leading-snug text-ink">{m.target}</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{m.why}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[12.5px] text-ink-3">Targets are goals for the MVP, not market data.</p>
          </Block>

          <Block title="MVP scope" id="scope">
            <div className="grid gap-10 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[15px] text-ink">In scope</p>
                <NumberedList items={p.mvpScope.inScope} />
              </div>
              <div>
                <p className="mb-2 text-[15px] text-ink-3">Out of scope</p>
                <NumberedList items={p.mvpScope.outOfScope} muted />
              </div>
            </div>
          </Block>

          {p.openQuestions.length > 0 && (
            <Block title="Open questions" id="questions">
              <ul className="grid gap-3 sm:grid-cols-2">
                {p.openQuestions.map((q) => (
                  <li key={q} className="border-l border-dashed border-line-2 pl-3 text-[14px] leading-relaxed text-ink-2">
                    {q}
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </div>
      )}
    </DocShell>
  );
}
