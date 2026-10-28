"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/utils";

/** Small square mark, for favicons and tight spots. */
export function LogoMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={cx("shrink-0", className)} aria-hidden="true">
      <path d="M8 3.5H4.5v17H8M16 3.5h3.5v17H16" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3" fill="var(--accent)" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export const LOGO_SRC = "/ideaguardlogo.png";
/** public/ideaguardlogo.png is 340 × 114. */
const LOGO_RATIO = 340 / 114;

/**
 * The wordmark from public/ideaguardlogo.png, sized by height with its
 * width reserved up front so nothing shifts while it loads. Falls back to
 * typeset text if the file is missing.
 */
export function Wordmark({ height = 22, className, priority }: { height?: number; className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  // A load error can happen before hydration, when onError has already fired.
  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    return (
      <span className={cx("inline-flex select-none items-center font-medium leading-none tracking-[-0.04em]", className)} style={{ height, fontSize: height * 0.62 }}>
        <span className="text-ink">Idea</span>
        <span className="text-accent">Guard</span>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small static PNG; next/image adds nothing here
    <img
      ref={img}
      src={LOGO_SRC}
      alt=""
      width={Math.round(height * LOGO_RATIO)}
      height={height}
      fetchPriority={priority ? "high" : undefined}
      draggable={false}
      onError={() => setFailed(true)}
      className={cx("block select-none", className)}
      style={{ height, width: "auto" }}
    />
  );
}

export function Logo({ href = "/", height = 30, className }: { href?: string; height?: number; className?: string }) {
  const [wobble, setWobble] = useState(false);
  return (
    <Link
      href={href}
      aria-label="IdeaGuard home"
      className={cx("inline-flex origin-left items-center", wobble && "animate-wobble", className)}
      onMouseEnter={() => setWobble(true)}
      onAnimationEnd={() => setWobble(false)}
    >
      <Wordmark height={height} />
    </Link>
  );
}
