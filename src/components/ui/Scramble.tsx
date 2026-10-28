"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "abcdefghijklmnopqrstuvwxyz#%&*+=/<>?";

/**
 * Text that scrambles and resolves left to right when hovered or focused.
 * Static for screen readers and for people who prefer reduced motion.
 */
export function Scramble({ text, className }: { text: string; className?: string }) {
  const [shown, setShown] = useState(text);
  const frame = useRef<number | null>(null);

  useEffect(() => () => void (frame.current && cancelAnimationFrame(frame.current)), []);

  const play = () => {
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    const start = performance.now();
    const duration = 380 + text.length * 18;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const settled = Math.floor(p * text.length);
      setShown(
        text
          .split("")
          .map((c, i) => (i < settled || c === " " || c === "[" || c === "]" ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join(""),
      );
      if (p < 1) frame.current = requestAnimationFrame(tick);
      else frame.current = null;
    };
    frame.current = requestAnimationFrame(tick);
  };

  return (
    <span className={className} onMouseEnter={play} onFocus={play} aria-label={text}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
