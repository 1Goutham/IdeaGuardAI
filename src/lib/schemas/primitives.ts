import { z } from "zod";

/**
 * Lenient building blocks for model output.
 *
 * Models drift in small ways: "High" instead of "high", a stray null, one
 * malformed item in a list of eight. These helpers normalise that drift so a
 * single bad item never discards a whole section, while the JSON Schema that
 * the prompt shows the model stays clean (zod renders the inner schema in
 * `io: "input"` mode).
 */

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Enum that accepts "High", "problem_clarity", "Problem clarity" etc. and maps them to the canonical value. */
export function exactlyOneOf<const T extends readonly [string, ...string[]]>(values: T) {
  const canonical = new Map(values.map((v) => [squash(v), v]));
  return z.preprocess((v) => (typeof v === "string" ? (canonical.get(squash(v)) ?? v) : v), z.enum(values));
}

/** As above, but an unrecognised value falls back instead of failing. */
export function oneOf<const T extends readonly [string, ...string[]]>(values: T, fallback: T[number]) {
  return exactlyOneOf(values).catch(fallback);
}

export const level = oneOf(["low", "medium", "high"] as const, "medium");

/**
 * Internal data is plain text. Models sometimes add markdown anyway (**bold**,
 * "# ", "- " bullets, `code`); strip it here so it never reaches storage.
 * Rendering decides formatting, not the model.
 */
export function plain(value: string): string {
  return value
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}

/** A required sentence. Empty or missing fails validation so the repair pass can ask again. */
export const text = (description: string) => z.string().transform(plain).pipe(z.string().min(1)).describe(description);

/** Optional prose; missing becomes "". */
export const optText = (description: string) =>
  z
    .preprocess((v) => (v == null ? "" : typeof v === "string" ? plain(v) : v), z.string().trim())
    .catch("")
    .describe(description);

/** A list that drops invalid items instead of failing as a whole. */
export function list<T extends z.ZodType>(item: T, description: string, max = 12) {
  return z
    .preprocess(
      (v) => (Array.isArray(v) ? v.filter((x) => item.safeParse(x).success).slice(0, max) : []),
      z.array(item),
    )
    .describe(description);
}

export const strings = (description: string, max = 10) => list(z.string().transform(plain).pipe(z.string().min(1)), description, max);

/** Source references like "S3". Validity against the real source list is checked later, in grounding. */
export const sourceIds = z
  .preprocess(
    (v) =>
      Array.isArray(v)
        ? v
            .map((x) => (typeof x === "number" ? `S${x}` : typeof x === "string" ? x.trim().toUpperCase() : ""))
            .filter((x) => /^S\d+$/.test(x))
        : [],
    z.array(z.string()),
  )
  .describe('IDs of the numbered sources that directly support this item, e.g. ["S2","S5"]. Empty when no provided source supports it. Never invent IDs.');
