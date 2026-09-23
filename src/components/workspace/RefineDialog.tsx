"use client";

import { useEffect, useRef, useState } from "react";
import { IDEA_MAX, IDEA_MIN } from "@/lib/ai/requests";
import { Button, IconArrowRight, TextAction, Textarea } from "@/components/ui";

interface Props {
  open: boolean;
  onClose: () => void;
  current: string;
  suggestion?: string;
  nextNumber: number;
  initial?: string;
  onSubmit: (idea: string, note: string) => void;
}

/** Create the next version of the idea. Uses a native modal dialog for focus trapping and Escape. */
export function RefineDialog({ open, onClose, current, suggestion, nextNumber, initial, onSubmit }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [idea, setIdea] = useState(current);
  const [note, setNote] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setIdea(initial ?? current);
      setNote(initial && initial === suggestion ? "Applied the strategist's refinement" : "");
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, current, initial, suggestion]);

  const length = idea.trim().length;
  const unchanged = idea.trim() === current.trim();
  const valid = length >= IDEA_MIN && length <= IDEA_MAX && !unchanged;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="refine-title"
      className="m-auto w-[min(720px,calc(100vw-2rem))] rounded-xl border border-line-2 bg-paper p-0 text-ink shadow-[0_40px_120px_-40px_rgb(0_0_0/0.5)] backdrop:bg-black/30 backdrop:backdrop-blur-[2px]"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSubmit(idea.trim(), note.trim());
        }}
        className="flex max-h-[85dvh] flex-col"
      >
        <div className="flex items-start justify-between gap-6 border-b border-line px-6 pb-4 pt-6">
          <div>
            <p className="label">New version · v{nextNumber}</p>
            <h2 id="refine-title" className="display mt-3 text-[32px]">
              Refine the idea
            </h2>
          </div>
          <TextAction onClick={onClose}>Close</TextAction>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {suggestion && (
            <div className="mb-6 border-l border-dashed border-line-2 pl-4">
              <p className="label">Strategist&apos;s suggestion</p>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{suggestion}</p>
              <TextAction className="mt-2" onClick={() => setIdea(suggestion)}>
                Use this
              </TextAction>
            </div>
          )}
          <label htmlFor="refine-idea" className="text-[14px] text-ink">
            The idea
          </label>
          <Textarea id="refine-idea" autosize minRows={5} value={idea} maxLength={IDEA_MAX} onChange={(e) => setIdea(e.target.value)} className="mt-2 text-[16px]" />
          <label htmlFor="refine-note" className="mt-6 block text-[14px] text-ink">
            What changed? <span className="label ml-1 normal-case tracking-normal">optional</span>
          </label>
          <input
            id="refine-note"
            value={note}
            maxLength={120}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Narrowed to one university"
            className="mt-2 w-full border-0 border-b border-line-2 bg-transparent py-2.5 text-[15px] placeholder:text-ink-4 focus:border-ink focus:outline-none"
          />
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-line px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-ink-3">{unchanged ? "Edit the idea to create a new version." : `v${nextNumber} runs a full new analysis. Earlier versions stay intact.`}</p>
          <Button type="submit" variant="primary" disabled={!valid}>
            Analyse v{nextNumber} <IconArrowRight size={15} className="nudge" />
          </Button>
        </div>
      </form>
    </dialog>
  );
}
