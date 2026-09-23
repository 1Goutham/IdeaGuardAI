import { cx } from "@/lib/utils";

/** Mono uppercase tag. `tone` only shifts ink weight; colour is reserved for state. */
export function Tag({ children, tone = "default", className, title }: { children: React.ReactNode; tone?: "default" | "strong" | "muted" | "danger" | "success"; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cx(
        "mono inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[10.5px] uppercase tracking-[0.1em]",
        tone === "strong" && "border-ink bg-ink text-on-ink",
        tone === "default" && "border-line-2 text-ink-2",
        tone === "muted" && "border-dashed border-line-2 text-ink-3",
        tone === "danger" && "border-danger/40 text-danger",
        tone === "success" && "border-success/40 text-success",
        className,
      )}
    >
      {children}
    </span>
  );
}
