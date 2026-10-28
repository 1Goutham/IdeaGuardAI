import { cx } from "@/lib/utils";
import { LoopArrow, Scramble } from "@/components/ui";

const STEPS = ["Research", "Stress-test", "Validate", "Build"];
export const AUTHOR_URL = process.env.NEXT_PUBLIC_AUTHOR_URL || "https://1goutham.space/";

/** The quiet bottom bar shared by every page. */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cx("no-print mono flex flex-col gap-3 py-5 text-[11.5px] text-ink-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <ol className="flex flex-wrap gap-x-3 gap-y-1" aria-label="What IdeaGuard does">
        {STEPS.map((s, i) => (
          <li key={s} className="cursor-default transition-colors hover:text-ink">
            <Scramble text={`[0${i + 1}] ${s}`} />
          </li>
        ))}
      </ol>
      <a href={AUTHOR_URL} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-1.5 transition-colors hover:text-ink">
        A Product by <span className="text-ink-2 group-hover:text-ink">1Goutham</span>
        <LoopArrow size={11} />
      </a>
    </footer>
  );
}
