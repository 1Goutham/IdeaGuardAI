import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-[720px] flex-col justify-center px-5">
      <p className="label">404</p>
      <h1 className="display mt-4 text-[44px] leading-[1.05]">Nothing here.</h1>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-3">If someone shared this link with you, they may have stopped sharing it. Shared reports can be withdrawn at any time.</p>
      <div className="mt-8">
        <LinkButton href="/" variant="primary">
          Go to IdeaGuard
        </LinkButton>
      </div>
    </main>
  );
}
