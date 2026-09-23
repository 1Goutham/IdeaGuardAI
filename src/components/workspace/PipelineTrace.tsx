"use client";

import { STAGE_COPY } from "@/lib/agents/pipeline";
import { useProjectActions } from "@/lib/store/ProjectsProvider";
import { cx } from "@/lib/utils";
import { Disclosure, IconRetry, StatusDot, TextAction } from "@/components/ui";
import { STANCE_LABEL } from "@/components/report/StanceTag";
import { STAGE_IDS, type IdeaVersion, type StageId, type StageState } from "@/types";
import { ErrorDetails } from "./ErrorDetails";

/** What each step produced, in product language. */
function outcome(id: StageId, v: IdeaVersion): string {
  const a = v.analysis;
  switch (id) {
    case "understand":
      return a.understand ? "Problem, user and solution defined" : "";
    case "research": {
      const n = a.sources?.items.length ?? a.research?.sources.length ?? 0;
      if (!a.research) return "";
      return a.research.mode === "live" ? `${n} sources` : "No live sources · inference only";
    }
    case "competitors": {
      const c = a.competitors?.competitors ?? [];
      return a.competitors ? `${c.length} found · ${c.filter((x) => x.verified).length} verified` : "";
    }
    case "feasibility":
      return a.feasibility ? `${a.feasibility.components.length} components · ${a.feasibility.effort.level} effort` : "";
    case "risks":
      return a.risks ? `${a.risks.risks.length} risks · ${a.risks.regulations.length} regulations` : "";
    case "critic":
      return a.critic ? `${a.critic.assumptions.length} assumptions · ${a.critic.experiments.length} experiments` : "";
    case "strategy":
      return a.strategy ? STANCE_LABEL[a.strategy.stance] : "";
  }
}

