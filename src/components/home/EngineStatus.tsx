"use client";

import { useState } from "react";
import { checkConnection, type ConnectionCheck } from "@/lib/ai/client";
import { useEngine } from "@/lib/store/useEngine";
import { cx } from "@/lib/utils";
import { TextAction } from "@/components/ui";

/** What the analysis will run on, with a live check. Honest about offline research and development engines. */
export function EngineStatus({ className }: { className?: string }) {
  const { info, loading } = useEngine();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ConnectionCheck | { error: string } | null>(null);

  if (loading) return <span className={cx("mono text-[11px] text-ink-4", className)}>Checking engine…</span>;
  if (!info?.model) {
    return (
      <span className={cx("mono text-[11px] text-danger", className)} role="status">
        No model connected
      </span>
    );
  }

  const run = async () => {
    setChecking(true);
    const res = await checkConnection();
    setChecking(false);
    setResult(res.ok ? res.data : { error: res.error.message });
  };

  return (
    <div className={cx("relative", className)}>
      <span className="mono flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-accent ring-1 ring-ink/30" aria-hidden="true" />
          {info.model.label}
          {info.model.model ? ` · ${info.model.model}` : ""}
        </span>
        <span className={info.research ? "" : "text-warn"}>Research: {info.research ?? "offline"}</span>
        <TextAction onClick={run} disabled={checking} aria-label="Test the model and research connections">
          {checking ? "Testing…" : "Test"}
        </TextAction>
      </span>
      {result && (
        <div role="status" className="absolute right-0 top-full z-40 mt-3 w-[min(360px,calc(100vw-2.5rem))] rounded-lg border border-line-2 bg-paper p-4 shadow-[0_24px_60px_-30px_rgb(0_0_0/0.45)]">
          <div className="flex items-baseline justify-between gap-4">
            <p className="label">Connection check</p>
            <TextAction onClick={() => setResult(null)}>Close</TextAction>
          </div>
          {"error" in result ? (
            <p className="mt-3 text-[13px] text-danger">{result.error}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {result.providers.map((p, i) => (
                <Row key={p.id} ok={p.ok && p.structured} warn={p.ok && !p.structured} title={`${p.label}${i === 0 ? "" : " · fallback"}`} meta={p.model ?? ""} ms={p.latencyMs} detail={p.error?.message} />
              ))}
              {result.research ? (
                <Row ok={result.research.ok} title={`Research · ${result.research.label}`} meta={`${result.research.results} results`} ms={result.research.latencyMs} detail={result.research.error} />
              ) : (
                <Row ok={false} warn title="Research" meta="not configured" detail="Analyses will be labelled inference-only. Add TAVILY_API_KEY for live sources." />
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ ok, warn, title, meta, ms, detail }: { ok: boolean; warn?: boolean; title: string; meta: string; ms?: number; detail?: string }) {
  return (
    <li className="py-2.5">
      <div className="flex items-baseline gap-2.5 text-[12.5px]">
        <span className={cx("size-1.5 shrink-0 translate-y-[-1px] rounded-full", ok ? "bg-accent ring-1 ring-ink/30" : warn ? "bg-warn" : "bg-danger")} aria-hidden="true" />
        <span className="text-ink">{title}</span>
        <span className="sr-only">{ok ? "working" : warn ? "warning" : "failed"}</span>
        <span className="mono ml-auto shrink-0 text-[10.5px] text-ink-4">
          {meta}
          {ms !== undefined ? ` · ${(ms / 1000).toFixed(1)}s` : ""}
        </span>
      </div>
      {detail && <p className="mt-1 pl-4 text-[12px] leading-relaxed text-ink-3">{detail}</p>}
    </li>
  );
}
