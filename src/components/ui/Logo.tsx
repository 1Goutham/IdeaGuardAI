import Link from "next/link";
import { cx } from "@/lib/utils";

/**
 * The mark: a bracket pair holding a single point, the idea, held up to
 * scrutiny. The dot is the only place the accent appears at rest.
 */
export function LogoMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={cx("shrink-0", className)} aria-hidden="true">
      <path d="M8 3.5H4.5v17H8M16 3.5h3.5v17H16" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3" fill="var(--accent)" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function Logo({ href = "/", className, compact }: { href?: string; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cx("inline-flex items-center gap-2 text-ink", className)} aria-label="IdeaGuard home">
      <LogoMark />
      {!compact && <span className="text-[15px] font-medium tracking-tight">IdeaGuard</span>}
    </Link>
  );
}
