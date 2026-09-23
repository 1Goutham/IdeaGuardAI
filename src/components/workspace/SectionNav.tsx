"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cx, pad2 } from "@/lib/utils";
import { StatusDot } from "@/components/ui";
import type { IdeaVersion, StageStatus } from "@/types";
import { NAV } from "./nav";

function statusFor(item: (typeof NAV)[number], version: IdeaVersion, generating: (k: "prd" | "blueprint") => boolean): StageStatus | null {
  if (item.stage) return version.stages[item.stage].status;
  if (item.doc) return generating(item.doc) ? "running" : version[item.doc] ? "done" : null;
  return null;
}

function countFor(slug: string, version: IdeaVersion): string | null {
  const a = version.analysis;
  switch (slug) {
    case "research":
      return a.research ? (a.research.mode === "live" ? `${a.research.sources.length} src` : "offline") : null;
    case "competition":
      return a.competitors ? String(a.competitors.competitors.length) : null;
    case "risks":
      return a.risks ? String(a.risks.risks.length) : null;
    case "experiments": {
      const exps = a.critic?.experiments ?? [];
      if (!exps.length) return null;
      const settled = exps.filter((e) => ["validated", "invalidated"].includes(version.experiments[e.id]?.status ?? "")).length;
      return `${settled}/${exps.length}`;
    }
    default:
      return null;
  }
}

export function SectionNav({
  base,
  version,
  generating,
  variant,
}: {
  base: string;
  version: IdeaVersion;
  generating: (k: "prd" | "blueprint") => boolean;
  variant: "rail" | "bar";
}) {
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);
  const hrefOf = (slug: string) => (slug ? `${base}/${slug}` : base);
  const isActive = (slug: string) => pathname === hrefOf(slug);

  // Keep the active tab visible in the horizontal bar.
  useEffect(() => {
    if (variant === "bar") activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname, variant]);

  if (variant === "bar") {
    return (
      <nav aria-label="Workspace sections" className="no-scrollbar -mx-5 overflow-x-auto px-5">
        <ul className="flex min-w-max items-center gap-6">
          {NAV.map((item) => {
            const active = isActive(item.slug);
            const status = statusFor(item, version, generating);
            return (
              <li key={item.slug}>
                <Link
                  ref={active ? activeRef : undefined}
                  href={hrefOf(item.slug)}
                  aria-current={active ? "page" : undefined}
                  className={cx("relative flex h-11 items-center gap-2 text-[13.5px] transition-colors", active ? "text-ink" : "text-ink-3 hover:text-ink")}
                >
                  {status === "running" || status === "error" ? <StatusDot status={status} /> : null}
                  {item.label}
                  <span className={cx("absolute inset-x-0 bottom-0 h-px bg-ink transition-transform duration-300", active ? "scale-x-100" : "scale-x-0")} aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Workspace sections">
      <ul className="border-t border-line">
        {NAV.map((item, i) => {
          const active = isActive(item.slug);
          const status = statusFor(item, version, generating);
          const count = countFor(item.slug, version);
          return (
            <li key={item.slug} className="border-b border-line">
              <Link
                href={hrefOf(item.slug)}
                aria-current={active ? "page" : undefined}
                className={cx("group grid h-10 grid-cols-[1.75rem_1fr_auto] items-center gap-2 text-[14px] transition-colors", active ? "text-ink" : "text-ink-3 hover:text-ink")}
              >
                <span className={cx("mono text-[10.5px]", active ? "text-ink" : "text-ink-4")}>{pad2(i + 1)}</span>
                <span className="flex items-center gap-2">
                  {active && <span className="size-1.5 rounded-full bg-accent ring-1 ring-ink/40" aria-hidden="true" />}
                  <span className={cx("transition-transform duration-300", !active && "group-hover:translate-x-0.5")}>{item.label}</span>
                </span>
                <span className="flex items-center gap-2">
                  {count && status === "done" && <span className="mono text-[10.5px] text-ink-4">{count}</span>}
                  {status && status !== "done" && status !== "idle" && (
                    <>
                      <StatusDot status={status} />
                      <span className="sr-only">{status === "running" ? "in progress" : status === "error" ? "needs attention" : "queued"}</span>
                    </>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
