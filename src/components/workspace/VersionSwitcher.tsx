"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useProjectActions } from "@/lib/store/ProjectsProvider";
import { cx, formatDate } from "@/lib/utils";
import { IconChevron } from "@/components/ui";
import { STANCE_LABEL } from "@/components/report/StanceTag";
import type { Project } from "@/types";

export function VersionSwitcher({ project, versionsHref }: { project: Project; versionsHref: string }) {
  const { setCurrentVersion } = useProjectActions();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = project.versions.find((v) => v.id === project.currentVersionId) ?? project.versions.at(-1)!;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        className="mono inline-flex h-7 items-center gap-1.5 rounded-full border border-line-2 px-2.5 text-[11px] text-ink-2 transition-colors hover:border-ink hover:text-ink"
      >
        v{current.number}
        {project.versions.length > 1 && <span className="text-ink-4">/ {project.versions.length}</span>}
        <IconChevron size={12} className={cx("transition-transform duration-300", open && "rotate-180")} />
      </button>
      {open && (
        <div className="animate-fade absolute left-0 top-full z-40 mt-2 w-72 rounded-lg border border-line-2 bg-surface p-1.5 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.35)]">
          <p className="label px-2.5 pb-1.5 pt-2">Versions</p>
          <ul>
            {[...project.versions].reverse().map((v) => {
              const active = v.id === current.id;
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentVersion(project.id, v.id);
                      setOpen(false);
                    }}
                    aria-current={active || undefined}
                    className={cx("flex w-full items-baseline gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-ink/5", active && "bg-ink/5")}
                  >
                    <span className="mono w-6 text-[11px] text-ink">v{v.number}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink">{v.note || (v.number === 1 ? "Original idea" : "Refined idea")}</span>
                      <span className="mono block text-[10.5px] text-ink-3">
                        {formatDate(v.createdAt)}
                        {v.analysis.strategy ? ` · ${STANCE_LABEL[v.analysis.strategy.stance]}` : ""}
                      </span>
                    </span>
                    {active && <span className="size-1.5 self-center rounded-full bg-accent ring-1 ring-ink/40" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <Link href={versionsHref} onClick={() => setOpen(false)} className="mt-1 flex items-center justify-between rounded-md border-t border-line px-2.5 py-2.5 text-[13px] text-ink-2 hover:text-ink">
            {project.versions.length > 1 ? "Compare versions" : "Version history"} <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
