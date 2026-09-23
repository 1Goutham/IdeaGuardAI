import type { Project } from "@/types";
import type { ProjectRepository } from "./repository";

const NS = "ideaguard:v1";
const INDEX = `${NS}:projects`;
const key = (id: string) => `${NS}:project:${id}`;

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function read<T>(k: string, fallback: T): T {
  const s = storage();
  if (!s) return fallback;
  try {
    const raw = s.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(k: string, value: unknown): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(k, JSON.stringify(value));
  } catch (err) {
    console.warn("IdeaGuard: could not save to browser storage", err);
    throw new Error("Browser storage is full. Delete an old project to free space.");
  }
}

/** Browser-local persistence: one key per project plus an index of IDs. */
export class LocalRepository implements ProjectRepository {
  async list(): Promise<Project[]> {
    const ids = read<string[]>(INDEX, []);
    return ids
      .map((id) => read<Project | null>(key(id), null))
      .filter((p): p is Project => !!p && Array.isArray(p.versions))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  async save(project: Project): Promise<void> {
    write(key(project.id), project);
    const ids = read<string[]>(INDEX, []);
    if (!ids.includes(project.id)) write(INDEX, [project.id, ...ids]);
  }

  async remove(id: string): Promise<void> {
    storage()?.removeItem(key(id));
    write(
      INDEX,
      read<string[]>(INDEX, []).filter((x) => x !== id),
    );
  }

  subscribe(onChange: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    const handler = (e: StorageEvent) => {
      if (e.key?.startsWith(NS)) onChange();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }
}

export const repository: ProjectRepository = new LocalRepository();
