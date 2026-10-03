"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { isComplete } from "@/lib/agents/pipeline";
import { useProject, useProjectActions } from "@/lib/store/ProjectsProvider";
import { downloadText, slugify } from "@/lib/utils";
import { reportToMarkdown } from "@/lib/utils/markdown";
import { Button, LinkButton, TextAction, ThemeToggle } from "@/components/ui";
import { RefineDialog } from "./RefineDialog";
import { ShareDialog } from "./ShareDialog";
import { VersionSwitcher } from "./VersionSwitcher";
import { WorkspaceFrame } from "./WorkspaceFrame";
import type { WorkspaceValue } from "./WorkspaceContext";

/** The local, editable workspace for one project. */
export function WorkspaceShell({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  const router = useRouter();
  const { ready, project, version, isRunning, isGenerating } = useProject(projectId);
  const { addVersion, analyse } = useProjectActions();
  const [refine, setRefine] = useState<{ open: boolean; prefill?: string }>({ open: false });
  const [sharing, setSharing] = useState(false);

  const base = `/p/${projectId}`;
  const openRefine = useCallback((prefill?: string) => setRefine({ open: true, prefill }), []);
  const value = useMemo<WorkspaceValue | null>(
    () =>
      project && version
        ? { project, version, isRunning, isGenerating, openRefine, readOnly: false, href: (slug: string) => (slug ? `${base}/${slug}` : base) }
        : null,
    [project, version, isRunning, isGenerating, openRefine, base],
  );

  if (!ready) return <ShellSkeleton />;
  if (!project || !version || !value) {
    return (
      <main id="main" className="mx-auto flex min-h-dvh max-w-[720px] flex-col justify-center px-5">
        <p className="label">Not found</p>
        <h1 className="display mt-4 text-[44px]">This project isn&apos;t in this browser.</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-3">Projects are stored locally. It may have been deleted, or created on another device or browser.</p>
        <div className="mt-8">
          <LinkButton href="/" variant="primary">
            Start a new analysis
          </LinkButton>
        </div>
      </main>
    );
  }

  const complete = isComplete(version.stages);
  const exportReport = () => {
    downloadText(`${slugify(project.title)}-v${version.number}.md`, reportToMarkdown(project, version));
    toast.success("Report exported as Markdown.");
  };

  return (
    <>
      <WorkspaceFrame
        value={value}
        base={base}
        titleAddon={<VersionSwitcher project={project} versionsHref={`${base}/versions`} />}
        actions={
          <>
            <TextAction onClick={exportReport} disabled={!version.analysis.understand} className="hidden sm:inline-flex">
              Export
            </TextAction>
            <TextAction onClick={() => setSharing(true)} disabled={!version.analysis.understand || isRunning}>
              {version.share ? "Shared" : "Share"}
            </TextAction>
            <Button size="sm" variant={complete ? "primary" : "secondary"} onClick={() => openRefine()} disabled={isRunning}>
              Refine idea
            </Button>
            <ThemeToggle />
          </>
        }
      >
        {children}
      </WorkspaceFrame>

      <ShareDialog open={sharing} onClose={() => setSharing(false)} project={project} version={version} />

      <RefineDialog
        open={refine.open}
        initial={refine.prefill}
        onClose={() => setRefine({ open: false })}
        current={version.idea}
        suggestion={version.analysis.strategy?.refinedIdea}
        nextNumber={Math.max(...project.versions.map((v) => v.number)) + 1}
        onSubmit={(idea, note) => {
          const v = addVersion(project.id, idea, note);
          setRefine({ open: false });
          if (v) {
            analyse(project.id, v.id);
            router.push(base);
          }
        }}
      />
    </>
  );
}

function ShellSkeleton() {
  return (
    <div className="mx-auto max-w-[1320px] px-5 pt-24 md:px-8" aria-busy="true" aria-label="Loading project">
      <div className="h-3 w-20 rounded animate-shimmer" />
      <div className="mt-6 h-12 w-2/3 max-w-xl rounded animate-shimmer" />
      <div className="mt-12 h-40 max-w-3xl rounded animate-shimmer" />
    </div>
  );
}
