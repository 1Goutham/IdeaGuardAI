"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { STAGE_COPY } from "@/lib/agents/pipeline";
import { useProjectActions } from "@/lib/store/ProjectsProvider";
import { cx } from "@/lib/utils";
import { TextAction } from "@/components/ui";
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
  const done = STAGE_IDS.filter((id) => version.stages[id].status === "done").length;

  return (
    <section aria-labelledby="progress-title" className="animate-fade max-w-[760px]">
      <div className="flex items-baseline justify-between gap-6">
        <h2 id="progress-title" className="text-[20px] font-normal tracking-[-0.01em] text-ink">
          Analysing<span className="caret-blink">_</span>
        </h2>
        <p className="mono tabular text-[11px] text-ink-3" aria-hidden="true">
          {done}/{STAGE_IDS.length} · {elapsed}
        </p>
      </div>
      <p className="mt-2 max-w-xl text-[13.5px] font-light leading-relaxed text-ink-3">
        Seven agents are working through your idea. Sections fill in as each one finishes, so you can open them now.
      </p>

      <div className="mt-6 h-px w-full bg-line" aria-hidden="true">
        <motion.div className="h-px bg-accent shadow-[0_0_12px_rgb(59_123_255/0.8)]" initial={false} animate={{ width: `${Math.max(2, (done / STAGE_IDS.length) * 100)}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
      </div>
      <p className="sr-only" aria-live="polite">
        {done} of {STAGE_IDS.length} steps complete.
      </p>

      <ol className="mono mt-8 space-y-1 text-[12.5px]">
        {STAGE_IDS.map((id, i) => {
          const s = version.stages[id];
          const copy = STAGE_COPY[id];
          const label = s.status === "done" ? copy.done : copy.running;
          const right = s.status === "running" ? (s.note ?? "working") : s.status === "done" ? [s.note, seconds(s)].filter(Boolean).join(" · ") : s.status === "error" ? "unavailable" : "queued";
          return (
            <motion.li key={id} layout className="grid grid-cols-[2.6rem_minmax(0,auto)_1fr_auto] items-baseline gap-2 py-1">
              <span className={cx(s.status === "running" ? "text-accent" : "text-ink-4")}>[{String(i + 1).padStart(2, "0")}]</span>
              <span className={cx("truncate transition-colors duration-500", s.status === "done" ? "text-ink-2" : s.status === "running" ? "text-ink" : s.status === "error" ? "text-danger" : "text-ink-4")}>
                {label}
                {s.status === "running" && <span className="caret-blink">_</span>}
              </span>
              <span className="h-px translate-y-[-3px] border-b border-dotted border-line-2" aria-hidden="true" />
              <span className={cx("text-right text-[11px]", s.status === "done" ? "text-ink-3" : s.status === "running" ? "text-ink-2" : s.status === "error" ? "text-danger" : "text-ink-4")}>
                {s.status === "done" && <span className="mr-1.5 text-success">✓</span>}
                {right}
              </span>
              {s.status === "error" && s.error && <p className="col-start-2 col-end-5 font-sans text-[12px] font-light text-ink-3">{s.error}</p>}
            </motion.li>
          );
        })}
      </ol>

      <div className="mt-8 flex items-center justify-between gap-6">
        <p className="max-w-md text-[12px] font-light leading-relaxed text-ink-4">
          Competition, feasibility and risk run in parallel once research is in. On free-tier models, steps may pause for rate limits and resume on their own.
        </p>
        {isRunning && <TextAction onClick={() => stop(version.id)}>Stop</TextAction>}
      </div>
    </section>
  );
}
