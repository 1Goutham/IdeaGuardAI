"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { emptyStages, pendingStages, retryPlan } from "@/lib/agents/pipeline";
import { generateDocument, streamAnalysis } from "@/lib/ai/client";
import type { StageEvent } from "@/lib/agents/orchestrator";
import { repository } from "@/lib/storage/localRepository";
import { nowIso, provisionalTitle, uid } from "@/lib/utils";
import {
  STAGE_IDS,
  type Analysis,
  type DocKind,
  type ExperimentState,
  type IdeaVersion,
  type Project,
  type StageId,
} from "@/types";

/**
 * Single source of truth for projects in this browser.
 *
 * Components read state from here and change it through actions; every
 * change is written through the repository. The analysis runner lives here
 * too, above the routes, so a run keeps going while the founder moves
 * between sections of the workspace.
 */

interface State {
  ready: boolean;
  projects: Project[];
  /** Version IDs with an analysis stream open in this tab. */
  running: Set<string>;
  /** `${versionId}:${kind}` for documents being generated. */
  generating: Set<string>;
}

export interface ProjectActions {
  createProject(idea: string): Project;
  addVersion(projectId: string, idea: string, note: string): IdeaVersion | null;
  setCurrentVersion(projectId: string, versionId: string): void;
  removeProject(projectId: string): void;
  /** Runs the given stages (default: whatever hasn't completed). */
  analyse(projectId: string, versionId: string, stages?: StageId[]): void;
  retryStage(projectId: string, versionId: string, stage: StageId): void;
  stop(versionId: string): void;
  setExperiment(projectId: string, versionId: string, experimentId: string, patch: Partial<ExperimentState>): void;
  generateDoc(projectId: string, versionId: string, kind: DocKind): Promise<void>;
}

const StateCtx = createContext<State | null>(null);
const ActionsCtx = createContext<ProjectActions | null>(null);

function newVersion(idea: string, number: number, note = ""): IdeaVersion {
  return { id: uid("ver"), number, idea: idea.trim(), note: note.trim(), createdAt: nowIso(), analysis: {}, stages: emptyStages(), experiments: {} };
}

