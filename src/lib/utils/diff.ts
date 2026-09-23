/**
 * Word-level diff (longest common subsequence). Used to show how an idea
 * changed between versions. Inputs are short (a few hundred words), so the
 * O(n·m) table is fine.
 */

export type DiffPart = { type: "same" | "added" | "removed"; text: string };

const tokenize = (s: string) => s.trim().split(/(\s+)/).filter((t) => t.length > 0);

export function diffWords(before: string, after: string): DiffPart[] {
  const a = tokenize(before);
  const b = tokenize(after);
  const n = a.length;
  const m = b.length;
  const table: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const out: DiffPart[] = [];
  const push = (type: DiffPart["type"], text: string) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text;
    else out.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push("same", a[i]);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      push("removed", a[i++]);
    } else {
      push("added", b[j++]);
    }
  }
  while (i < n) push("removed", a[i++]);
  while (j < m) push("added", b[j++]);
  return out;
}

/** Share of words that changed, 0–1. */
export function changeRatio(parts: DiffPart[]): number {
  const count = (t: DiffPart["type"]) => parts.filter((p) => p.type === t).reduce((n, p) => n + p.text.trim().split(/\s+/).filter(Boolean).length, 0);
  const same = count("same");
  const changed = count("added") + count("removed");
  return same + changed === 0 ? 0 : changed / (same + changed);
}
