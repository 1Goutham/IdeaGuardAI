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

/**
 * The wordmark. Uses public/ideaguardlogo.png when it exists; until then
 * (or if it fails to load) a typeset fallback in the same spirit. Gives a
 * small wobble when you hover it.
 */
export function Wordmark({ height = 22, className }: { height?: number; className?: string }) {
  const img = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // The image may finish loading before hydration, when onLoad has already fired.
  useEffect(() => {
    const el = img.current;
    if (el?.complete) {
      if (el.naturalWidth > 0) setLoaded(true);
      else setFailed(true);
    }
  }, []);

  return (
    <span className={cx("relative inline-flex items-center", className)} style={{ height }}>
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element -- intrinsic size of a user-supplied file is unknown
        <img
          ref={img}
          src={LOGO_SRC}
          alt=""
          style={{ height }}
          className={cx("w-auto select-none transition-opacity duration-300", loaded ? "opacity-100" : "absolute opacity-0")}
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
      {!loaded && (
        <span className="select-none font-medium leading-none tracking-[-0.04em]" style={{ fontSize: height * 0.86 }} aria-hidden="true">
          <span className="text-ink">Idea</span>
          <span className="text-accent">Guard</span>
        </span>
      )}
    </span>
  );
}

export function Logo({ href = "/", height = 22, className }: { href?: string; height?: number; className?: string }) {
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
