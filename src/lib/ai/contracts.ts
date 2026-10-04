/**
 * Shared error and response envelope between API routes and the browser.
 * Keep this file free of server-only imports.
 */

export type AiErrorCode =
  | "not_configured"
  | "invalid_request"
  | "rate_limited"
  | "too_large"
  | "timeout"
  | "upstream"
  | "blocked"
  | "empty"
  | "truncated"
  | "malformed"
  | "network"
  | "unavailable";

/**
 * Technical detail for the "How this was produced" panel. Never contains
 * keys, headers or account identifiers; see `sanitize`.
 */
export interface AiErrorDetail {
  provider?: string;
  model?: string;
  status?: number;
  providerCode?: string;
  /** Schema paths that failed validation, e.g. "competitors.0.name: Required". */
  issues?: string[];
  /** The start of what the model actually returned. */
  received?: string;
  attempts?: number;
}

export interface AiError {
  code: AiErrorCode;
  message: string;
  retryable: boolean;
  detail?: AiErrorDetail;
}

export type AiResponse<T> = { ok: true; data: T } | { ok: false; error: AiError };

export function aiError(code: AiErrorCode, message: string, retryable = false, detail?: AiErrorDetail): { ok: false; error: AiError } {
  return { ok: false, error: { code, message, retryable, ...(detail ? { detail } : {}) } };
}

/** Remove anything that looks like a credential or account identifier from provider text. */
export function sanitize(text: string, max = 400): string {
  return text
    .replace(/\b(sk|gsk|pk|rk)[-_][A-Za-z0-9_-]{8,}/g, "[redacted]")
    .replace(/\bAIza[0-9A-Za-z_-]{20,}/g, "[redacted]")
    .replace(/\b(org|proj|user|acct)_[A-Za-z0-9]{4,}/g, "[account]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
