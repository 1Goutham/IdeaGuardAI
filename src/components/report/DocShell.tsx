"use client";

import { toast } from "sonner";
import { useProjectActions } from "@/lib/store/ProjectsProvider";
import { copyToClipboard, downloadText, formatDateTime, slugify } from "@/lib/utils";
import { Button, IconArrowRight, TextAction } from "@/components/ui";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { SectionHeader } from "./Section";
import type { DocKind, GeneratedDoc } from "@/types";

interface Props<T> {
  kind: DocKind;
  index: string;
  title: string;
  description: string;
  includes: string[];
  toMarkdown: (data: T) => string;
  children: (data: T) => React.ReactNode;
}

/** Shared frame for generated documents: not-yet, generating, and ready with export actions. */
export function DocShell<T>({ kind, index, title, description, includes, toMarkdown, children }: Props<T>) {
  const { project, version, isRunning, isGenerating } = useWorkspace();
  const { generateDoc } = useProjectActions();
  const doc = version[kind] as GeneratedDoc<T> | undefined;
  const generating = isGenerating(kind);
  const ready = !!version.analysis.strategy && version.stages.strategy.status === "done";
  const run = () => generateDoc(project.id, version.id, kind);
  const filename = `${slugify(project.title)}-${kind}-v${version.number}.md`;

  if (!doc || generating) {
    return (
      <article className="animate-fade">
        <SectionHeader index={index} title={title} description={description} />
        <div className="border-y border-line py-10" aria-live="polite" aria-busy={generating}>
          {generating ? (
            <>
              <p className="text-[16px] text-ink">Writing the {kind === "prd" ? "PRD" : "blueprint"} from your analysis…</p>
              <p className="mono mt-2 text-[11px] text-ink-3">This usually takes 20–60 seconds. You can keep working in other sections.</p>
              <div className="mt-8 space-y-3" aria-hidden="true">
                {[72, 90, 64, 82, 48].map((w, i) => (
                  <div key={i} className="h-2.5 rounded-sm animate-shimmer" style={{ width: `${w}%` }} />
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="label">Includes</p>
              <ul className="mt-4 grid gap-x-8 gap-y-2 text-[14px] text-ink-2 sm:grid-cols-2">
                {includes.map((x) => (
                  <li key={x} className="flex items-baseline gap-3">
                    <span className="h-px w-3 translate-y-[-3px] bg-ink-3" aria-hidden="true" />
                    {x}
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Button variant="primary" onClick={run} disabled={!ready || isRunning}>
                  Generate {kind === "prd" ? "PRD" : "blueprint"} <IconArrowRight size={15} className="nudge" />
                </Button>
                {!ready && <p className="text-[13px] text-ink-3">Available once the product strategy is complete.</p>}
              </div>
            </>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="animate-fade">
      <SectionHeader
        index={index}
        title={title}
        description={description}
        meta={
          <>
            <span>Generated {formatDateTime(doc.generatedAt)}</span>
            {doc.engine && <span>{doc.engine}</span>}
            <span>From v{version.number} of the idea</span>
          </>
        }
        actions={
          <>
            <TextAction
              onClick={async () => {
                if (await copyToClipboard(toMarkdown(doc.data))) toast.success("Copied as Markdown.");
                else toast.error("Couldn't access the clipboard.");
              }}
            >
              Copy
            </TextAction>
            <TextAction onClick={() => downloadText(filename, toMarkdown(doc.data))}>Download .md</TextAction>
            <TextAction onClick={run} disabled={isRunning}>
              Regenerate
            </TextAction>
          </>
        }
      />
      {children(doc.data)}
    </article>
  );
}
