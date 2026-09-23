import Link from "next/link";
import { forwardRef } from "react";
import { cx } from "@/lib/utils";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface BaseProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  full?: boolean;
  className?: string;
  children: React.ReactNode;
}

const base =
  "group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-normal transition-[background-color,color,border-color,opacity,transform] duration-300 select-none disabled:opacity-40 active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-on-ink hover:opacity-90 disabled:hover:opacity-40",
  secondary: "border border-line-2 bg-transparent text-ink hover:border-ink",
  ghost: "bg-transparent text-ink-2 hover:bg-ink/5 hover:text-ink",
  danger: "bg-transparent text-danger hover:bg-danger/10",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-10 px-5 text-[14px]",
  lg: "h-12 px-6 text-[15px]",
};

type ButtonProps = BaseProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, full, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(base, variants[variant], sizes[size], full && "w-full", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});

export function LinkButton({
  href,
  variant = "secondary",
  size = "md",
  full,
  className,
  children,
}: BaseProps & { href: string }) {
  return (
    <Link href={href} className={cx(base, variants[variant], sizes[size], full && "w-full", className)}>
      {children}
    </Link>
  );
}

/** Mono bracketed text action: [ Copy ]. Quiet enough for toolbars. */
export function TextAction({
  className,
  active,
  children,
  type = "button",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type={type}
      className={cx("bracket h-7 text-[12.5px] transition-colors disabled:opacity-40", active ? "text-ink" : "text-ink-2 hover:text-ink", className)}
      {...rest}
    >
      <span className="bracket-l" aria-hidden="true">[</span>
      <span className="inline-flex items-center gap-1.5">{children}</span>
      <span className="bracket-r" aria-hidden="true">]</span>
    </button>
  );
}

export function BracketLink({ href, children, className, external }: { href: string; children: React.ReactNode; className?: string; external?: boolean }) {
  const cls = cx("bracket text-[12.5px] text-ink-2 hover:text-ink", className);
  const inner = (
    <>
      <span className="bracket-l" aria-hidden="true">[</span>
      <span className="inline-flex items-center gap-1.5">{children}</span>
      <span className="bracket-r" aria-hidden="true">]</span>
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}
