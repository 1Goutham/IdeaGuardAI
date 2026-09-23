"use client";

import Link from "next/link";
import { useState } from "react";
import { isComplete } from "@/lib/agents/pipeline";
import { useProjectActions, useProjects } from "@/lib/store/ProjectsProvider";
import { pad2, relativeTime } from "@/lib/utils";
import { IconArrowRight, TextAction } from "@/components/ui";
import { StanceTag } from "@/components/report/StanceTag";
import type { Project } from "@/types";

export function ProjectList() {
  const { ready, projects, running } = useProjects();
  if (!ready || !projects.length) return null;
  return (
    <section aria-labelledby="projects-title" className="border-t border-line pt-6">
      <div className="flex items-baseline justify-between">
        <h2 id="projects-title" className="label">
          Your projects
        </h2>
        <span className="mono text-[11px] text-ink-4">{projects.length} saved in this browser</span>
      </div>
      <ul className="mt-6">
        {projects.map((p, i) => (
          <Row key={p.id} project={p} index={i} running={p.versions.some((v) => running.has(v.id))} />
        ))}
      </ul>
    </section>
  );
}

function Row({ project, index, running }: { project: Project; index: number; running: boolean }) {
  const { removeProject } = useProjectActions();
  const [confirming, setConfirming] = useState(false);
  const version = project.versions.find((v) => v.id === project.currentVersionId) ?? project.versions.at(-1)!;
  const stance = version.analysis.strategy?.stance;
  const status = running ? "Analysing…" : isComplete(version.stages) ? null : "Incomplete";

  return (
    <li className="group/row relative grid grid-cols-[auto_1fr_auto] items-baseline gap-x-5 border-t border-line py-5 last:border-b md:grid-cols-[auto_1fr_auto_auto_auto]">
      <span className="mono text-[11px] text-ink-4">{pad2(index + 1)}</span>
      <div className="min-w-0">
        <Link href={`/p/${project.id}`} className="group text-[17px] text-ink after:absolute after:inset-0 after:content-['']">
          <span className="link-underline">{project.title}</span>
        </Link>
        <p className="mt-1 truncate text-[13px] text-ink-3">{version.analysis.understand?.oneLiner ?? version.idea}</p>
      </div>
      <span className="hidden md:block">{stance ? <StanceTag stance={stance} /> : status && <span className="mono text-[11px] text-ink-3">{status}</span>}</span>
      <span className="mono hidden text-[11px] text-ink-3 md:block">
        v{version.number} · {relativeTime(project.updatedAt)}
      </span>
      <span className="relative z-10 flex items-center gap-3">
        {confirming ? (
          <>
            <span className="text-[12.5px] text-ink-2">Delete?</span>
            <TextAction onClick={() => removeProject(project.id)} className="text-danger hover:text-danger">
              Yes
            </TextAction>
            <TextAction onClick={() => setConfirming(false)}>No</TextAction>
          </>
        ) : (
          <>
            <TextAction onClick={() => setConfirming(true)} className="opacity-100 md:opacity-0 md:focus-visible:opacity-100 md:group-hover/row:opacity-100" aria-label={`Delete ${project.title}`}>
              Delete
            </TextAction>
            <IconArrowRight size={16} className="text-ink-3 transition-transform duration-300 group-hover/row:translate-x-1 group-hover/row:text-ink" />
          </>
        )}
      </span>
    </li>
  );
}
