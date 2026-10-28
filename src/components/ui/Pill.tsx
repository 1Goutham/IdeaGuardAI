import Link from "next/link";
import { forwardRef } from "react";
import { cx } from "@/lib/utils";
import { IconArrowUpRight } from "./Icons";
import { Spinner } from "./Spinner";

/** ↗ that exits top-right and re-enters from bottom-left on hover. */
export function LoopArrow({ size = 14 }: { size?: number }) {
  return (
    <span className="arrow-loop" style={{ width: size, height: size }} aria-hidden="true">
      <IconArrowUpRight size={size} />
      <IconArrowUpRight size={size} />
    </span>
  );
}

type PillProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { small?: boolean; loading?: boolean; arrow?: boolean };

/** The white pill: one primary action per screen. */
export const Pill = forwardRef<HTMLButtonElement, PillProps>(function Pill({ small, loading, arrow = true, className, children, disabled, type = "button", ...rest }, ref) {
  return (
    <button ref={ref} type={type} className={cx("pill group", small && "pill-sm", className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {children}
      {loading ? <Spinner /> : arrow && <LoopArrow size={small ? 12 : 14} />}
    </button>
  );
});

export function PillLink({ href, small, className, children, external }: { href: string; small?: boolean; className?: string; children: React.ReactNode; external?: boolean }) {
  const cls = cx("pill group", small && "pill-sm", className);
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {children}
      <LoopArrow size={small ? 12 : 14} />
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
      <LoopArrow size={small ? 12 : 14} />
    </Link>
  );
}
