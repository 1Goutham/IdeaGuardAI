"use client";

import Link from "next/link";
import { isComplete } from "@/lib/agents/pipeline";
import { formatDate } from "@/lib/utils";
import { LogoMark } from "@/components/ui";
import { SourcesProvider } from "@/components/report/SourcesContext";
import { SectionNav } from "./SectionNav";
import { WorkspaceProvider, type WorkspaceValue } from "./WorkspaceContext";

/**
 * The workspace layout: sticky header, section rail (desktop) or tab bar
 * (mobile), and the content column. Used by the local workspace and by
 * shared read-only reports, which differ only in what the header offers.
 */
export function WorkspaceFrame({
  value,
  base,
  titleAddon,
  actions,
  railFooter,
  children,
}: {
  value: WorkspaceValue;
  base: string;
  titleAddon?: React.ReactNode;
  actions?: React.ReactNode;
  railFooter?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { project, version, isRunning, isGenerating } = value;
  const complete = isComplete(version.stages);
  return (
    <WorkspaceProvider value={value}>
      <SourcesProvider sources={version.analysis.sources?.items ?? version.analysis.research?.sources ?? []}>
        <div className="min-h-dvh">
          <header className="no-print sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-3 px-5 md:gap-4 md:px-8">
              <Link href="/" className="text-ink" aria-label="IdeaGuard home">
                <LogoMark />
              </Link>
              <span className="text-ink-4" aria-hidden="true">
                /
              </span>
              <span className="min-w-0 truncate text-[14px] text-ink" title={project.title}>
                {project.title}
              </span>
              {titleAddon}
              <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-4">{actions}</div>
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
                  {railFooter}
                </div>
              </div>
            </aside>
            <main id="main" className="min-w-0 max-w-[920px] pb-32 pt-10 md:pt-14">
              {children}
            </main>
          </div>
        </div>
      </SourcesProvider>
    </WorkspaceProvider>
  );
}
