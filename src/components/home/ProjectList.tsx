"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { isComplete } from "@/lib/agents/pipeline";
import { useProjectActions, useProjects } from "@/lib/store/ProjectsProvider";
import { cx, pad2, relativeTime } from "@/lib/utils";
import { LoopArrow, TextAction } from "@/components/ui";
import type { Project } from "@/types";

const STANCE: Record<string, string> = { pursue: "pursue", refine: "refine first", rethink: "rethink" };

/** "[ Projects · 3 ]" in the header, opening a small list of what's saved in this browser. */
export function ProjectsMenu() {
  const { ready, projects, running } = useProjects();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!ready || !projects.length) return <span />;
  const anyRunning = projects.some((p) => p.versions.some((v) => running.has(v.id)));

  return (
    <div ref={box} className="relative">
      <TextAction onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="projects-menu" active={open}>
        Projects
        <span className="tabular text-ink-3">{projects.length}</span>
        {anyRunning && <span className="size-1.5 rounded-full bg-accent animate-pulse-dot" aria-label="analysis running" />}
      </TextAction>
      {open && (
        <div id="projects-menu" className="animate-fade absolute left-0 top-full z-40 mt-3 w-[min(420px,calc(100vw-2.5rem))] rounded-xl border border-line-2 bg-surface p-2 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)]">
          <p className="mono px-3 pb-2 pt-2 text-[10.5px] text-ink-4">Saved in this browser</p>
          <ul className="max-h-[60vh] overflow-y-auto">
            {projects.map((p, i) => (
              <Row key={p.id} project={p} index={i} running={p.versions.some((v) => running.has(v.id))} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ project, index, running }: { project: Project; index: number; running: boolean }) {
  const { removeProject } = useProjectActions();
  const [confirming, setConfirming] = useState(false);
  const version = project.versions.find((v) => v.id === project.currentVersionId) ?? project.versions.at(-1)!;
  const stance = version.analysis.strategy?.stance;
  const status = running ? "analysing…" : stance ? STANCE[stance] : isComplete(version.stages) ? "" : "incomplete";

  return (
    <li className="group/row relative rounded-lg transition-colors hover:bg-surface-2">
      <div className="grid grid-cols-[1.6rem_minmax(0,1fr)_auto] items-baseline gap-x-3 px-3 py-2.5">
        <span className="mono text-[10.5px] text-ink-4">{pad2(index + 1)}</span>
        <div className="min-w-0">
          <Link href={`/p/${project.id}`} className="group flex items-center gap-1.5 text-[14px] text-ink after:absolute after:inset-0 after:content-['']">
            <span className="truncate">{project.title}</span>
            <span className="opacity-0 transition-opacity group-hover/row:opacity-100">
              <LoopArrow size={11} />
            </span>
          </Link>
          <p className="mono mt-0.5 flex gap-2 text-[10.5px] text-ink-4">
            <span className={cx(running && "text-accent")}>{status}</span>
            <span>
              v{version.number} · {relativeTime(project.updatedAt)}
            </span>
          </p>
        </div>
        <span className="relative z-10 flex items-center gap-2">
          {confirming ? (
            <>
              <TextAction onClick={() => removeProject(project.id)} className="text-danger hover:text-danger">
                Delete
              </TextAction>
              <TextAction onClick={() => setConfirming(false)}>Keep</TextAction>
            </>
          ) : (
            <TextAction onClick={() => setConfirming(true)} className="opacity-100 md:opacity-0 md:focus-visible:opacity-100 md:group-hover/row:opacity-100" aria-label={`Delete ${project.title}`}>
              ×
            </TextAction>
          )}
        </span>
      </div>
    </li>
  );
}
