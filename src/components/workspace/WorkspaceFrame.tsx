"use client";

import { isComplete } from "@/lib/agents/pipeline";
import { formatDate } from "@/lib/utils";
import { Logo } from "@/components/ui";
import { SiteFooter } from "@/components/SiteFooter";
import { SourcesProvider } from "@/components/report/SourcesContext";
import { SectionNav } from "./SectionNav";
import { WorkspaceProvider, type WorkspaceValue } from "./WorkspaceContext";

/**
 * The workspace layout: header, the idea in one line, a section rail
 * (desktop) or tab bar (mobile), and the content column. Used by the
 * local workspace and by shared read-only reports, which differ only in
 * what the header offers.
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
  const line = version.analysis.understand?.oneLiner;
  return (
    <WorkspaceProvider value={value}>
      <SourcesProvider sources={version.analysis.sources?.items ?? version.analysis.research?.sources ?? []}>
        <div className="mx-auto flex min-h-dvh max-w-[1280px] flex-col px-5 md:px-10">
          <header className="no-print sticky top-0 z-30 -mx-5 bg-paper/80 px-5 backdrop-blur-md md:-mx-10 md:px-10">
            <div className="flex h-16 items-center gap-3">
              <Logo height={32} />
              {titleAddon}
              <div className="ml-auto flex shrink-0 items-center gap-3 md:gap-4">{actions}</div>
            </div>
            <div className="border-y border-line lg:hidden">
              <SectionNav base={base} version={version} generating={isGenerating} variant="bar" />
            </div>
          </header>

          <section aria-label="The idea" className="pb-10 pt-10 md:pb-14 md:pt-16">
            <p className="mono mb-3 text-[10.5px] text-ink-4">
              {project.title} · v{version.number}
            </p>
            {line ? (
              <h1 key={line} className="animate-fade max-w-[680px] text-[21px] font-normal leading-[1.35] tracking-[-0.01em] text-ink md:text-[24px]">
                {line}
              </h1>
            ) : (
              <h1 className="line-clamp-2 max-w-[680px] text-[21px] font-light leading-[1.35] text-ink-3 md:text-[24px]">{version.idea}</h1>
            )}
          </section>

          <div className="grid flex-1 gap-10 lg:grid-cols-[150px_minmax(0,1fr)] lg:gap-14">
            <aside className="no-print hidden lg:block">
              <div className="sticky top-20">
                <SectionNav base={base} version={version} generating={isGenerating} variant="rail" />
                <div className="mono mt-8 space-y-1 text-[10px] leading-relaxed text-ink-4">
                  <p>{formatDate(version.createdAt)}</p>
                  <p>{isRunning ? "Analysis running…" : complete ? "Analysis complete" : "Analysis incomplete"}</p>
                  {railFooter}
                </div>
              </div>
            </aside>
            <main id="main" className="min-w-0 max-w-[980px] pb-24">
              {children}
            </main>
          </div>

          <SiteFooter className="mt-auto" />
        </div>
      </SourcesProvider>
    </WorkspaceProvider>
  );
}
