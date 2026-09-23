"use client";

import Link from "next/link";
import { isComplete, STAGE_COPY } from "@/lib/agents/pipeline";
import { tallyEvidence } from "@/lib/scoring/evidence";
import { useProjectActions } from "@/lib/store/ProjectsProvider";
import { formatDate } from "@/lib/utils";
import { Button, Disclosure, IconArrowRight, IconRetry, StatusDot, TextAction } from "@/components/ui";
import { Block, Facts, NumberedList, SectionHeader } from "@/components/report/Section";
import { SignalList } from "@/components/report/Signals";
import { StanceTag } from "@/components/report/StanceTag";
import { STAGE_IDS } from "@/types";
import { AnalysisProgress } from "./AnalysisProgress";
import { useWorkspace } from "./WorkspaceContext";

export function Overview() {
  const { project, version, isRunning, openRefine, href } = useWorkspace();
  const { retryStage, analyse } = useProjectActions();
  const a = version.analysis;
  const complete = isComplete(version.stages);
  const failed = STAGE_IDS.filter((id) => version.stages[id].status === "error");

  if (isRunning || (!complete && !failed.length && !a.strategy)) return <AnalysisProgress />;

  const u = a.understand;
  if (!u) return <AnalysisProgress />;
  const tally = tallyEvidence(a);
  const s = a.strategy;
  const critic = a.critic;
  const biggest = critic?.assumptions.find((x) => x.id === critic.biggestAssumptionId);
  const questions = [...u.unclear, ...(a.research?.openQuestions ?? [])];

  return (
    <article className="animate-fade">
      <SectionHeader
        index={`01 — Overview · v${version.number}`}
        title={u.title}
        description={u.oneLiner}
        meta={
          <>
            <span>Analysed {formatDate(version.stages.understand.finishedAt ?? version.createdAt)}</span>
            <span>{a.research ? (a.research.mode === "live" ? `${a.research.sources.length} sources via ${a.research.provider}` : "Research offline · model knowledge only") : "Research pending"}</span>
            <span>
              {tally.sourced} sourced · {tally.inferred} inferred
            </span>
          </>
        }
      />

      {failed.length > 0 && (
        <div role="alert" className="mb-14 border-y border-line py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-[15px] text-ink">
              {failed.length === 1 ? "One step" : `${failed.length} steps`} didn&apos;t complete. The rest of the report is below.
            </p>
            {failed.length > 1 && (
              <Button size="sm" variant="primary" onClick={() => analyse(project.id, version.id)} disabled={isRunning}>
                <IconRetry size={14} /> Resume analysis
              </Button>
            )}
          </div>
          <ul className="mt-3 space-y-2">
            {failed.map((id) => (
              <li key={id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px]">
                <StatusDot status="error" />
                <span className="text-ink-2">{STAGE_COPY[id].agent}</span>
                <span className="text-ink-3">{version.stages[id].error}</span>
                <TextAction onClick={() => retryStage(project.id, version.id, id)} disabled={isRunning}>
                  <IconRetry size={12} /> Retry
                </TextAction>
              </li>
            ))}
          </ul>
        </div>
      )}

      {s && (
        <section aria-labelledby="rec-title" className="mb-16">
          <div className="flex items-center gap-3">
            <h2 id="rec-title" className="label">
              Recommendation
            </h2>
            <StanceTag stance={s.stance} />
          </div>
          <p className="display mt-5 max-w-3xl text-[28px] leading-[1.12] text-ink md:text-[36px]">{s.headline}</p>
          <p className="measure mt-5 text-[15px] leading-relaxed text-ink-2">{s.reasoning}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm" onClick={() => openRefine(s.refinedIdea)}>
              Refine with this in mind <IconArrowRight size={14} className="nudge" />
            </Button>
            <Link href={href("mvp")} className="group inline-flex h-8 items-center gap-1.5 px-2 text-[13px] text-ink-2 hover:text-ink">
              <span className="link-underline">See the MVP</span>
            </Link>
          </div>
        </section>
      )}

      <Block title="The idea, understood" id="idea">
        <Facts
          items={[
            { label: "Problem", value: u.problem },
            { label: "Target user", value: u.targetUser },
            { label: "Proposed solution", value: u.solution },
            { label: "Value proposition", value: u.valueProposition },
            { label: "Category", value: u.category },
            { label: "Product type", value: u.productType },
          ]}
        />
        <Disclosure summary={<span className="text-[13.5px] text-ink-2">Idea as you wrote it</span>} className="mt-10">
          <p className="measure whitespace-pre-wrap border-l border-line-2 pl-4 text-[14.5px] leading-relaxed text-ink-2">{version.idea}</p>
        </Disclosure>
      </Block>

      <Block title="Opportunity signals" id="signals" aside={s ? "Revised after research and critique" : "First read, before research"}>
        <SignalList signals={s?.signals ?? u.signals} firstRead={s ? u.signals : undefined} />
        <p className="mt-4 max-w-2xl text-[12.5px] leading-relaxed text-ink-3">
          Levels describe magnitude, not quality. They are judgements, not measurements, so they are never combined into a score.
        </p>
      </Block>

      <Block title="Evidence behind this report" id="evidence">
        <dl className="grid grid-cols-2 border-t border-line md:grid-cols-4">
          {[
            { k: "Sourced statements", v: tally.sourced, hint: "Backed by a retrieved page" },
            { k: "Inferences", v: tally.inferred, hint: "Model reasoning, no source" },
            { k: "Sources read", v: tally.sources, hint: a.research?.mode === "live" ? `Last researched ${formatDate(a.research.researchedAt)}` : "Live research was off" },
            { k: "Competitors verified", v: `${tally.verifiedCompetitors}/${tally.verifiedCompetitors + tally.unverifiedCompetitors}`, hint: "Named in a source" },
          ].map((x, i) => (
            <div key={x.k} className={`border-b border-line py-5 ${i % 2 ? "pl-5" : "pr-5"} md:px-5 md:first:pl-0 ${i > 0 ? "md:border-l" : ""}`}>
              <dt className="label">{x.k}</dt>
              <dd className="display tabular mt-3 text-[40px] text-ink">{x.v}</dd>
              <dd className="mt-1 text-[12px] text-ink-3">{x.hint}</dd>
            </div>
          ))}
        </dl>
      </Block>

      {biggest && (
        <Block title="Biggest assumption" id="assumption">
          <blockquote className="display max-w-3xl text-[26px] leading-[1.15] text-ink md:text-[32px]">“{biggest.statement}”</blockquote>
          <p className="measure mt-4 text-[14.5px] leading-relaxed text-ink-2">{biggest.whyItMayFail}</p>
          <Link href={href("stress-test")} className="group mt-5 inline-flex items-center gap-1.5 text-[13.5px] text-ink">
            <span className="link-underline">Open the stress test</span> <IconArrowRight size={14} className="nudge" />
          </Link>
        </Block>
      )}

      {s && (
        <Block title="Next steps" id="next">
          <NumberedList items={s.nextSteps} />
        </Block>
      )}

      {questions.length > 0 && (
        <Block title="Still unclear" id="unclear" aside="Worth answering before you build">
          <ul className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
            {questions.map((q) => (
              <li key={q} className="border-l border-dashed border-line-2 pl-3 text-[14px] leading-relaxed text-ink-2">
                {q}
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block title="How this was produced" id="engine">
        <ul className="border-t border-line">
          {STAGE_IDS.map((id) => {
            const st = version.stages[id];
            return (
              <li key={id} className="grid grid-cols-[1.5rem_1fr_auto] items-baseline gap-3 border-b border-line py-2.5 text-[13px]">
                <StatusDot status={st.status} />
                <span className="text-ink-2">{STAGE_COPY[id].agent}</span>
                <span className="mono truncate text-right text-[11px] text-ink-3">{st.engine ?? (st.status === "error" ? "failed" : "—")}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 max-w-2xl text-[12.5px] leading-relaxed text-ink-3">
          Each agent is a separate structured call validated against a schema. Citations are checked in code: a reference to a source that wasn&apos;t retrieved is removed, and anything left without a source is labelled as inference.
        </p>
      </Block>
    </article>
  );
}
