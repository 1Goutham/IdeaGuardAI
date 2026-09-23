"use client";

import { useState } from "react";
import { useProjectActions } from "@/lib/store/ProjectsProvider";
import { cx, formatDateTime } from "@/lib/utils";
import { Button, LevelMeter, Segmented, Textarea } from "@/components/ui";
import { Block, SectionHeader } from "@/components/report/Section";
import { StageGate } from "@/components/workspace/StageGate";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { sectionIndex } from "@/components/workspace/nav";
import type { CriticOutput, ExperimentStatus } from "@/types";

const STATUS: { value: ExperimentStatus; label: string }[] = [
  { value: "unknown", label: "Unknown" },
  { value: "testing", label: "Testing" },
  { value: "validated", label: "Validated" },
  { value: "invalidated", label: "Invalidated" },
];

export function Experiments() {
  return <StageGate stage="critic" header={{ index: `${sectionIndex("experiments")} — Experiments`, title: "Test before you build" }}>{(c) => <ExperimentsView c={c} />}</StageGate>;
}

function ExperimentsView({ c }: { c: CriticOutput }) {
  const { version, openRefine } = useWorkspace();
  const statusOf = (id: string): ExperimentStatus => version.experiments[id]?.status ?? "unknown";
  const counts = Object.fromEntries(STATUS.map((s) => [s.value, c.experiments.filter((e) => statusOf(e.id) === s.value).length])) as Record<ExperimentStatus, number>;
  const total = c.experiments.length || 1;
  const invalidated = c.experiments.filter((e) => statusOf(e.id) === "invalidated");

  return (
    <article className="animate-fade">
      <SectionHeader
        index={`${sectionIndex("experiments")} — Experiments`}
        title="Test before you build"
        description="One cheap, falsifiable experiment for each assumption that matters. Decide the success threshold before you run it, then record what happened."
        meta={<span>Saved in this browser as you go</span>}
      />

      <section aria-label="Experiment progress" className="mb-14">
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
          <span className="h-full bg-ink transition-[width] duration-500" style={{ width: `${(counts.validated / total) * 100}%` }} />
          <span className="h-full bg-danger transition-[width] duration-500" style={{ width: `${(counts.invalidated / total) * 100}%` }} />
          <span className="h-full bg-ink-3 transition-[width] duration-500" style={{ width: `${(counts.testing / total) * 100}%` }} />
        </div>
        <p className="mono mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-ink-3" aria-live="polite">
          <span className="text-ink">{counts.validated} validated</span>
          <span className="text-danger">{counts.invalidated} invalidated</span>
          <span>{counts.testing} testing</span>
          <span>{counts.unknown} not started</span>
        </p>
      </section>

      {invalidated.length > 0 && (
        <div className="mb-14 border-l border-danger pl-4">
          <p className="text-[15px] text-ink">
            {invalidated.length === 1 ? "An assumption was invalidated." : `${invalidated.length} assumptions were invalidated.`} That&apos;s the process working.
          </p>
          <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-ink-3">Refine the idea around what you learned and IdeaGuard will analyse the new version alongside this one.</p>
          <Button size="sm" className="mt-4" onClick={() => openRefine()}>
            Refine the idea
          </Button>
        </div>
      )}

      <Block title="Experiments" id="list" aside={`${c.experiments.length} planned`}>
        <ol className="border-t border-line">
          {c.experiments.map((e) => (
            <ExperimentRow key={e.id} e={e} assumption={c.assumptions.find((a) => a.id === e.assumptionId)} biggest={e.assumptionId === c.biggestAssumptionId} />
          ))}
        </ol>
      </Block>
    </article>
  );
}

function ExperimentRow({ e, assumption, biggest }: { e: CriticOutput["experiments"][number]; assumption?: CriticOutput["assumptions"][number]; biggest: boolean }) {
  const { project, version } = useWorkspace();
  const { setExperiment } = useProjectActions();
  const state = version.experiments[e.id];
  const status = state?.status ?? "unknown";
  // Local draft only while editing; otherwise show what's saved.
  const [draft, setDraft] = useState<string | null>(null);
  const saved = state?.result ?? "";
  const result = draft ?? saved;

  const save = () => {
    if (draft !== null && draft !== saved) setExperiment(project.id, version.id, e.id, { result: draft });
    setDraft(null);
  };

  return (
    <li className="border-b border-line py-8">
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0">
          <p className="mono flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
            {e.id} · tests {e.assumptionId}
            {biggest && (
              <span className="inline-flex items-center gap-1.5 text-ink-2">
                <span className="size-1.5 rounded-full bg-accent ring-1 ring-ink" aria-hidden="true" /> biggest assumption
              </span>
            )}
          </p>
          {assumption && <p className="mt-2 text-[13.5px] italic leading-relaxed text-ink-3">“{assumption.statement}”</p>}
          <h3 className="mt-3 text-[20px] leading-snug text-ink">{e.title}</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{e.method}</p>

          <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div>
              <dt className="label">Expected signal</dt>
              <dd className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{e.expectedSignal}</dd>
            </div>
            <div>
              <dt className="label">Success criteria</dt>
              <dd className="mt-1.5 text-[14px] leading-relaxed text-ink">{e.successCriteria}</dd>
            </div>
          </dl>
          <p className="mono mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-ink-3">
            <span className="inline-flex items-center gap-2">
              Effort <LevelMeter level={e.effort} label={`Effort ${e.effort}`} />
            </span>
            <span>{e.timeframe}</span>
          </p>
        </div>

        <div className={cx("border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0")}>
          <p className="label" id={`status-${e.id}`}>
            Status
          </p>
          <Segmented<ExperimentStatus>
            ariaLabel={`Status of ${e.title}`}
            value={status}
            onChange={(v) => setExperiment(project.id, version.id, e.id, { status: v })}
            options={STATUS}
            layout="grid"
            className="mt-2"
          />
          <label htmlFor={`result-${e.id}`} className="label mt-6 block">
            Result
          </label>
          <Textarea
            id={`result-${e.id}`}
            autosize
            minRows={3}
            value={result}
            onFocus={() => setDraft(saved)}
            onChange={(ev) => setDraft(ev.target.value)}
            onBlur={save}
            placeholder="What happened? Numbers beat impressions."
            className="mt-2 text-[14px]"
          />
          {state?.updatedAt && <p className="mono mt-2 text-[10.5px] text-ink-4">Updated {formatDateTime(state.updatedAt)}</p>}
        </div>
      </div>
    </li>
  );
}
