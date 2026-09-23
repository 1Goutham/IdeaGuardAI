"use client";

import { forwardRef, useEffect, useRef } from "react";
import { cx } from "@/lib/utils";

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autosize?: boolean;
  minRows?: number;
  /** Borderless, for large editorial inputs. */
  bare?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea({ className, autosize, minRows = 3, bare, value, ...rest }, ref) {
  const inner = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = inner.current;
    if (!el || !autosize) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, autosize]);
  return (
    <textarea
      ref={(node) => {
        inner.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      rows={minRows}
      value={value}
      className={cx(
        "w-full resize-none bg-transparent text-ink placeholder:text-ink-4 focus:outline-none",
        !bare && "rounded-md border border-line-2 px-4 py-3 text-[15px] leading-relaxed transition-colors hover:border-ink-3 focus:border-ink",
        className,
      )}
      {...rest}
    />
  );
});
