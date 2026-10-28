"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
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
                  className={cx("relative flex h-11 items-center gap-2 text-[13px] font-light transition-colors", active ? "text-ink" : "text-ink-3 hover:text-ink")}
                >
                  {status === "running" || status === "error" ? <StatusDot status={status} /> : null}
                  {item.label}
                  {active && <motion.span layoutId="bar-line" className="absolute inset-x-0 bottom-0 h-px bg-accent" aria-hidden="true" />}
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
      <ul className="space-y-0.5">
        {NAV.map((item, i) => {
          const active = isActive(item.slug);
          const status = statusFor(item, version, generating);
          const count = countFor(item.slug, version);
          return (
            <li key={item.slug}>
              <Link
                href={hrefOf(item.slug)}
                aria-current={active ? "page" : undefined}
                className={cx("group relative flex h-7 items-center gap-2 text-[13px] font-light transition-colors", active ? "text-ink" : "text-ink-3 hover:text-ink")}
              >
                {active && <motion.span layoutId="nav-bead" className="absolute -left-3.5 size-[5px] rounded-full bg-accent" transition={{ type: "spring", stiffness: 520, damping: 34 }} aria-hidden="true" />}
                <span className={cx("transition-transform duration-300 ease-[var(--ease-spring)]", !active && "group-hover:translate-x-1")}>
                  <span className={cx(active ? "text-ink-2" : "text-ink-4")}>[{pad2(i + 1)}]</span> {item.label}
                </span>
                {count && status === "done" && <sup className="mono text-[9px] text-ink-4">{count}</sup>}
                {status && status !== "done" && status !== "idle" && (
                  <>
                    <StatusDot status={status} />
                    <span className="sr-only">{status === "running" ? "in progress" : status === "error" ? "needs attention" : "queued"}</span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
