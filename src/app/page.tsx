import { EngineStatus } from "@/components/home/EngineStatus";
import { IdeaComposer } from "@/components/home/IdeaComposer";
import { PipelineStrip } from "@/components/home/PipelineStrip";
import { ProjectList } from "@/components/home/ProjectList";
import { Logo, ThemeToggle } from "@/components/ui";

const VERBS = ["Research", "Stress-test", "Validate", "Build"];

export default function Home() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 md:px-10">
        <Logo />
        <div className="flex items-center gap-4">
          <EngineStatus className="hidden md:flex" />
          <ThemeToggle />
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1200px] px-5 pb-24 md:px-10">
        <section className="grid gap-10 pb-14 pt-12 md:grid-cols-12 md:pb-20 md:pt-24">
          <div className="md:col-span-8">
            <p className="label animate-rise">IdeaGuard · Product intelligence</p>
            <h1 className="display animate-rise mt-6 text-[52px] text-ink sm:text-[76px] lg:text-[104px]" style={{ animationDelay: "60ms" }}>
              Turn an idea
              <br />
              into evidence.
            </h1>
          </div>
          <ol className="animate-rise flex flex-col justify-end gap-1.5 md:col-span-3 md:col-start-10" style={{ animationDelay: "140ms" }} aria-label="What IdeaGuard does">
            {VERBS.map((v, i) => (
              <li key={v} className="flex items-baseline gap-4 border-b border-line pb-1.5 text-[17px] text-ink-2 last:border-b-0">
                <span className="mono text-[11px] text-ink-4">0{i + 1}</span>
                {v}.
              </li>
            ))}
          </ol>
        </section>

        <div className="animate-rise max-w-[880px]" style={{ animationDelay: "200ms" }}>
          <IdeaComposer />
          <EngineStatus className="mt-6 md:hidden" />
        </div>

        <div className="mt-24 space-y-20">
          <ProjectList />
          <PipelineStrip />
        </div>
      </main>

      <footer className="mx-auto max-w-[1200px] px-5 md:px-10">
        <div className="flex flex-col gap-2 border-t border-line py-6 text-[12px] text-ink-3 md:flex-row md:items-center md:justify-between">
          <p>Local-first. Projects are stored in this browser only.</p>
          <p>
            IdeaGuard · designed and built by{" "}
            <a href="https://github.com/1Goutham" target="_blank" rel="noreferrer" className="link-underline text-ink">
              Goutham ↗
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
