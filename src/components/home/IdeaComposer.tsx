"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { IDEA_MAX, IDEA_MIN } from "@/lib/ai/requests";
import { useProjectActions } from "@/lib/store/ProjectsProvider";
import { useEngine } from "@/lib/store/useEngine";
import { cx } from "@/lib/utils";
import { Pill, Textarea, Wordmark } from "@/components/ui";

const EXAMPLES = [
  {
    short: "a CV-based internship matcher for students",
    idea: "An AI tool that recommends internships to university students based on their CV and interests, explains why each one fits, and helps them tailor their application.",
  },
  {
    short: "an invoice-reading food cost tracker for restaurants",
    idea: "A tool for independent restaurants that reads supplier invoices automatically, tracks food cost per dish, and alerts the owner when a dish's margin drops.",
  },
  {
    short: "an AI day planner for adults with ADHD",
    idea: "A mobile app for adults with ADHD that plans their day with an AI coach, adapting the schedule to their energy levels and breaking tasks into small steps.",
  },
];

type Mood = "idle" | "wink" | "curious" | "typing" | "ready" | "go" | "sad";
const FACE: Record<Mood, string> = { idle: ":)", wink: ";)", curious: ":o", typing: ":>", ready: ":D", go: "8)", sad: ":(" };

/** Cycles through example ideas, typing and deleting them like a person would. */
function useTypewriter(active: boolean) {
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const show = setTimeout(() => setText(EXAMPLES[i].short), 0);
      const next = setTimeout(() => setI((n) => (n + 1) % EXAMPLES.length), 3500);
      return () => {
        clearTimeout(show);
        clearTimeout(next);
      };
    }
    const target = EXAMPLES[i].short;
    let pos = 0;
    let dir = 1;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      pos += dir;
      setText(target.slice(0, pos));
      if (dir === 1 && pos >= target.length) {
        dir = -1;
        timer = setTimeout(step, 2200);
      } else if (dir === -1 && pos <= 0) {
        setI((n) => (n + 1) % EXAMPLES.length);
      } else timer = setTimeout(step, dir === 1 ? 38 + Math.random() * 50 : 16);
    };
    timer = setTimeout(step, 700);
    return () => clearTimeout(timer);
  }, [active, i]);
  return { text, example: EXAMPLES[i] };
}

