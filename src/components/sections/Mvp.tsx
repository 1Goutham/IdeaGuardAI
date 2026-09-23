"use client";

import Link from "next/link";
import { IconArrowRight } from "@/components/ui";
import { Block, SectionHeader } from "@/components/report/Section";
import { StanceTag } from "@/components/report/StanceTag";
import { StageGate } from "@/components/workspace/StageGate";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { sectionIndex } from "@/components/workspace/nav";
import { cx } from "@/lib/utils";
import type { StrategyResult } from "@/types";

export function Mvp() {
  return <StageGate stage="strategy" header={{ index: `${sectionIndex("mvp")} — MVP`, title: "The smallest thing worth building" }}>{(s) => <MvpView s={s} />}</StageGate>;
}

function ScopeList({ title, items, muted }: { title: string; items: StrategyResult["mvp"]["buildFirst"]; muted?: boolean }) {
  return (
    <section aria-label={title}>
      <h2 className={cx("border-b pb-3 text-[15px]", muted ? "border-line text-ink-3" : "border-ink text-ink")}>{title}</h2>
      <ol>
        {items.map((x, i) => (
          <li key={x.title} className="grid grid-cols-[2rem_1fr] gap-3 border-b border-line py-4">
            <span className="mono pt-0.5 text-[11px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <p className={cx("text-[16px]", muted ? "text-ink-2" : "text-ink")}>{x.title}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">{x.why}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function MvpView({ s }: { s: StrategyResult }) {
  const { href, version } = useWorkspace();
  return (
    <article className="animate-fade">
      <SectionHeader
        index={`${sectionIndex("mvp")} — MVP`}
        title="The smallest thing worth building"
        description={s.mvp.goal}
        meta={
          <>
            <StanceTag stance={s.stance} />
            <span>Designed to test the biggest assumption first</span>
          </>
        }
      />

      <div className="grid gap-12 md:grid-cols-2 md:gap-14">
        <ScopeList title="Build first" items={s.mvp.buildFirst} />
        <ScopeList title="Don't build yet" items={s.mvp.dontBuildYet} muted />
      </div>

      <Block title="Suggested scope" id="scope">
        <p className="display max-w-3xl text-[24px] leading-[1.25] text-ink md:text-[28px]">{s.mvp.scope}</p>
      </Block>

      <Block title="How you'll know it worked" id="metric">
        <p className="text-[18px] leading-relaxed text-ink">{s.mvp.successMetric}</p>
      </Block>

      <Block title="Positioning" id="positioning">
        <p className="measure border-l border-ink pl-5 text-[16px] leading-relaxed text-ink">{s.positioning.statement}</p>
        <p className="mt-6 text-[14px] text-ink-2">
          <span className="label mr-3">Wedge</span>
          {s.positioning.wedge}
        </p>
      </Block>

      <Block title="Turn it into documents" id="docs">
        <div className="grid gap-6 sm:grid-cols-2">
          {[
            { slug: "prd", title: "Product requirements", body: "Users, journeys, requirements, AI and data needs, metrics.", has: !!version.prd },
            { slug: "architecture", title: "Technical blueprint", body: "Stack, components, APIs, data model and AI guardrails.", has: !!version.blueprint },
          ].map((d) => (
            <Link key={d.slug} href={href(d.slug)} className="group block border-t border-ink pt-4">
              <p className="flex items-center justify-between text-[16px] text-ink">
                {d.title} <IconArrowRight size={16} className="nudge" />
              </p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">{d.body}</p>
              <p className="mono mt-3 text-[11px] text-ink-3">{d.has ? "Generated" : "Not generated yet"}</p>
            </Link>
          ))}
        </div>
      </Block>
    </article>
  );
}
