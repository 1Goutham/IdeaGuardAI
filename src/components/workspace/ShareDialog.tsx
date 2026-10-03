"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { shareHash, toSharedReport } from "@/lib/share";
import { shareApi } from "@/lib/shareClient";
import { useProjectActions } from "@/lib/store/ProjectsProvider";
import { copyToClipboard, formatDateTime } from "@/lib/utils";
import { Button, IconArrowUpRight, TextAction } from "@/components/ui";
import type { IdeaVersion, Project } from "@/types";

/**
 * Publish this version as a read-only link. What's shared: the analysis,
 * sources, documents and experiment statuses. What isn't: experiment notes,
 * other versions, anything else in this browser.
 */
export function ShareDialog({ open, onClose, project, version }: { open: boolean; onClose: () => void; project: Project; version: IdeaVersion }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { setShare } = useProjectActions();
  const [busy, setBusy] = useState<"create" | "update" | "remove" | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const share = version.share;
  const outdated = !!share && share.publishedHash !== shareHash(version);
  const url = share ? `${typeof window !== "undefined" ? window.location.origin : ""}${share.url}` : "";

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      shareApi.available().then((r) => setAvailable(r.ok ? r.data.available : false));
    }
    if (!open && d.open) d.close();
  }, [open]);

  const create = async () => {
    setBusy("create");
    const res = await shareApi.create(toSharedReport(project, version));
    setBusy(null);
    if (!res.ok) return void toast.error(res.error.message);
    setShare(project.id, version.id, { id: res.data.id, token: res.data.token, url: res.data.path, sharedAt: new Date().toISOString(), publishedHash: shareHash(version) });
    const full = `${window.location.origin}${res.data.path}`;
    if (await copyToClipboard(full)) toast.success("Link created and copied.");
    else toast.success("Link created.");
  };

  const update = async () => {
    if (!share) return;
    setBusy("update");
    const res = await shareApi.update(share.id, share.token, toSharedReport(project, version));
    setBusy(null);
    if (!res.ok) return void toast.error(res.error.message);
    setShare(project.id, version.id, { ...share, sharedAt: new Date().toISOString(), publishedHash: shareHash(version) });
    toast.success("Shared report updated.");
  };

  const remove = async () => {
    if (!share) return;
    setBusy("remove");
    const res = await shareApi.remove(share.id, share.token);
    setBusy(null);
    // A link that's already gone is as good as removed.
    if (!res.ok && !/no longer exists/.test(res.error.message)) return void toast.error(res.error.message);
    setShare(project.id, version.id, null);
    toast.message("The link no longer works.");
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="share-title"
      className="m-auto w-[min(560px,calc(100vw-2rem))] rounded-xl border border-line-2 bg-paper p-0 text-ink shadow-[0_40px_120px_-40px_rgb(0_0_0/0.5)] backdrop:bg-black/30 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex items-start justify-between gap-6 border-b border-line px-6 pb-4 pt-6">
        <div>
          <p className="label">v{version.number} · read-only link</p>
          <h2 id="share-title" className="display mt-3 text-[30px]">
            Share this report
          </h2>
        </div>
        <TextAction onClick={onClose}>Close</TextAction>
      </div>

      <div className="space-y-6 px-6 py-6">
        <p className="text-[14px] leading-relaxed text-ink-2">
          Anyone with the link can read the analysis, sources, documents and experiment statuses. Experiment notes, other versions and the rest of this browser stay private.
        </p>

        {available === false ? (
          <p className="border-l border-dashed border-warn pl-3 text-[13.5px] leading-relaxed text-ink-2">
            Sharing isn&apos;t set up on this deployment. Add a Vercel KV / Upstash Redis store to the project (Storage → Create) and redeploy.
          </p>
        ) : share ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-md border border-line-2 bg-surface px-3 py-2">
              <input readOnly value={url} aria-label="Shared link" className="mono min-w-0 flex-1 bg-transparent text-[12px] text-ink focus:outline-none" onFocus={(e) => e.currentTarget.select()} />
              <TextAction
                onClick={async () => {
                  if (await copyToClipboard(url)) toast.success("Link copied.");
                }}
              >
                Copy
              </TextAction>
              <a href={share.url} target="_blank" rel="noreferrer" className="text-ink-3 hover:text-ink" aria-label="Open shared report in a new tab">
                <IconArrowUpRight size={15} />
              </a>
            </div>
            <p className="mono text-[11px] text-ink-3">
              Published {formatDateTime(share.sharedAt)}
              {outdated ? " · this report has changed since" : " · up to date"}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-line px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        {share ? (
          <>
            <TextAction onClick={remove} disabled={!!busy} className="text-danger hover:text-danger">
              Stop sharing
            </TextAction>
            <Button variant={outdated ? "primary" : "secondary"} size="sm" onClick={update} loading={busy === "update"} disabled={!outdated || !!busy}>
              {outdated ? "Update shared report" : "Up to date"}
            </Button>
          </>
        ) : (
          <>
            <span />
            <Button variant="primary" size="sm" onClick={create} loading={busy === "create"} disabled={available !== true || !!busy}>
              Create link
            </Button>
          </>
        )}
      </div>
    </dialog>
  );
}
