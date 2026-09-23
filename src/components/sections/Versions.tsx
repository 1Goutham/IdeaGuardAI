"use client";

import { useMemo, useState } from "react";
import { LEVEL_LABEL, SIGNAL_META } from "@/lib/scoring/signals";
import { useProjectActions } from "@/lib/store/ProjectsProvider";
import { cx, formatDate } from "@/lib/utils";
import { changeRatio, diffWords, type DiffPart } from "@/lib/utils/diff";
import { Button, TextAction } from "@/components/ui";
import { Block, SectionHeader } from "@/components/report/Section";
import { StanceTag } from "@/components/report/StanceTag";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import type { IdeaVersion, UnderstandOutput } from "@/types";

const FIELDS: { key: keyof UnderstandOutput; label: string }[] = [
  { key: "targetUser", label: "Target audience" },
  { key: "problem", label: "Problem" },
  { key: "solution", label: "Solution" },
  { key: "differentiation", label: "Differentiation" },
  { key: "scope", label: "Scope" },
];

/** Inline diff for edits; before/after columns when most of the text was rewritten. */
function Diff({ parts }: { parts: DiffPart[] }) {
  if (changeRatio(parts) > 0.45) {
    const before = parts.filter((p) => p.type !== "added").map((p) => p.text).join("");
    const after = parts.filter((p) => p.type !== "removed").map((p) => p.text).join("");
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="mono mb-1.5 text-[10.5px] uppercase tracking-[0.1em] text-ink-3">Before</p>
          <p className="text-[15px] leading-relaxed text-ink-3">{before || "—"}</p>
        </div>
        <div className="md:border-l md:border-line md:pl-6">
          <p className="mono mb-1.5 text-[10.5px] uppercase tracking-[0.1em] text-ink-3">After</p>
          <p className="text-[15px] leading-relaxed text-ink">{after || "—"}</p>
        </div>
      </div>
    );
  }
  return (
    <p className="text-[15px] leading-relaxed text-ink">
      {parts.map((p, i) =>
        p.type === "same" ? (
          <span key={i}>{p.text}</span>
        ) : p.type === "removed" ? (
          <del key={i} className="mr-1 text-ink-4 decoration-ink-4">
            {p.text}
          </del>
        ) : (
          <ins key={i} className="no-underline shadow-[inset_0_-0.42em_0_var(--accent)]">
            {p.text}
          </ins>
        ),
      )}
    </p>
  );
}

