"use client";

import { Fragment } from "react";
import { blueprintToMarkdown } from "@/lib/utils/markdown";
import { cx } from "@/lib/utils";
import { Block, NumberedList } from "@/components/report/Section";
import { DocShell } from "@/components/report/DocShell";
import { sectionIndex } from "@/components/workspace/nav";
import type { BlueprintOutput } from "@/types";

/** Layers from client to external services, drawn as a vertical flow. */
function LayerDiagram({ layers }: { layers: BlueprintOutput["layers"] }) {
  return (
    <figure aria-label="Architecture layers">
      <ol>
        {layers.map((layer, i) => (
          <Fragment key={layer.id + i}>
            <li className={cx("grid gap-3 md:grid-cols-[9rem_minmax(0,1fr)] md:gap-6", layer.id === "ai" && "relative")}>
              <div className="flex items-baseline gap-3 md:block md:pt-3">
                <span className="mono text-[10.5px] text-ink-3">L{i + 1}</span>
                <p className="text-[15px] text-ink md:mt-1">{layer.name}</p>
              </div>
              <ul className={cx("grid gap-2 rounded-md border p-2 sm:grid-cols-2 lg:grid-cols-3", layer.id === "ai" ? "border-ink" : "border-line-2")}>
                {layer.items.map((item) => (
                  <li key={item.name} className="rounded-[5px] bg-surface px-3 py-2.5">
                    <p className="text-[13.5px] text-ink">{item.name}</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-ink-3">{item.role}</p>
                  </li>
                ))}
              </ul>
            </li>
            {i < layers.length - 1 && (
              <li aria-hidden="true" className="grid md:grid-cols-[9rem_minmax(0,1fr)] md:gap-6">
                <span />
                <span className="flex h-8 items-center justify-center">
                  <svg width="10" height="28" viewBox="0 0 10 28" className="text-ink-3">
                    <path d="M5 0v26M1 22l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                </span>
              </li>
            )}
          </Fragment>
        ))}
      </ol>
    </figure>
  );
}

const METHOD_WIDTH = "w-[4.25rem]";

export function Architecture() {
  return (
    <DocShell<BlueprintOutput>
      kind="blueprint"
      index={`${sectionIndex("architecture")} — Architecture`}
      title="Technical blueprint"
      description="A pragmatic architecture for the MVP: what to build, with what, and where the technical risk sits."
      includes={["Layered architecture", "Stack with rationale", "Core API endpoints", "Data model and data flow", "AI components and guardrails", "Technical risks"]}
      toMarkdown={blueprintToMarkdown}
    >
      {(b) => (
        <div>
          <p className="display max-w-3xl text-[24px] leading-[1.25] text-ink md:text-[28px]">{b.summary}</p>

          <Block title="Architecture" id="layers" className="mt-14">
            <LayerDiagram layers={b.layers} />
          </Block>

          <Block title="Stack" id="stack">
            <ul className="border-t border-line">
              {b.stack.map((s) => (
                <li key={s.area + s.choice} className="grid gap-x-8 gap-y-1 border-b border-line py-4 md:grid-cols-[9rem_12rem_minmax(0,1fr)]">
                  <span className="label pt-0.5">{s.area}</span>
                  <span className="text-[15px] text-ink">{s.choice}</span>
                  <span className="text-[13.5px] leading-relaxed text-ink-3">{s.why}</span>
                </li>
              ))}
            </ul>
          </Block>

          <Block title="Data flow" id="flow">
            <NumberedList items={b.dataFlow} />
          </Block>

          <Block title="API" id="api">
            <ul className="border-t border-line">
              {b.apis.map((a) => (
                <li key={a.method + a.path} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line py-3">
                  <span className={cx("mono text-[11px] text-ink-3", METHOD_WIDTH)}>{a.method}</span>
                  <code className="mono text-[13px] text-ink">{a.path}</code>
                  <span className="text-[13.5px] text-ink-3 md:ml-auto">{a.purpose}</span>
                </li>
              ))}
            </ul>
          </Block>

          <Block title="Data model" id="model">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {b.dataModel.map((d) => (
                <div key={d.entity} className="rounded-md border border-line-2">
                  <p className="border-b border-line px-3 py-2 text-[14px] text-ink">{d.entity}</p>
                  <ul className="mono space-y-1 px-3 py-2.5 text-[11.5px] text-ink-2">
                    {d.fields.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Block>

          <Block title="AI components" id="ai">
            {b.aiComponents.length ? (
              <ul className="border-t border-line">
                {b.aiComponents.map((c) => (
                  <li key={c.name} className="border-b border-line py-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                      <p className="text-[16px] text-ink">{c.name}</p>
                      <p className="mono text-[11px] text-ink-3">{c.approach}</p>
                    </div>
                    <p className="mt-2 text-[14px] text-ink-2">
                      {c.input} <span className="text-ink-4">→</span> {c.output}
                    </p>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">
                      <span className="label mr-2">Guardrails</span>
                      {c.guardrails}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-ink-3">No AI components are needed for the MVP.</p>
            )}
          </Block>

          <Block title="Technical risks" id="risks">
            <ul className="border-t border-line">
              {b.risks.map((r) => (
                <li key={r.risk} className="grid gap-x-8 gap-y-1 border-b border-line py-4 md:grid-cols-2">
                  <span className="text-[15px] text-ink">{r.risk}</span>
                  <span className="text-[14px] leading-relaxed text-ink-2">{r.mitigation}</span>
                </li>
              ))}
            </ul>
          </Block>
        </div>
      )}
    </DocShell>
  );
}
