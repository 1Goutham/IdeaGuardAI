import type { Metadata } from "next";
import Link from "next/link";
import { STAGE_COPY } from "@/lib/agents/pipeline";
import { pad2 } from "@/lib/utils";
import { Logo, ThemeToggle } from "@/components/ui";
import { STAGE_IDS } from "@/types";

export const metadata: Metadata = {
  title: "How it works",
  description: "How IdeaGuard researches, stress-tests and labels its analysis: seven agents, checked citations, and honest gaps.",
};

const WAVES: { label: string; stages: (typeof STAGE_IDS)[number][]; note: string }[] = [
  { label: "First", stages: ["understand"], note: "Everything else depends on a precise restatement of the idea." },
  { label: "Then", stages: ["research"], note: "Live web search. Sources are numbered and kept, even if a later step fails." },
  { label: "In parallel", stages: ["competitors", "feasibility", "risks"], note: "Independent views of the same evidence, run concurrently." },
  { label: "Then", stages: ["critic"], note: "Needs at least two of the three above. Told exactly what's missing." },
  { label: "Last", stages: ["strategy"], note: "Needs at least three upstream inputs. A stance, an MVP and what to test first." },
];

const PRINCIPLES: { title: string; body: string }[] = [
  {
    title: "Evidence is checked in code, not trusted",
    body: "Agents may only cite sources that were actually retrieved. Every citation is checked against that list after generation; an unsupported claim is relabelled as inference, and a competitor that no source names is marked unverified. The model can't promote its own guesses to facts.",
  },
  {
    title: "Gaps stay gaps",
    body: "When a step fails, the report says so, and downstream agents are told what's missing instead of guessing it. Nothing fills the hole with plausible text. Retrying re-runs only that step and what depends on it.",
  },
  {
    title: "Structured, validated output",
    body: "Each agent answers in JSON matched against a schema. One repair pass sends back the exact validation problems; a truncated answer gets one retry with more room. After that it stops and shows why.",
  },
  {
    title: "Built for free-tier limits",
    body: "Calls share a tokens-per-minute budget per provider, learned from the provider's own rate-limit headers. Rate limits are waited out rather than failed, and a second provider can take over when the first is unavailable.",
  },
  {
    title: "Runs survive the tab",
    body: "On Vercel an analysis runs as a durable background workflow. Each agent is a persisted step, so closing the tab or losing the connection doesn't lose the run; reopening the project picks up where it was.",
  },
  {
    title: "Your ideas stay in your browser",
    body: "There are no accounts. Projects, versions and experiment notes live in local storage. A report leaves the browser only when you share it, and the shared copy omits experiment notes and other versions. You can withdraw a link at any time.",
  },
];

const LIMITS = [
  "Market sizes, prices and growth figures are only as good as the pages search returns. Check the cited source before relying on a number.",
  "Signals (demand, competition, effort…) are judgements, not measurements. They're shown as levels and never combined into a score.",
  "Without a search key, research runs on model knowledge only, and the report labels every section accordingly.",
  "The critique is adversarial by design. A hard stress test is a reason to run the experiments, not to drop the idea.",
];

export default function HowItWorks() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 md:px-10">
        <Logo />
        <div className="flex items-center gap-4">
          <Link href="/" className="text-[13px] text-ink-2 hover:text-ink">
            <span className="link-underline">Analyse an idea</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1200px] px-5 pb-24 md:px-10">
        <section className="pb-16 pt-12 md:pb-24 md:pt-24">
          <p className="label animate-rise">How it works</p>
          <h1 className="display animate-rise mt-6 max-w-4xl text-[44px] text-ink sm:text-[64px] lg:text-[84px]" style={{ animationDelay: "60ms" }}>
            Seven agents. Every claim labelled.
          </h1>
          <p className="measure animate-rise mt-6 text-[16px] leading-relaxed text-ink-2" style={{ animationDelay: "120ms" }}>
            IdeaGuard doesn&apos;t produce one long answer. It runs a small team of specialised agents as a dependency graph, checks their citations against what was actually retrieved, and shows you
            which parts of the report are evidence and which are reasoning.
          </p>
        </section>

        <section aria-labelledby="graph-title" className="border-t border-line pt-6">
          <h2 id="graph-title" className="label">
            The pipeline
          </h2>
          <ol className="mt-8 border-t border-line">
            {WAVES.map((w, i) => (
              <li key={i} className="grid gap-x-10 gap-y-3 border-b border-line py-6 md:grid-cols-[8rem_minmax(0,1fr)_minmax(0,22rem)]">
                <p className="mono text-[11px] uppercase tracking-[0.08em] text-ink-3">{w.label}</p>
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  {w.stages.map((s) => (
                    <p key={s} className="flex items-baseline gap-3 text-[18px] text-ink">
                      <span className="mono text-[11px] text-ink-4">{pad2(STAGE_IDS.indexOf(s) + 1)}</span>
                      {STAGE_COPY[s].agent}
                    </p>
                  ))}
                </div>
                <p className="text-[13.5px] leading-relaxed text-ink-3">{w.note}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="labels-title" className="mt-24 border-t border-line pt-6">
          <h2 id="labels-title" className="label">
            Reading a report
          </h2>
          <div className="mt-8 grid gap-10 md:grid-cols-3">
            <div className="border-l border-ink pl-4">
              <p className="text-[16px] text-ink">Evidence</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">Backed by a retrieved page. The citation links to it, and the citation was checked to exist.</p>
            </div>
            <div className="border-l border-dashed border-ink-3 pl-4">
              <p className="text-[16px] text-ink">Inference</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">Model reasoning without a source. Often useful, never presented as fact.</p>
            </div>
            <div className="border-l border-dashed border-line-2 pl-4">
              <p className="text-[16px] text-ink">○ Unavailable</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">A step didn&apos;t complete. The section says so, and nothing is filled in for it.</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="principles-title" className="mt-24 border-t border-line pt-6">
          <h2 id="principles-title" className="label">
            Guardrails
          </h2>
          <ol className="mt-8 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {PRINCIPLES.map((p, i) => (
              <li key={p.title} className="border-t border-line pt-5">
                <p className="mono text-[11px] text-ink-4">{pad2(i + 1)}</p>
                <h3 className="mt-3 text-[19px] leading-snug text-ink">{p.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{p.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="limits-title" className="mt-24 border-t border-line pt-6">
          <h2 id="limits-title" className="label">
            What it can&apos;t do
          </h2>
          <ul className="mt-8 grid gap-x-12 gap-y-4 md:grid-cols-2">
            {LIMITS.map((l) => (
              <li key={l} className="border-l border-dashed border-line-2 pl-4 text-[14px] leading-relaxed text-ink-2">
                {l}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-24 flex flex-wrap items-center gap-6 border-t border-line pt-10">
          <Link href="/" className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-[14px] text-on-ink transition-opacity hover:opacity-90">
            Analyse an idea
          </Link>
          {process.env.NEXT_PUBLIC_EXAMPLE_REPORT && (
            <Link href={process.env.NEXT_PUBLIC_EXAMPLE_REPORT} className="text-[14px] text-ink-2 hover:text-ink">
              <span className="link-underline">See an example report</span>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
