/**
 * Shared error and response envelope between API routes and the browser.
 * Keep this file free of server-only imports.
 */

export type AiErrorCode =
  | "not_configured"
  | "invalid_request"
  | "rate_limited"
  | "timeout"
  | "upstream"
  | "blocked"
  | "empty"
  | "malformed"
  | "network";

export interface AiError {
  code: AiErrorCode;
  message: string;
  retryable: boolean;
}

export type AiResponse<T> = { ok: true; data: T } | { ok: false; error: AiError };

export function aiError(code: AiErrorCode, message: string, retryable = false): { ok: false; error: AiError } {
  return { ok: false, error: { code, message, retryable } };
}
