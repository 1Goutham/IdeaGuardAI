import type { StageEvent } from "@/lib/agents/orchestrator";
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

/** Streams pipeline events. Resolves when the stream ends; `error` is set if it couldn't start or broke. */
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

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sawDone = false;
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
          const event = JSON.parse(line) as StageEvent;
          if (event.type === "done") sawDone = true;
          onEvent(event);
        } catch {
          /* ignore a malformed line */
        }
      }
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return { error: { code: "network", message: "Stopped.", retryable: true } };
    return { error: { code: "network", message: "The connection dropped during analysis.", retryable: true } };
  }
  return { error: sawDone ? null : { code: "network", message: "The analysis ended early. The server may have timed out.", retryable: true } };
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
}

export async function fetchEngine(): Promise<EngineInfo | null> {
  try {
    const res = await fetch("/api/engine", { cache: "no-store" });
    return res.ok ? ((await res.json()) as EngineInfo) : null;
  } catch {
    return null;
  }
}
