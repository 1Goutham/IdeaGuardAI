"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { isComplete } from "@/lib/agents/pipeline";
import { useProject, useProjectActions } from "@/lib/store/ProjectsProvider";
import { downloadText, formatDate, slugify } from "@/lib/utils";
import { reportToMarkdown } from "@/lib/utils/markdown";
import { Button, LinkButton, LogoMark, TextAction, ThemeToggle } from "@/components/ui";
import { SourcesProvider } from "@/components/report/SourcesContext";
import { RefineDialog } from "./RefineDialog";
import { SectionNav } from "./SectionNav";
import { VersionSwitcher } from "./VersionSwitcher";
import { WorkspaceProvider, type WorkspaceValue } from "./WorkspaceContext";

export function WorkspaceShell({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  const router = useRouter();
  const { ready, project, version, isRunning, isGenerating } = useProject(projectId);
  const { addVersion, analyse } = useProjectActions();
  const [refine, setRefine] = useState<{ open: boolean; prefill?: string }>({ open: false });

  const base = `/p/${projectId}`;
  const openRefine = useCallback((prefill?: string) => setRefine({ open: true, prefill }), []);
  const value = useMemo<WorkspaceValue | null>(
    () => (project && version ? { project, version, isRunning, isGenerating, openRefine, href: (slug: string) => (slug ? `${base}/${slug}` : base) } : null),
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
    <WorkspaceProvider value={value}>
      <SourcesProvider sources={version.analysis.research?.sources ?? []}>
        <div className="min-h-dvh">
          <header className="no-print sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-4 px-5 md:px-8">
              <Link href="/" className="text-ink" aria-label="All projects">
                <LogoMark />
              </Link>
              <span className="text-ink-4" aria-hidden="true">
                /
              </span>
              <span className="min-w-0 truncate text-[14px] text-ink" title={project.title}>
                {project.title}
              </span>
              <VersionSwitcher project={project} versionsHref={`${base}/versions`} />
              <div className="ml-auto flex items-center gap-2 md:gap-4">
                <TextAction onClick={exportReport} disabled={!version.analysis.understand} className="hidden sm:inline-flex">
                  Export
                </TextAction>
                <Button size="sm" variant={complete ? "primary" : "secondary"} onClick={() => openRefine()} disabled={isRunning}>
                  Refine idea
                </Button>
                <ThemeToggle />
              </div>
            </div>
            <div className="border-t border-line px-5 lg:hidden">
              <SectionNav base={base} version={version} generating={isGenerating} variant="bar" />
            </div>
          </header>

          <div className="mx-auto grid max-w-[1320px] gap-10 px-5 md:px-8 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-16 xl:gap-24">
            <aside className="no-print hidden lg:block">
              <div className="sticky top-14 pt-12">
                <SectionNav base={base} version={version} generating={isGenerating} variant="rail" />
                <div className="mono mt-6 space-y-1 text-[10.5px] leading-relaxed text-ink-4">
                  <p>
                    v{version.number} · {formatDate(version.createdAt)}
                  </p>
                  <p>{isRunning ? "Analysis running…" : complete ? "Analysis complete" : "Analysis incomplete"}</p>
                </div>
              </div>
            </aside>
            <main id="main" className="min-w-0 max-w-[920px] pb-32 pt-10 md:pt-14">
              {children}
            </main>
          </div>
        </div>

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
      </SourcesProvider>
    </WorkspaceProvider>
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
