import type { Project } from "@/types";

/**
 * Persistence boundary. The UI only talks to this interface. Today it is
 * implemented on browser storage; a RemoteRepository on top of a database
 * and an auth session can replace it without touching components
 * (Project.ownerId is already in place for that).
 */
export interface ProjectRepository {
  list(): Promise<Project[]>;
  save(project: Project): Promise<void>;
  remove(id: string): Promise<void>;
  /** Called when another tab changes data. Returns an unsubscribe function. */
  subscribe(onChange: () => void): () => void;
}