function duration(s: StageState): string {
  if (!s.startedAt || !s.finishedAt) return "—";
  const ms = new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime();
  return `${Math.max(0.1, ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
}

/** One sentence a non-technical reader can take away. */
function summary(v: IdeaVersion): string {
  const a = v.analysis;
  const parts: string[] = [];
  const n = a.sources?.items.length ?? a.research?.sources.length ?? 0;
  if (a.research?.mode === "live" && n) parts.push(`read ${n} sources`);
  if (a.competitors?.competitors.length) parts.push(`analysed ${a.competitors.competitors.length} competitors`);
  if (a.risks?.risks.length) parts.push(`identified ${a.risks.risks.length} risks`);
  if (a.critic?.assumptions.length) parts.push(`stress-tested ${a.critic.assumptions.length} assumptions`);
  if (!parts.length) return "";
  const last = parts.pop();
  return `IdeaGuard ${parts.length ? `${parts.join(", ")} and ${last}` : last}.`;
}

export function PipelineTrace({ projectId, version, isRunning }: { projectId: string; version: IdeaVersion; isRunning: boolean }) {
  const { retryStage } = useProjectActions();
  const line = summary(version);
  const totals = STAGE_IDS.reduce(
    (t, id) => {
      const tr = version.stages[id].trace;
      return tr ? { calls: t.calls + tr.calls, input: t.input + tr.inputTokens, output: t.output + tr.outputTokens, waited: t.waited + tr.waitedMs } : t;
    },
    { calls: 0, input: 0, output: 0, waited: 0 },
  );

  return (
    <div>
      {line && <p className="mb-5 max-w-2xl text-[15px] leading-relaxed text-ink">{line}</p>}

      {/* Product layer */}
      <ul className="border-t border-line">
        {STAGE_IDS.map((id) => {
          const s = version.stages[id];
          const missing = s.missingInputs ?? [];
          return (
            <li key={id} className="grid grid-cols-[1.5rem_1fr_auto] items-baseline gap-3 border-b border-line py-3 text-[14px]">
              <StatusDot status={s.status} className="translate-y-[1px]" />
              <div className="min-w-0">
                <span className={cx(s.status === "error" ? "text-ink" : "text-ink-2")}>{STAGE_COPY[id].label}</span>
                {s.status === "done" && missing.length > 0 && (
                  <span className="mono ml-3 text-[10.5px] text-ink-3">○ without {missing.map((m) => STAGE_COPY[m].label.toLowerCase()).join(", ")}</span>
                )}
              </div>
              <span className="mono flex items-center gap-3 text-right text-[11px] text-ink-3">
                {s.status === "done" && outcome(id, version)}
                {s.status === "error" && (
                  <>
                    <span className="text-danger">Unavailable</span>
                    <TextAction onClick={() => retryStage(projectId, version.id, id)} disabled={isRunning}>
                      <IconRetry size={12} /> Retry
                    </TextAction>
                  </>
                )}
                {(s.status === "running" || s.status === "queued") && (s.note ?? "In progress")}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mono mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[10.5px] text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-px bg-ink" aria-hidden="true" /> Evidence: backed by a retrieved source
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 border-l border-dashed border-ink-3" aria-hidden="true" /> Inference: model reasoning, no source
        </span>
        <span>○ Unavailable: a step didn&apos;t complete; nothing fills the gap</span>
      </p>

      {/* Technical layer */}
      <Disclosure className="mt-8" summary={<span className="text-[13.5px] text-ink-2">Technical details</span>} meta={<span className="mono text-[10.5px] text-ink-4">orchestrator · agents · validation</span>}>
        <div className="space-y-6">
          <p className="max-w-2xl text-[13px] leading-relaxed text-ink-3">
            An orchestrator runs seven agents as a dependency graph. Competition, feasibility and risk run concurrently once research settles; the critic and strategist run on whatever
            succeeded and are told explicitly what is missing. Every agent returns JSON validated against a schema, with one repair pass. Citations are checked in code against the
            sources actually retrieved; anything unsupported is labelled inference. Calls share a tokens-per-minute budget per provider, and rate limits are waited out, not failed.
          </p>

          <div className="overflow-x-auto">
            <table className="mono w-full min-w-[640px] border-collapse text-left text-[11px]">
              <caption className="sr-only">Per-agent execution trace</caption>
              <thead>
                <tr className="border-b border-ink text-ink-4">
                  {["Agent", "Model", "Time", "Calls", "Waited", "Tokens in → out", "Notes"].map((h) => (
                    <th key={h} scope="col" className="py-2 pr-4 font-normal uppercase tracking-[0.08em]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-ink-2">
                {STAGE_IDS.map((id) => {
                  const s = version.stages[id];
                  const t = s.trace;
                  const notes = [
                    t?.reasoning ? `reasoning ${t.reasoning}` : "",
                    t?.repaired ? "repaired after validation" : "",
                    s.missingInputs?.length ? `without ${s.missingInputs.join(", ")}` : "",
                    s.status === "error" ? (s.errorCode ?? "failed") : "",
                  ].filter(Boolean);
                  return (
                    <tr key={id} className="border-b border-line align-top">
                      <th scope="row" className="py-2 pr-4 font-normal text-ink">
                        {STAGE_COPY[id].agent}
                      </th>
                      <td className="py-2 pr-4">{t?.model ?? s.errorDetail?.model ?? "—"}</td>
                      <td className="py-2 pr-4 tabular">{duration(s)}</td>
                      <td className="py-2 pr-4 tabular">{t?.calls ?? s.errorDetail?.attempts ?? "—"}</td>
                      <td className="py-2 pr-4 tabular">{t?.waitedMs ? `${Math.round(t.waitedMs / 1000)}s` : "—"}</td>
                      <td className="py-2 pr-4 tabular">{t && (t.inputTokens || t.outputTokens) ? `${t.inputTokens.toLocaleString()} → ${t.outputTokens.toLocaleString()}` : "—"}</td>
                      <td className="py-2">{notes.join(" · ") || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
              {totals.calls > 0 && (
                <tfoot>
                  <tr className="text-ink-3">
                    <td className="py-2 pr-4">Total</td>
                    <td />
                    <td />
                    <td className="py-2 pr-4 tabular">{totals.calls}</td>
                    <td className="py-2 pr-4 tabular">{totals.waited ? `${Math.round(totals.waited / 1000)}s` : "—"}</td>
                    <td className="py-2 pr-4 tabular">{totals.input || totals.output ? `${totals.input.toLocaleString()} → ${totals.output.toLocaleString()}` : "—"}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {STAGE_IDS.filter((id) => version.stages[id].status === "error").map((id) => (
            <div key={id} className="border-l border-danger/50 pl-4">
              <p className="text-[13px] text-ink">
                {STAGE_COPY[id].agent}: {version.stages[id].error}
              </p>
              <div className="mt-2">
                <ErrorDetails code={version.stages[id].errorCode} detail={version.stages[id].errorDetail} />
              </div>
            </div>
          ))}
        </div>
      </Disclosure>
    </div>
  );
}
