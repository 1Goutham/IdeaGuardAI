"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { STAGE_COPY } from "@/lib/agents/pipeline";
import { useProjectActions } from "@/lib/store/ProjectsProvider";
import { cx } from "@/lib/utils";
import { StatusDot, TextAction } from "@/components/ui";
import { STAGE_IDS, type StageState } from "@/types";
import { useWorkspace } from "./WorkspaceContext";

function seconds(s: StageState): string | null {
  if (!s.startedAt || !s.finishedAt) return null;
  return `${Math.max(1, Math.round((new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()) / 1000))}s`;
}

function useElapsed(since: string | undefined, active: boolean): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  if (!since) return "00:00";
  const s = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The analysis as it happens. Every line maps to a real pipeline stage and
 * changes only when the server reports it; nothing here is simulated.
 */
export function AnalysisProgress() {
  const { version, isRunning } = useWorkspace();
  const { stop } = useProjectActions();
  const startedAt = STAGE_IDS.map((id) => version.stages[id].startedAt).filter(Boolean).sort()[0];
  const elapsed = useElapsed(startedAt ?? version.createdAt, isRunning);
  const understood = version.analysis.understand;
  const done = STAGE_IDS.filter((id) => version.stages[id].status === "done").length;

  return (
    <section aria-labelledby="progress-title" className="animate-fade">
      <div className="flex items-baseline justify-between gap-6">
        <p id="progress-title" className="label">
          Analysing your idea
        </p>
        <p className="mono tabular text-[11px] text-ink-3" aria-hidden="true">
          {elapsed}
        </p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.h1
          key={understood ? "understood" : "raw"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={cx("display mt-5 max-w-3xl text-ink", understood ? "text-[34px] md:text-[48px]" : "text-[26px] text-ink-2 md:text-[34px]")}
        >
          {understood ? understood.oneLiner : `“${version.idea.length > 180 ? `${version.idea.slice(0, 180)}…` : version.idea}”`}
        </motion.h1>
      </AnimatePresence>

      <div className="mt-3 h-px w-full bg-line" aria-hidden="true">
        <motion.div className="h-px bg-ink" initial={false} animate={{ width: `${(done / STAGE_IDS.length) * 100}%` }} />
      </div>
      <p className="sr-only" aria-live="polite">
        {done} of {STAGE_IDS.length} steps complete.
      </p>

      <ol className="mt-10">
        {STAGE_IDS.map((id) => {
          const s = version.stages[id];
          const copy = STAGE_COPY[id];
          const label = s.status === "done" ? copy.done : copy.running;
          return (
            <li key={id} className="grid grid-cols-[1.5rem_1fr_auto] items-baseline gap-3 border-b border-line py-3.5 first:border-t">
              <StatusDot status={s.status} className="translate-y-[2px]" />
              <div className="min-w-0">
                <p className={cx("text-[15.5px] transition-colors duration-500", s.status === "done" ? "text-ink" : s.status === "running" ? "text-ink" : s.status === "error" ? "text-danger" : "text-ink-4")}>
                  {label}
                  {s.status === "running" && <span aria-hidden="true">…</span>}
                </p>
                {s.status === "error" && s.error && <p className="mt-1 text-[12.5px] text-ink-3">{s.error}</p>}
              </div>
              <p className="mono text-right text-[11px] text-ink-3">
                {s.status === "running" ? (s.note ?? copy.agent) : s.status === "done" ? [s.note, seconds(s)].filter(Boolean).join(" · ") : s.status === "queued" ? "" : ""}
              </p>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex items-center justify-between gap-6">
        <p className="max-w-md text-[12.5px] leading-relaxed text-ink-3">
          Competition, feasibility and risk run in parallel once research is in. Sections fill in as each agent finishes; you can open them now. On free-tier models, steps may pause for rate limits; they resume on their own.
        </p>
        {isRunning && <TextAction onClick={() => stop(version.id)}>Stop</TextAction>}
      </div>
    </section>
  );
}
