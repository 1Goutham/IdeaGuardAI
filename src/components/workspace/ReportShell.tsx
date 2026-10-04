"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import type { SharedReport } from "@/lib/share";
import { downloadText, formatDate, slugify } from "@/lib/utils";
import { reportToMarkdown } from "@/lib/utils/markdown";
import { LinkButton, TextAction, ThemeToggle } from "@/components/ui";
import { WorkspaceFrame } from "./WorkspaceFrame";
import type { WorkspaceValue } from "./WorkspaceContext";
import type { IdeaVersion, Project } from "@/types";

/** A shared report: the workspace's sections, read-only, from a published snapshot. */
export function ReportShell({ id, report, children }: { id: string; report: SharedReport; children: React.ReactNode }) {
  const base = `/r/${id}`;
  const { project, version } = useMemo(() => {
    const r = report.version;
    const version: IdeaVersion = {
      id: `shared-${id}`,
      number: r.number,
      idea: r.idea,
      note: "",
      createdAt: r.createdAt,
      analysis: r.analysis,
      stages: r.stages,
      prd: r.prd,
      blueprint: r.blueprint,
      experiments: Object.fromEntries(Object.entries(r.experiments).map(([k, e]) => [k, { status: e.status, result: "", updatedAt: "" }])),
    };
    const project: Project = { id: `shared-${id}`, ownerId: "shared", title: report.title, createdAt: r.createdAt, updatedAt: report.sharedAt, currentVersionId: version.id, versions: [version] };
    return { project, version };
  }, [id, report]);

  const value = useMemo<WorkspaceValue>(
    () => ({ project, version, isRunning: false, isGenerating: () => false, openRefine: () => {}, readOnly: true, href: (slug: string) => (slug ? `${base}/${slug}` : base) }),
    [project, version, base],
  );

  return (
    <WorkspaceFrame
      value={value}
      base={base}
      titleAddon={<span className="mono hidden shrink-0 rounded-full border border-line-2 px-2 py-0.5 text-[10.5px] text-ink-3 sm:inline">Shared · read-only</span>}
      railFooter={<p>Shared {formatDate(report.sharedAt)}</p>}
      actions={
        <>
          <TextAction
            className="hidden sm:inline-flex"
            onClick={() => {
              downloadText(`${slugify(project.title)}-v${version.number}.md`, reportToMarkdown(project, version));
              toast.success("Report exported as Markdown.");
            }}
          >
            Export
          </TextAction>
          <LinkButton href="/" size="sm" variant="primary">
            Analyse your idea
          </LinkButton>
          <ThemeToggle />
        </>
      }
    >
      {children}
    </WorkspaceFrame>
  );
}
