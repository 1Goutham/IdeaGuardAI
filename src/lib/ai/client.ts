import type { StageEvent } from "@/lib/agents/events";
import type { AiError, AiResponse } from "./contracts";
import type { AnalyseRequest, DocumentRequest } from "./requests";

/**
 * Browser-side client for the API routes. Never throws; failures come back
 * as typed errors so the UI can show a precise, retryable state.
 */

const offline: AiError = { code: "network", message: "Couldn't reach IdeaGuard. Check your connection and try again.", retryable: true };

async function errorFrom(res: Response): Promise<AiError> {
  const json = (await res.json().catch(() => null)) as AiResponse<never> | null;
  if (json && !json.ok) return json.error;
  return { code: "upstream", message: `IdeaGuard returned ${res.status}.`, retryable: res.status >= 500 };
}

/** Reads an NDJSON body line by line. Returns an error only when the connection broke. */
async function readLines(res: Response, onLine: (value: unknown) => void): Promise<AiError | null> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        try {
          onLine(JSON.parse(line));
        } catch {
          /* ignore a malformed line */
        }
      }
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return { code: "network", message: "Stopped.", retryable: true };
    return { code: "network", message: "The connection dropped during analysis.", retryable: true };
  }
  return null;
}

/** Inline runner: streams pipeline events from one request. */
export async function streamAnalysis(
  body: AnalyseRequest,
  onEvent: (e: StageEvent) => void,
  signal?: AbortSignal,
): Promise<{ error: AiError | null }> {
  let res: Response;
  try {
    res = await fetch("/api/analyse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  } catch (e) {
    return { error: (e as Error)?.name === "AbortError" ? { code: "network", message: "Stopped.", retryable: true } : offline };
  }
  if (!res.ok || !res.body) return { error: await errorFrom(res) };
  let sawDone = false;
  const broken = await readLines(res, (v) => {
    const event = v as StageEvent;
    if (event.type === "done") sawDone = true;
    onEvent(event);
  });
  if (broken) return { error: broken };
  return { error: sawDone ? null : { code: "network", message: "The analysis ended early. The server may have timed out.", retryable: true } };
}

/* Durable runner ------------------------------------------------------ */

export async function startRun(body: AnalyseRequest): Promise<AiResponse<{ runId: string }>> {
  try {
    const res = await fetch("/api/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) return { ok: false, error: await errorFrom(res) };
    return (await res.json()) as AiResponse<{ runId: string }>;
  } catch {
    return { ok: false, error: offline };
  }
}

/**
 * Reads a durable run's events from `from`. Resolves when the stream ends:
 * `done` if the run finished, otherwise the caller decides whether to reconnect.
 */
export async function followRun(
  runId: string,
  from: number,
  onEvent: (e: StageEvent, index: number) => void,
  signal?: AbortSignal,
): Promise<{ done: boolean; error: AiError | null; notFound?: boolean }> {
  let res: Response;
  try {
    res = await fetch(`/api/runs/${encodeURIComponent(runId)}/events?from=${from}`, { signal, cache: "no-store" });
  } catch (e) {
    return { done: false, error: (e as Error)?.name === "AbortError" ? { code: "network", message: "Stopped.", retryable: true } : offline };
  }
  if (res.status === 404) return { done: false, error: await errorFrom(res), notFound: true };
  if (!res.ok || !res.body) return { done: false, error: await errorFrom(res) };
  let done = false;
  const broken = await readLines(res, (v) => {
    const { i, e } = v as { i: number; e: StageEvent };
    if (e.type === "done") done = true;
    onEvent(e, i);
  });
  return { done, error: broken };
}

export async function runStatus(runId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/runs/${encodeURIComponent(runId)}`, { cache: "no-store" });
    if (!res.ok) return res.status === 404 ? "missing" : null;
    return ((await res.json()) as AiResponse<{ status: string }> & { data?: { status: string } }).data?.status ?? null;
  } catch {
    return null;
  }
}

export async function cancelRun(runId: string): Promise<void> {
  try {
    await fetch(`/api/runs/${encodeURIComponent(runId)}/cancel`, { method: "POST" });
  } catch {
    /* the run may already be finished */
  }
}

export async function generateDocument<T>(body: DocumentRequest): Promise<AiResponse<{ data: T; engine: string }>> {
  try {
    const res = await fetch("/api/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) return { ok: false, error: await errorFrom(res) };
    return (await res.json()) as AiResponse<{ data: T; engine: string }>;
  } catch {
    return { ok: false, error: offline };
  }
}

export interface EngineInfo {
  model: { label: string; model: string | null } | null;
  fallbacks: string[];
  research: string | null;
  development: boolean;
  /** "durable": background workflow runs; "inline": one streaming request. */
  runner: "durable" | "inline";
}

let engineOnce: Promise<EngineInfo | null> | null = null;

/** Cached for the page's lifetime. */
export function engineInfo(): Promise<EngineInfo | null> {
  engineOnce ??= fetchEngine();
  return engineOnce;
}

export async function fetchEngine(): Promise<EngineInfo | null> {
  try {
    const res = await fetch("/api/engine", { cache: "no-store" });
    return res.ok ? ((await res.json()) as EngineInfo) : null;
  } catch {
    return null;
  }
}

export interface ConnectionCheck {
  providers: { id: string; label: string; model: string | null; ok: boolean; structured: boolean; latencyMs: number; error?: { code: string; message: string } }[];
  research: { label: string; ok: boolean; latencyMs: number; results: number; error?: string } | null;
  checkedAt: string;
}

export async function checkConnection(): Promise<AiResponse<ConnectionCheck>> {
  try {
    const res = await fetch("/api/engine/check", { method: "POST" });
    if (!res.ok) return { ok: false, error: await errorFrom(res) };
    return (await res.json()) as AiResponse<ConnectionCheck>;
  } catch {
    return { ok: false, error: offline };
  }
}