/** A run that was open when the page closed can't resume; mark it honestly. */
function settleInterrupted(p: Project): Project {
  let changed = false;
  const versions = p.versions.map((v) => {
    const stages = { ...v.stages };
    for (const id of STAGE_IDS) {
      const s = stages[id];
      if (s?.status === "running" || s?.status === "queued") {
        stages[id] = { status: "error", error: "Interrupted: the page was closed before this step finished." };
        changed = true;
      }
    }
    return changed ? { ...v, stages } : v;
  });
  return changed ? { ...p, versions } : p;
}

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ ready: false, projects: [], running: new Set(), generating: new Set() });
  // Mirror of state for actions that must read the latest value synchronously.
  // Only ever written together with setState, never during render.
  const stateRef = useRef(state);
  const controllers = useRef(new Map<string, AbortController>());

  const applyLoaded = useCallback((loaded: Project[]) => {
    const s = stateRef.current;
    const projects = loaded
      .map(settleInterrupted)
      // Keep in-memory copies of projects with a live run in this tab.
      .map((p) => (p.versions.some((v) => s.running.has(v.id)) ? (s.projects.find((x) => x.id === p.id) ?? p) : p));
    stateRef.current = { ...s, ready: true, projects };
    setState(stateRef.current);
  }, []);

  useEffect(() => {
    repository.list().then(applyLoaded);
    return repository.subscribe(() => {
      repository.list().then(applyLoaded);
    });
  }, [applyLoaded]);

  /** Apply a change to one project, persist it, and return the new project. */
  const mutate = useCallback((projectId: string, fn: (p: Project) => Project): Project | null => {
    const current = stateRef.current.projects.find((p) => p.id === projectId);
    if (!current) return null;
    const next = { ...fn(current), updatedAt: nowIso() };
    stateRef.current = { ...stateRef.current, projects: stateRef.current.projects.map((p) => (p.id === projectId ? next : p)) };
    setState(stateRef.current);
    repository.save(next).catch((e: Error) => toast.error(e.message));
    return next;
  }, []);

  const mutateVersion = useCallback(
    (projectId: string, versionId: string, fn: (v: IdeaVersion) => IdeaVersion) =>
      mutate(projectId, (p) => ({ ...p, versions: p.versions.map((v) => (v.id === versionId ? fn(v) : v)) })),
    [mutate],
  );

  const setFlag = (key: "running" | "generating", id: string, on: boolean) => {
    const next = new Set(stateRef.current[key]);
    if (on) next.add(id);
    else next.delete(id);
    stateRef.current = { ...stateRef.current, [key]: next };
    setState(stateRef.current);
  };

  const actions = useMemo<ProjectActions>(() => {
    const applyEvent = (projectId: string, versionId: string, e: StageEvent) => {
      if (e.type === "done") return;
      if (e.type === "sources") {
        mutateVersion(projectId, versionId, (v) => ({ ...v, analysis: { ...v.analysis, sources: e.sources } }));
        return;
      }
      mutateVersion(projectId, versionId, (v) => {
        const prev = v.stages[e.stage];
        if (e.type === "note") return { ...v, stages: { ...v.stages, [e.stage]: { ...prev, note: e.note } } };
        if (e.status === "running") return { ...v, stages: { ...v.stages, [e.stage]: { status: "running", startedAt: nowIso() } } };
        if (e.status === "error") {
          return {
            ...v,
            stages: {
              ...v.stages,
              [e.stage]: { status: "error", startedAt: prev.startedAt, finishedAt: nowIso(), error: e.error.message, errorCode: e.error.code, errorDetail: e.error.detail },
            },
          };
        }
        const analysis: Analysis = { ...v.analysis, [e.stage]: e.data };
        return {
          ...v,
          analysis,
          stages: {
            ...v.stages,
            [e.stage]: { status: "done", startedAt: prev.startedAt, finishedAt: nowIso(), engine: e.engine, note: e.note, trace: e.trace, missingInputs: e.missingInputs },
          },
        };
      });
      // The analyst names the project once it understands the idea.
      if (e.type === "stage" && e.status === "done" && e.stage === "understand") {
        mutate(projectId, (p) => (p.versions[0]?.id === versionId ? { ...p, title: (e.data as Analysis["understand"])!.title } : p));
      }
    };

    const analyse: ProjectActions["analyse"] = (projectId, versionId, stages) => {
      if (controllers.current.has(versionId)) return;
      const project = stateRef.current.projects.find((p) => p.id === projectId);
      const version = project?.versions.find((v) => v.id === versionId);
      if (!version) return;
      const toRun = stages ?? pendingStages(version.stages, version.analysis);
      if (!toRun.length) return;

      // Clear stale results for the stages being re-run, then queue them.
      const prior: Analysis = { ...version.analysis };
      for (const id of toRun) delete prior[id];
      // Re-running research means searching again.
      if (toRun.includes("research")) delete prior.sources;
      mutateVersion(projectId, versionId, (v) => ({
        ...v,
        analysis: prior,
        stages: { ...v.stages, ...Object.fromEntries(toRun.map((id) => [id, { status: "queued" }])) },
      }));

      const controller = new AbortController();
      controllers.current.set(versionId, controller);
      setFlag("running", versionId, true);

      void streamAnalysis({ idea: version.idea, stages: toRun, prior: prior as Record<string, unknown> }, (e) => applyEvent(projectId, versionId, e), controller.signal).then(
        ({ error }) => {
          controllers.current.delete(versionId);
          setFlag("running", versionId, false);
          // Anything still queued or running didn't get an answer.
          mutateVersion(projectId, versionId, (v) => {
            const stagesNow = { ...v.stages };
            for (const id of STAGE_IDS) {
              if (stagesNow[id].status === "queued" || stagesNow[id].status === "running") {
                stagesNow[id] = {
                  status: "error",
                  errorCode: controller.signal.aborted ? "network" : error?.code,
                  error: controller.signal.aborted ? "Stopped before this step finished." : (error?.message ?? "This step didn't complete."),
                };
              }
            }
            return { ...v, stages: stagesNow };
          });
          if (error && error.message !== "Stopped.") toast.error(error.message);
        },
      );
    };

    return {
      createProject(idea) {
        const version = newVersion(idea, 1);
        const project: Project = {
          id: uid("prj"),
          ownerId: "local",
          title: provisionalTitle(idea),
          createdAt: nowIso(),
          updatedAt: nowIso(),
          currentVersionId: version.id,
          versions: [version],
        };
        stateRef.current = { ...stateRef.current, projects: [project, ...stateRef.current.projects] };
        setState(stateRef.current);
        repository.save(project).catch((e: Error) => toast.error(e.message));
        return project;
      },

      addVersion(projectId, idea, note) {
        const project = stateRef.current.projects.find((p) => p.id === projectId);
        if (!project) return null;
        const version = newVersion(idea, Math.max(...project.versions.map((v) => v.number)) + 1, note);
        mutate(projectId, (p) => ({ ...p, versions: [...p.versions, version], currentVersionId: version.id }));
        return version;
      },

      setCurrentVersion(projectId, versionId) {
        mutate(projectId, (p) => ({ ...p, currentVersionId: versionId }));
      },

      removeProject(projectId) {
        const project = stateRef.current.projects.find((p) => p.id === projectId);
        project?.versions.forEach((v) => controllers.current.get(v.id)?.abort());
        stateRef.current = { ...stateRef.current, projects: stateRef.current.projects.filter((p) => p.id !== projectId) };
        setState(stateRef.current);
        void repository.remove(projectId);
      },

      analyse,

      retryStage(projectId, versionId, stage) {
        const version = stateRef.current.projects.find((p) => p.id === projectId)?.versions.find((v) => v.id === versionId);
        if (version) analyse(projectId, versionId, retryPlan(stage, version.stages, version.analysis));
      },

      stop(versionId) {
        controllers.current.get(versionId)?.abort();
      },

      setExperiment(projectId, versionId, experimentId, patch) {
        mutateVersion(projectId, versionId, (v) => {
          const prev = v.experiments[experimentId] ?? { status: "unknown", result: "", updatedAt: nowIso() };
          return { ...v, experiments: { ...v.experiments, [experimentId]: { ...prev, ...patch, updatedAt: nowIso() } } };
        });
      },

      async generateDoc(projectId, versionId, kind) {
        const flag = `${versionId}:${kind}`;
        if (stateRef.current.generating.has(flag)) return;
        const version = stateRef.current.projects.find((p) => p.id === projectId)?.versions.find((v) => v.id === versionId);
        if (!version) return;
        setFlag("generating", flag, true);
        const res = await generateDocument<never>({ kind, idea: version.idea, analysis: version.analysis as Record<string, unknown> });
        setFlag("generating", flag, false);
        if (!res.ok) {
          toast.error(res.error.message);
          return;
        }
        mutateVersion(projectId, versionId, (v) => ({ ...v, [kind]: { data: res.data.data, generatedAt: nowIso(), engine: res.data.engine } }));
        toast.success(kind === "prd" ? "PRD ready." : "Technical blueprint ready.");
      },
    };
  }, [mutate, mutateVersion]);

  return (
    <StateCtx.Provider value={state}>
      <ActionsCtx.Provider value={actions}>{children}</ActionsCtx.Provider>
    </StateCtx.Provider>
  );
}

export function useProjects(): State {
  const ctx = useContext(StateCtx);
  if (!ctx) throw new Error("useProjects must be used inside ProjectsProvider");
  return ctx;
}

export function useProjectActions(): ProjectActions {
  const ctx = useContext(ActionsCtx);
  if (!ctx) throw new Error("useProjectActions must be used inside ProjectsProvider");
  return ctx;
}

/** A project and its current version, plus run state. */
export function useProject(projectId: string) {
  const { ready, projects, running, generating } = useProjects();
  const project = projects.find((p) => p.id === projectId) ?? null;
  const version = project?.versions.find((v) => v.id === project.currentVersionId) ?? project?.versions.at(-1) ?? null;
  return {
    ready,
    project,
    version,
    isRunning: !!version && running.has(version.id),
    isGenerating: (kind: DocKind) => !!version && generating.has(`${version.id}:${kind}`),
  };
}
