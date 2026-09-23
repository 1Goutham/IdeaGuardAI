"use client";

import { STAGE_COPY } from "@/lib/agents/pipeline";
import { useProjectActions } from "@/lib/store/ProjectsProvider";
import { Button, IconRetry, StatusDot } from "@/components/ui";
import { SectionHeader } from "@/components/report/Section";
import type { Analysis, StageId } from "@/types";
import { useWorkspace } from "./WorkspaceContext";

/**
 * Renders a section once its stage has produced data, and an honest state
 * otherwise: queued, running (with the real progress note), failed (with a
 * retry that re-runs only what's needed), or not yet run.
 */
export function StageGate<S extends StageId>({
  stage,
  header,
  children,
}: {
  stage: S;
  /** Shown above the waiting / error state so the section keeps its identity. */
  header: { index: string; title: string };
  children: (data: NonNullable<Analysis[S]>) => React.ReactNode;
}) {
  const { project, version } = useWorkspace();
  const data = version.analysis[stage];
  const state = version.stages[stage];
  if (data && state.status === "done") return <>{children(data as NonNullable<Analysis[S]>)}</>;
  return (
    <article>
      <SectionHeader index={header.index} title={header.title} />
      <StageState projectId={project.id} versionId={version.id} stage={stage} />
    </article>
  );
}

export function StageState({ projectId, versionId, stage }: { projectId: string; versionId: string; stage: StageId }) {
  const { version, isRunning } = useWorkspace();
  const { retryStage, analyse } = useProjectActions();
  const state = version.stages[stage];
  const copy = STAGE_COPY[stage];

  if (state.status === "running" || state.status === "queued") {
    return (
      <div className="border-y border-line py-10" aria-live="polite" aria-busy="true">
        <div className="flex items-center gap-3">
          <StatusDot status={state.status} />
          <p className="text-[16px] text-ink">{state.status === "running" ? `${copy.running}…` : `Waiting to start: ${copy.running.toLowerCase()}`}</p>
        </div>
        <p className="mono mt-2 pl-6 text-[11px] text-ink-3">
          {copy.agent}
          {state.note ? ` · ${state.note}` : ""}
        </p>
        <div className="mt-8 space-y-3 pl-6" aria-hidden="true">
          <div className="h-2.5 w-[70%] rounded-sm animate-shimmer" />
          <div className="h-2.5 w-[88%] rounded-sm animate-shimmer" />
          <div className="h-2.5 w-[54%] rounded-sm animate-shimmer" />
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="border-y border-line py-10" role="alert">
        <div className="flex items-center gap-3">
          <StatusDot status="error" />
          <p className="text-[16px] text-ink">{copy.agent} didn&apos;t finish.</p>
        </div>
        <p className="mt-2 max-w-lg pl-6 text-[14px] leading-relaxed text-ink-3">{state.error}</p>
        <div className="mt-6 pl-6">
          <Button size="sm" onClick={() => retryStage(projectId, versionId, stage)} disabled={isRunning}>
            <IconRetry size={14} /> Retry this step
          </Button>
          <p className="mono mt-3 text-[11px] text-ink-4">Completed steps are kept. Only this step and what depends on it will re-run.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-y border-line py-10">
      <p className="text-[16px] text-ink">Not analysed yet.</p>
      <div className="mt-6">
        <Button size="sm" variant="primary" onClick={() => analyse(projectId, versionId)} disabled={isRunning}>
          Run analysis
        </Button>
      </div>
    </div>
  );
}
