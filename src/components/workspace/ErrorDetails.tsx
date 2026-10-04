import type { AiErrorCode, AiErrorDetail } from "@/lib/ai/contracts";

const REASON: Partial<Record<AiErrorCode, string>> = {
  rate_limited: "Provider rate limit",
  too_large: "Request larger than the provider allows",
  timeout: "Timed out",
  upstream: "Provider error",
  network: "Network",
  malformed: "Structured output validation failed",
  truncated: "Output cut off at the token limit",
  empty: "Empty response",
  blocked: "Declined by the provider",
  unavailable: "Required input unavailable",
  not_configured: "No model configured",
};

/** Technical detail for a failed step. Already sanitised on the server: no keys, no account IDs. */
export function ErrorDetails({ code, detail }: { code?: AiErrorCode; detail?: AiErrorDetail }) {
  if (!code && !detail) return null;
  const rows: [string, React.ReactNode][] = [];
  if (code) rows.push(["Reason", REASON[code] ?? code]);
  if (detail?.provider) rows.push(["Provider", `${detail.provider}${detail.model ? ` · ${detail.model}` : ""}`]);
  if (detail?.status) rows.push(["HTTP status", `${detail.status}${detail.providerCode ? ` · ${detail.providerCode}` : ""}`]);
  if (detail?.attempts) rows.push(["Attempts", String(detail.attempts)]);
  return (
    <div className="mono space-y-3 text-[11.5px] leading-relaxed text-ink-2">
      <dl className="grid grid-cols-[7.5rem_1fr] gap-x-4 gap-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-4">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {detail?.issues?.length ? (
        <div>
          <p className="text-ink-4">Expected vs received</p>
          <ul className="mt-1 space-y-0.5">
            {detail.issues.map((i) => (
              <li key={i}>— {i}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {detail?.received ? (
        <div>
          <p className="text-ink-4">Received (start)</p>
          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-sm border border-line bg-surface px-3 py-2 text-[11px] text-ink-3">{detail.received}</pre>
        </div>
      ) : null}
    </div>
  );
}
