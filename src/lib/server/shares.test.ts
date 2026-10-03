import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { shareHash, toSharedReport } from "@/lib/share";
import type { IdeaVersion, Project } from "@/types";

const dir = mkdtempSync(path.join(tmpdir(), "ideaguard-kv-"));
const cwd = process.cwd();
beforeAll(() => process.chdir(dir));
afterAll(() => {
  process.chdir(cwd);
  rmSync(dir, { recursive: true, force: true });
});

const version = {
  id: "v1",
  number: 1,
  idea: "An idea",
  note: "",
  createdAt: "2026-01-01T00:00:00Z",
  analysis: {},
  stages: {},
  experiments: { E1: { status: "validated", result: "private notes", updatedAt: "" } },
  run: { id: "r", cursor: 3, startedAt: "" },
  share: { id: "s", token: "secret", url: "/r/s", sharedAt: "", publishedHash: "" },
} as unknown as IdeaVersion;
const project = { id: "p", title: "Title", versions: [version] } as unknown as Project;

describe("shared reports", () => {
  it("publishes statuses but not private notes, run state or the token", () => {
    const r = toSharedReport(project, version);
    const json = JSON.stringify(r);
    expect(r.version.experiments).toEqual({ E1: { status: "validated" } });
    expect(json).not.toContain("private notes");
    expect(json).not.toContain("secret");
    expect(json).not.toContain("cursor");
  });

  it("fingerprints what would be published", () => {
    const a = shareHash(version);
    expect(shareHash({ ...version, note: "changed" })).toBe(a);
    expect(shareHash({ ...version, experiments: { E1: { status: "invalidated", result: "", updatedAt: "" } } })).not.toBe(a);
  });

  it("creates, reads, updates and revokes with the token", async () => {
    const { createShare, getShare, updateShare, deleteShare } = await import("./shares");
    const report = toSharedReport(project, version);
    const { id, token } = await createShare(report);
    expect((await getShare(id))?.title).toBe("Title");
    expect(await updateShare(id, "wrong", { ...report, title: "Hacked" })).toBe("forbidden");
    expect(await updateShare(id, token, { ...report, title: "Renamed" })).toBe("ok");
    expect((await getShare(id))?.title).toBe("Renamed");
    expect(await deleteShare(id, "wrong")).toBe("forbidden");
    expect(await deleteShare(id, token)).toBe("ok");
    expect(await getShare(id)).toBeNull();
  });
});
