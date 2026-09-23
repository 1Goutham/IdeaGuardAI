"use client";

import { useSyncExternalStore } from "react";
import { cx } from "@/lib/utils";
import { IconMonitor, IconMoon, IconSun } from "./Icons";

type Theme = "system" | "light" | "dark";
const KEY = "ideaguard:theme";
const ORDER: Theme[] = ["system", "light", "dark"];
const EVENT = "ideaguard:theme";

/** Inline script that applies the saved theme before first paint. */
export const themeScript = `(function(){try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}})();`;

function read(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : "system";
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function apply(next: Theme) {
  try {
    if (next === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch {
    /* storage unavailable: theme still applies for this page */
  }
  if (next === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = next;
  window.dispatchEvent(new Event(EVENT));
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);
  const Icon = theme === "light" ? IconSun : theme === "dark" ? IconMoon : IconMonitor;
  return (
    <button
      type="button"
      onClick={() => apply(ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length])}
      className={cx("inline-flex size-8 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-ink/5 hover:text-ink", className)}
      aria-label={`Theme: ${theme}. Switch theme`}
      title={`Theme: ${theme}`}
    >
      <Icon size={15} />
    </button>
  );
}
