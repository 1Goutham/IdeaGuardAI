import { IdeaComposer } from "@/components/home/IdeaComposer";
import { ProjectsMenu } from "@/components/home/ProjectList";
import { AUTHOR_URL, SiteFooter } from "@/components/SiteFooter";
import { BracketLink } from "@/components/ui";

const CONTACT_URL = process.env.NEXT_PUBLIC_CONTACT_URL || AUTHOR_URL;

export default function Home() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[1280px] flex-col px-5 md:px-10">
      <header className="flex h-16 items-center justify-between">
        <ProjectsMenu />
        <nav className="flex items-center gap-4" aria-label="Site">
          <BracketLink href="/how-it-works">How it works</BracketLink>
          <BracketLink href={CONTACT_URL} external>
            Contact
          </BracketLink>
        </nav>
      </header>

      <main id="main" className="flex flex-1 flex-col items-center justify-center py-16">
        <div className="animate-fade w-full max-w-[1000px]">
          <IdeaComposer />
        </div>
        <p className="animate-fade mt-16 text-center text-[12.5px] font-light leading-relaxed text-ink-3 [animation-delay:120ms]">
          An AI-powered product validation tool that helps turn raw ideas into viable opportunities.
          <br className="hidden md:block" /> It analyses market potential, competition, risks, and differentiation to help builders make smarter product decisions.
        </p>
        {process.env.NEXT_PUBLIC_EXAMPLE_REPORT && (
          <BracketLink href={process.env.NEXT_PUBLIC_EXAMPLE_REPORT} className="animate-fade mt-5 [animation-delay:160ms]">
            See an example report
          </BracketLink>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
