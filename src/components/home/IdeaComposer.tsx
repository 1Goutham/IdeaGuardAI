"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { IDEA_MAX, IDEA_MIN } from "@/lib/ai/requests";
import { useProjectActions } from "@/lib/store/ProjectsProvider";
import { useEngine } from "@/lib/store/useEngine";
import { Button, IconArrowRight, TextAction, Textarea } from "@/components/ui";

const EXAMPLES = [
  {
    label: "Internship matching",
    idea: "An AI tool that recommends internships to university students based on their CV and interests, explains why each one fits, and helps them tailor their application.",
  },
  {
    label: "Restaurant food costs",
    idea: "A tool for independent restaurants that reads supplier invoices automatically, tracks food cost per dish, and alerts the owner when a dish's margin drops.",
  },
  {
    label: "ADHD day planner",
    idea: "A mobile app for adults with ADHD that plans their day with an AI coach, adapting the schedule to their energy levels and breaking tasks into small steps.",
  },
];

export function IdeaComposer() {
  const router = useRouter();
  const { createProject, analyse } = useProjectActions();
  const { info, loading } = useEngine();
  const [idea, setIdea] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const hintId = useId();
  const inputId = useId();

  const length = idea.trim().length;
  const tooShort = length < IDEA_MIN;
  const notConnected = !loading && !info?.model;
  const canSubmit = !tooShort && length <= IDEA_MAX && !submitting && !notConnected;

  const submit = () => {
    setTouched(true);
    if (!canSubmit) return;
    setSubmitting(true);
    const project = createProject(idea);
    analyse(project.id, project.currentVersionId);
    router.push(`/p/${project.id}`);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="border-t border-ink pt-5"
      aria-describedby={hintId}
    >
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={inputId} className="text-[15px] text-ink">
          What are you thinking of building?
        </label>
        <span className="mono tabular text-[11px] text-ink-4" aria-live="polite">
          {length > 0 ? `${length} / ${IDEA_MAX}` : ""}
        </span>
      </div>

      <Textarea
        id={inputId}
        ref={ref}
        bare
        autosize
        minRows={3}
        value={idea}
        maxLength={IDEA_MAX}
        onChange={(e) => setIdea(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Describe your idea: the problem, who has it, and what you'd build…"
        className="mt-5 min-h-[120px] text-[22px] font-light leading-snug tracking-[-0.01em] md:text-[28px]"
        aria-invalid={touched && tooShort}
      />

      <div className="mt-6 flex flex-col-reverse gap-5 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p id={hintId} className="max-w-md text-[13px] leading-relaxed text-ink-3">
          {notConnected ? (
            <span className="text-danger">
              No model is connected. Add a <span className="mono">GEMINI_API_KEY</span>, <span className="mono">GROQ_API_KEY</span> or{" "}
              <span className="mono">ANTHROPIC_API_KEY</span> to <span className="mono">.env.local</span> and restart.
            </span>
          ) : touched && tooShort ? (
            <span className="text-danger">A little more detail, please: at least {IDEA_MIN} characters.</span>
          ) : (
            <>
              A few sentences is enough. <span className="mono hidden text-[11px] text-ink-4 sm:inline">⌘ Enter</span>
            </>
          )}
        </p>
        <Button type="submit" variant="primary" size="lg" loading={submitting} disabled={notConnected} className="sm:min-w-[190px]">
          Analyse idea
          {!submitting && <IconArrowRight size={16} className="nudge" />}
        </Button>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="label mr-1">Or try</span>
        {EXAMPLES.map((ex) => (
          <TextAction
            key={ex.label}
            onClick={() => {
              setIdea(ex.idea);
              ref.current?.focus();
            }}
          >
            {ex.label}
          </TextAction>
        ))}
      </div>
    </form>
  );
}
