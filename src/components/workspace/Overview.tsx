"use client";

import Link from "next/link";
import { isComplete, STAGE_COPY } from "@/lib/agents/pipeline";
import { tallyEvidence } from "@/lib/scoring/evidence";
import { useProjectActions } from "@/lib/store/ProjectsProvider";
import { formatDate } from "@/lib/utils";
import { Disclosure, IconArrowRight, IconRetry, LoopArrow, Pill, StatusDot, TextAction } from "@/components/ui";
import { Block, Facts, NumberedList } from "@/components/report/Section";
import { SignalList } from "@/components/report/Signals";
import { StanceTag } from "@/components/report/StanceTag";
import { STAGE_IDS } from "@/types";
import { AnalysisProgress } from "./AnalysisProgress";
import { PipelineTrace } from "./PipelineTrace";
import { useWorkspace } from "./WorkspaceContext";

export function Overview() {
  const { project, version, isRunning, openRefine, href, readOnly } = useWorkspace();
  const { retryStage, analyse } = useProjectActions();
  const a = version.analysis;
  const complete = isComplete(version.stages);
  const failed = STAGE_IDS.filter((id) => version.stages[id].status === "error");

  if (!readOnly && (isRunning || (!complete && !failed.length && !a.strategy))) return <AnalysisProgress />;

  const u = a.understand;
  if (!u) return readOnly ? null : <AnalysisProgress />;
  const tally = tallyEvidence(a);
  const s = a.strategy;
  const critic = a.critic;
  const biggest = critic?.assumptions.find((x) => x.id === critic.biggestAssumptionId);
  const questions = [...u.unclear, ...(a.research?.openQuestions ?? [])];

  return (
    <article className="animate-fade">
      {failed.length > 0 && (
        <div role="alert" className="mb-12 rounded-xl border border-line-2 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-[14px] text-ink">
              {failed.length === 1 ? "One step" : `${failed.length} steps`} didn&apos;t complete. The rest of the report is below.
            </p>
            {failed.length > 1 && !readOnly && (
              <Pill small onClick={() => analyse(project.id, version.id)} disabled={isRunning} arrow={false}>
                <IconRetry size={13} /> Resume analysis
              </Pill>
            )}
          </div>
          <ul className="mt-3 space-y-1.5">
            {failed.map((id) => (
              <li key={id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                <StatusDot status="error" />
                <span className="text-ink-2">{STAGE_COPY[id].agent}</span>
                <span className="font-light text-ink-3">{version.stages[id].error}</span>
                {!readOnly && (
                  <TextAction onClick={() => retryStage(project.id, version.id, id)} disabled={isRunning}>
                    Retry
                  </TextAction>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* The verdict, then the idea in four facts: the whole report in one screen. */}
      <section aria-label="Summary" className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
        <div>
          {s ? (
            <>
              <div className="flex items-center gap-3">
                <h2 className="mono text-[10.5px] text-ink-4">Recommendation</h2>
                <StanceTag stance={s.stance} />
              </div>
              <p className="mt-4 text-[16px] leading-snug text-ink">{s.headline}</p>
              <p className="mt-3 text-[13.5px] font-light leading-[1.7] text-ink-2 lg:text-justify lg:hyphens-auto">{s.reasoning}</p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                {!readOnly && (
                  <Pill small onClick={() => openRefine(s.refinedIdea)}>
                    Refine with this in mind
                  </Pill>
                )}
                <Link href={href("mvp")} className="group inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 transition-colors hover:text-ink">
                  <span className="link-underline">See the MVP</span> <LoopArrow size={11} />
                </Link>
              </div>
            </>
          ) : version.stages.strategy.status === "error" ? (
            <>
              <h2 className="mono text-[10.5px] text-ink-4">Recommendation</h2>
              <p className="mt-4 text-[15px] text-ink">○ Unavailable for this run.</p>
              <p className="mt-2 text-[13.5px] font-light leading-relaxed text-ink-3">
                The Product Strategist didn&apos;t complete, so there is no stance or MVP yet. Nothing has been filled in for the missing step.
              </p>
            </>
          ) : (
            <>
              <h2 className="mono text-[10.5px] text-ink-4">The problem</h2>
              <p className="mt-4 text-[14px] font-light leading-[1.7] text-ink-2">{u.problem}</p>
            </>
          )}
          <p className="mono mt-8 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-ink-4">
            <span>Analysed {formatDate(version.stages.understand.finishedAt ?? version.createdAt)}</span>
            <span>{a.research ? (a.research.mode === "live" ? `${a.research.sources.length} sources via ${a.research.provider}` : "Research offline") : "Research pending"}</span>
            <span>
              {tally.sourced} sourced · {tally.inferred} inferred
            </span>
          </p>
        </div>
        <Facts
          single className="content-start"
          items={[
            { label: "Problem", value: u.problem },
            { label: "Proposed solution", value: u.solution },
          ]}
        />
        <Facts
          single className="content-start"
          items={[
            { label: "Target user", value: u.targetUser },
            {
              label: "Category",
              value: (
                <>
                  {u.category}
                  <br />
                  {u.productType}
                </>
              ),
            },
            { label: "Value", value: u.valueProposition },
          ]}
        />
      </section>

      <Disclosure summary={<span className="text-[13px] font-light text-ink-3">Idea as you wrote it</span>} className="mt-12">
        <p className="measure whitespace-pre-wrap border-l border-line-2 pl-4 text-[13.5px] font-light leading-relaxed text-ink-2">{version.idea}</p>
      </Disclosure>

      <Block title="Opportunity signals" id="signals" aside={s ? "Revised after research and critique" : "First read, before research"}>
        <SignalList signals={s?.signals ?? u.signals} firstRead={s ? u.signals : undefined} />
        <p className="mt-4 max-w-2xl text-[12.5px] leading-relaxed text-ink-3">
          Levels describe magnitude, not quality. They are judgements, not measurements, so they are never combined into a score.
        </p>
      </Block>

      <Block title="Evidence behind this report" id="evidence">
        <dl className="grid grid-cols-2 border-t border-line md:grid-cols-5">
          {[
            { k: "Sourced statements", v: tally.sourced, hint: "Backed by a retrieved page" },
            { k: "Inferences", v: tally.inferred, hint: "Model reasoning, no source" },
            { k: "Sources read", v: tally.sources, hint: a.research?.mode === "live" ? `Last researched ${formatDate(a.research.researchedAt)}` : "Live research was off" },
            { k: "Competitors verified", v: `${tally.verifiedCompetitors}/${tally.verifiedCompetitors + tally.unverifiedCompetitors}`, hint: "Named in a source" },
            { k: "Unavailable", v: failed.length, hint: failed.length ? failed.map((id) => STAGE_COPY[id].label).join(", ") : "Every step completed" },
          ].map((x, i) => (
            <div key={x.k} className={`border-b border-line py-5 ${i % 2 ? "pl-5" : "pr-5"} md:px-4 md:first:pl-0 ${i > 0 ? "md:border-l" : ""}`}>
              <dt className="label">{x.k}</dt>
              <dd className="display tabular mt-3 text-[28px] text-ink">{x.v}</dd>
              <dd className="mt-1 text-[12px] text-ink-3">{x.hint}</dd>
            </div>
          ))}
        </dl>
      </Block>

      {biggest && (
        <Block title="Biggest assumption" id="assumption">
          <blockquote className="display max-w-3xl text-[19px] leading-[1.35] text-ink md:text-[22px]">“{biggest.statement}”</blockquote>
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
        <PipelineTrace projectId={project.id} version={version} isRunning={isRunning} readOnly={readOnly} />
      </Block>
    </article>
  );
}
