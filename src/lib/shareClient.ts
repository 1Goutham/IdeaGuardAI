import type { AiResponse } from "@/lib/ai/contracts";
import type { SharedReport } from "./share";

/** Browser calls for publishing, updating and revoking shared reports. */

async function call<T>(url: string, init: RequestInit): Promise<AiResponse<T>> {
  try {
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
    const json = (await res.json().catch(() => null)) as AiResponse<T> | null;
    return json ?? { ok: false, error: { code: "upstream", message: `IdeaGuard returned ${res.status}.`, retryable: true } };
  } catch {
    return { ok: false, error: { code: "network", message: "Couldn't reach IdeaGuard.", retryable: true } };
  }
}

export const shareApi = {
  available: () => call<{ available: boolean }>("/api/share", { method: "GET" }),
  create: (report: SharedReport) => call<{ id: string; token: string; path: string }>("/api/share", { method: "POST", body: JSON.stringify({ report }) }),
  update: (id: string, token: string, report: SharedReport) => call<object>(`/api/share/${id}`, { method: "PUT", body: JSON.stringify({ report, token }) }),
  remove: (id: string, token: string) => call<object>(`/api/share/${id}`, { method: "DELETE", body: JSON.stringify({ token }) }),
};