function VersionSelect({ id, label, versions, value, onChange }: { id: string; label: string; versions: IdeaVersion[]; value: string; onChange: (v: string) => void }) {
  return (
    <label htmlFor={id} className="flex items-center gap-3">
      <span className="label">{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="mono h-8 rounded-full border border-line-2 bg-transparent px-3 text-[12px] text-ink hover:border-ink focus:border-ink">
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            v{v.number}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Versions() {
  const { project, version, openRefine, isRunning } = useWorkspace();
  const { setCurrentVersion } = useProjectActions();
  const versions = project.versions;
  const currentIdx = versions.findIndex((v) => v.id === version.id);
  const [fromId, setFromId] = useState(versions[Math.max(0, currentIdx - 1)].id);
  const [toId, setToId] = useState(version.id);
  const from = versions.find((v) => v.id === fromId) ?? versions[0];
  const to = versions.find((v) => v.id === toId) ?? version;

  const comparison = useMemo(() => {
    const idea = diffWords(from.idea, to.idea);
    const fields = FIELDS.map((f) => {
      const a = String(from.analysis.understand?.[f.key] ?? "");
      const b = String(to.analysis.understand?.[f.key] ?? "");
      const parts = diffWords(a, b);
      return { ...f, parts, ratio: changeRatio(parts), available: !!from.analysis.understand && !!to.analysis.understand };
    });
    const sa = from.analysis.strategy?.signals ?? from.analysis.understand?.signals ?? [];
    const sb = to.analysis.strategy?.signals ?? to.analysis.understand?.signals ?? [];
    const signals = sb.map((s) => ({ key: s.key, to: s.level, from: sa.find((x) => x.key === s.key)?.level })).filter((s) => s.from && s.from !== s.to);
    return { idea, fields, signals };
  }, [from, to]);

  return (
    <article className="animate-fade">
      <SectionHeader
        index="Versions"
        title="How the idea evolved"
        description="Each refinement is a new version with its own analysis. Earlier versions are kept, so you can see what changed and whether it helped."
        actions={
          <Button size="sm" variant="primary" onClick={() => openRefine()} disabled={isRunning}>
            New version
          </Button>
        }
      />

      <Block title="Timeline" id="timeline">
        <ol className="relative">
          {versions.map((v, i) => {
            const current = v.id === version.id;
            return (
              <li key={v.id} className="relative grid grid-cols-[2.5rem_1fr] gap-4 pb-8 last:pb-0">
                {i < versions.length - 1 && <span className="absolute left-[0.7rem] top-6 h-full w-px bg-line-2" aria-hidden="true" />}
                <span className={cx("mono relative z-10 flex size-6 items-center justify-center rounded-full text-[10.5px]", current ? "bg-ink text-on-ink" : "border border-line-2 bg-paper text-ink-2")}>
                  {v.number}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-[16px] text-ink">{v.note || (v.number === 1 ? "Original idea" : "Refined idea")}</p>
                    {v.analysis.strategy && <StanceTag stance={v.analysis.strategy.stance} />}
                    {current && <span className="mono text-[10.5px] text-ink-3">Viewing</span>}
                  </div>
                  <p className="mono mt-1 text-[11px] text-ink-3">{formatDate(v.createdAt)}</p>
                  <p className="mt-2 line-clamp-2 max-w-2xl text-[14px] leading-relaxed text-ink-2">{v.analysis.understand?.oneLiner ?? v.idea}</p>
                  {!current && (
                    <TextAction className="mt-2" onClick={() => setCurrentVersion(project.id, v.id)}>
                      Open v{v.number}
                    </TextAction>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Block>

      {versions.length > 1 ? (
        <Block title="Compare" id="compare">
          <div className="mb-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <VersionSelect id="from" label="From" versions={versions} value={from.id} onChange={setFromId} />
            <VersionSelect id="to" label="To" versions={versions} value={to.id} onChange={setToId} />
            <p className="mono text-[11px] text-ink-3">
              <del className="text-ink-4">removed</del> · <ins className="no-underline shadow-[inset_0_-0.42em_0_var(--accent)]">added</ins>
            </p>
          </div>

          {from.id === to.id ? (
            <p className="text-[14px] text-ink-3">Pick two different versions to compare.</p>
          ) : (
            <div className="space-y-12">
              <section>
                <p className="label mb-3">The idea as written</p>
                <Diff parts={comparison.idea} />
              </section>

              <ul className="border-t border-line">
                {comparison.fields.map((f) => (
                  <li key={f.key} className="grid gap-x-8 gap-y-2 border-b border-line py-5 md:grid-cols-[10rem_minmax(0,1fr)]">
                    <div>
                      <p className="text-[14px] text-ink">{f.label}</p>
                      <p className="mono mt-1 text-[10.5px] text-ink-3">{!f.available ? "Not analysed" : f.ratio === 0 ? "Unchanged" : f.ratio > 0.5 ? "Rewritten" : "Changed"}</p>
                    </div>
                    {f.available ? <Diff parts={f.parts} /> : <p className="text-[14px] text-ink-4">Both versions need an analysis to compare.</p>}
                  </li>
                ))}
              </ul>

              {(from.analysis.strategy || to.analysis.strategy) && (
                <section>
                  <p className="label mb-4">Outcome</p>
                  <div className="flex flex-wrap items-center gap-3 text-[14px]">
                    <span className="mono text-[11px] text-ink-3">v{from.number}</span>
                    {from.analysis.strategy ? <StanceTag stance={from.analysis.strategy.stance} /> : <span className="text-ink-4">—</span>}
                    <span className="text-ink-3" aria-hidden="true">
                      →
                    </span>
                    <span className="mono text-[11px] text-ink-3">v{to.number}</span>
                    {to.analysis.strategy ? <StanceTag stance={to.analysis.strategy.stance} /> : <span className="text-ink-4">—</span>}
                  </div>
                  {comparison.signals.length > 0 ? (
                    <ul className="mt-6 border-t border-line">
                      {comparison.signals.map((s) => (
                        <li key={s.key} className="flex items-baseline justify-between gap-6 border-b border-line py-3 text-[14px]">
                          <span className="text-ink">{SIGNAL_META[s.key].label}</span>
                          <span className="mono text-[11.5px] text-ink-2">
                            {LEVEL_LABEL[s.from!]} → {LEVEL_LABEL[s.to]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-[13.5px] text-ink-3">No signal changed level.</p>
                  )}
                </section>
              )}
            </div>
          )}
        </Block>
      ) : (
        <Block title="Compare" id="compare">
          <p className="max-w-xl text-[14px] leading-relaxed text-ink-3">
            There is only one version so far. Refine the idea (for example, with the strategist&apos;s suggestion on the overview) to compare how the analysis changes.
          </p>
        </Block>
      )}
    </article>
  );
}