export function IdeaComposer() {
  const router = useRouter();
  const { createProject, analyse } = useProjectActions();
  const { info, loading } = useEngine();
  const [idea, setIdea] = useState("");
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [wink, setWink] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const hintId = useId();

  const length = idea.trim().length;
  const ready = length >= IDEA_MIN && length <= IDEA_MAX;
  const notConnected = !loading && !info?.model;
  const empty = idea.length === 0;
  const { text: ghost, example } = useTypewriter(empty);

  // An idle wink now and then.
  useEffect(() => {
    if (!empty || focused) return;
    const t = setInterval(() => {
      setWink(true);
      setTimeout(() => setWink(false), 650);
    }, 5200);
    return () => clearInterval(t);
  }, [empty, focused]);

  // "/" jumps to the input from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable]")) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const mood: Mood = submitting ? "go" : nudge ? "sad" : ready ? "ready" : length > 0 ? "typing" : focused ? "curious" : wink ? "wink" : "idle";

  const submit = () => {
    if (!ready || notConnected || submitting) {
      setNudge(true);
      setTimeout(() => setNudge(false), 900);
      ref.current?.focus();
      return;
    }
    setSubmitting(true);
    const project = createProject(idea);
    analyse(project.id, project.currentVersionId);
    router.push(`/p/${project.id}`);
  };

  const hint = notConnected
    ? "No model connected yet. Add GROQ_API_KEY or GEMINI_API_KEY and redeploy."
    : nudge && !ready
      ? `A little more, please: ${IDEA_MIN - length} more character${IDEA_MIN - length === 1 ? "" : "s"}.`
      : empty
        ? focused
          ? "Tab to use the example · or describe the problem, who has it, what you'd build"
          : "Press / to start typing"

        : ready
          ? "Enter to analyse · Shift+Enter for a new line"
          : `${IDEA_MIN - length} more to go`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid w-full items-center gap-x-12 gap-y-8 lg:grid-cols-[auto_minmax(0,1fr)_auto]"
    >
      <div className="flex flex-col items-center gap-2.5 text-center lg:items-center">
        <Wordmark height={44} priority />
        <p className="text-[15px] font-light text-ink-2">
          Turn an <span className="font-medium text-ink">idea</span> into <span className="font-medium text-ink">evidence</span>{" "}
          <span className={cx("inline-block w-[1.3em] text-left font-medium tracking-[-0.06em] text-ink transition-transform duration-300", mood === "go" && "translate-x-1")} aria-hidden="true">
            {FACE[mood]}
          </span>
        </p>
      </div>

      <div className={cx("relative", nudge && "animate-[shake_0.4s]")}>
        <label htmlFor="idea" className="sr-only">
          Describe your idea
        </label>
        <div className="relative">
          <Textarea
            id="idea"
            ref={ref}
            bare
            autosize
            minRows={1}
            value={idea}
            maxLength={IDEA_MAX}
            onChange={(e) => setIdea(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Tab" && empty && !e.shiftKey) {
                e.preventDefault();
                setIdea(example.idea);
              } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            aria-describedby={hintId}
            aria-invalid={nudge && !ready}
            className="block max-h-[34vh] overflow-y-auto pb-2.5 text-[17px] font-light leading-snug md:text-[18px]"
          />
          {empty && (
            <span className="pointer-events-none absolute left-0 top-0 text-[17px] font-light leading-snug text-ink-4 md:text-[18px]" aria-hidden="true">
              {ghost ? ghost : "Type your idea here"}
              <span className={cx("ml-px inline-block h-[1.05em] w-px translate-y-[0.18em] bg-ink-3", "caret-blink")} />
            </span>
          )}
        </div>
        {/* The underline doubles as a meter: it fills as the idea becomes long enough to analyse. */}
        <div className="relative h-px w-full bg-line-2" aria-hidden="true">
          <span
            className={cx("absolute inset-y-0 left-0 transition-[width,background-color] duration-500 ease-[var(--ease-out-expo)]", ready ? "bg-ink" : "bg-ink-3")}
            style={{ width: `${Math.min(1, length / IDEA_MIN) * 100}%` }}
          />
          {/* A blue bead rides the tip of the meter while you type. */}
          <span
            className={cx("absolute top-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent transition-[left,opacity] duration-500 ease-[var(--ease-out-expo)]", focused ? "opacity-100" : "opacity-0")}
            style={{ left: `${Math.min(1, length / IDEA_MIN) * 100}%` }}
          />
        </div>
        <div className="mono mt-2 flex min-h-4 items-baseline justify-between gap-4 text-[10.5px] text-ink-4">
          <span id={hintId} className={cx("transition-colors", (notConnected || (nudge && !ready)) && "text-danger")} aria-live="polite">
            {hint === "Press / to start typing" ? (
              <>
                <span className="hidden sm:inline">Press / to start typing</span>
                <span className="sm:hidden">Tap to start typing</span>
              </>
            ) : (
              hint
            )}
          </span>
          {length > 0 && <span className="tabular">{length}</span>}
        </div>
      </div>

      <div className="flex justify-center lg:justify-end">
        <Pill type="submit" loading={submitting} disabled={notConnected} aria-describedby={hintId} className={cx("min-w-[118px] justify-center", ready && "shadow-[0_0_0_4px_rgb(59_123_255/0.25)]")}>
          {submitting ? "Analysing" : "Analyse"}
        </Pill>
      </div>
    </form>
  );
}
