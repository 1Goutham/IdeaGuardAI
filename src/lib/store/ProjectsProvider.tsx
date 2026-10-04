"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { emptyStages, pendingStages, retryPlan } from "@/lib/agents/pipeline";
import { cancelRun, engineInfo, followRun, generateDocument, runStatus, startRun, streamAnalysis } from "@/lib/ai/client";
import type { StageEvent } from "@/lib/agents/events";
import { repository } from "@/lib/storage/localRepository";
import { nowIso, provisionalTitle, uid } from "@/lib/utils";
import type { AiError } from "@/lib/ai/contracts";
import {
  STAGE_IDS,
  type Analysis,
  type DocKind,
  type ExperimentState,
  type IdeaVersion,
  type Project,
  type ShareRecord,
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
  /** Reconnect to a durable run in progress. */
  resume(projectId: string, versionId: string): void;
  /** Record (or clear) the shared link for a version. */
  setShare(projectId: string, versionId: string, share: ShareRecord | null): void;
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
    // A durable run keeps going on the server; it is reconnected, not interrupted.
    if (v.run) return v;
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
    const applyEvent = (projectId: string, versionId: string, e: StageEvent, cursor?: number) => {
      // For durable runs, remember how far we've read so a reload resumes from here.
      const withCursor = (v: IdeaVersion): IdeaVersion => (cursor !== undefined && v.run ? { ...v, run: { ...v.run, cursor } } : v);
      if (e.type === "done") {
        if (cursor !== undefined) mutateVersion(projectId, versionId, withCursor);
        return;
      }
      if (e.type === "sources") {
        mutateVersion(projectId, versionId, (v) => withCursor({ ...v, analysis: { ...v.analysis, sources: e.sources } }));
        return;
      }
      mutateVersion(projectId, versionId, (vIn) => {
        const v = withCursor(vIn);
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
      const body = { idea: version.idea, stages: toRun, prior: prior as Record<string, unknown> };

      void engineInfo().then(async (engine) => {
        if (engine?.runner !== "inline") {
          const started = await startRun(body);
          if (started.ok) {
            mutateVersion(projectId, versionId, (v) => ({ ...v, run: { id: started.data.runId, cursor: 0, startedAt: nowIso() } }));
            return follow(projectId, versionId, controller);
          }
          // The durable runner isn't available here; fall back to one streaming request.
          console.warn("IdeaGuard: durable run could not start, using inline runner:", started.error.message);
        }
        const { error } = await streamAnalysis(body, (e) => applyEvent(projectId, versionId, e), controller.signal);
        finish(projectId, versionId, controller, error);
      });
    };

    /** Mark anything still pending as not completed, and release the run. */
    const finish = (projectId: string, versionId: string, controller: AbortController, error: AiError | null) => {
      controllers.current.delete(versionId);
      setFlag("running", versionId, false);
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
        const next: IdeaVersion = { ...v, stages: stagesNow };
        delete next.run;
        return next;
      });
      if (error && error.message !== "Stopped.") toast.error(error.message);
    };

    /**
     * Follow a durable run's event stream, reconnecting from the last event
     * read until the run finishes. The run itself doesn't depend on this tab.
     */
    const follow = async (projectId: string, versionId: string, controller: AbortController) => {
      let failures = 0;
      for (;;) {
        const version = stateRef.current.projects.find((p) => p.id === projectId)?.versions.find((v) => v.id === versionId);
        const run = version?.run;
        if (!run) return finish(projectId, versionId, controller, null);
        const res = await followRun(run.id, run.cursor, (e, i) => applyEvent(projectId, versionId, e, i + 1), controller.signal);
        if (res.done) return finish(projectId, versionId, controller, null);
        if (controller.signal.aborted) return finish(projectId, versionId, controller, null);
        if (res.notFound) return finish(projectId, versionId, controller, { code: "network", message: "This run is no longer available on the server.", retryable: true });
        const status = await runStatus(run.id);
        if (status && !["pending", "running"].includes(status)) {
          // Finished without a final event (e.g. cancelled): read once more for stragglers, then settle.
          const tail = await followRun(run.id, stateRef.current.projects.find((p) => p.id === projectId)?.versions.find((v) => v.id === versionId)?.run?.cursor ?? run.cursor, (e, i) => applyEvent(projectId, versionId, e, i + 1), controller.signal);
          return finish(projectId, versionId, controller, tail.done ? null : { code: "upstream", message: `The run ended (${status}) before every step finished.`, retryable: true });
        }
        failures = res.error ? failures + 1 : 0;
        if (failures > 8) return finish(projectId, versionId, controller, res.error);
        await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** Math.max(0, failures - 1), 8000)));
      }
    };

    /** Reconnect to a durable run that was in progress when the page was last open. */
    const resume = (projectId: string, versionId: string) => {
      if (controllers.current.has(versionId)) return;
      const controller = new AbortController();
      controllers.current.set(versionId, controller);
      setFlag("running", versionId, true);
      void follow(projectId, versionId, controller);
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
        const run = stateRef.current.projects.flatMap((p) => p.versions).find((v) => v.id === versionId)?.run;
        if (run) void cancelRun(run.id);
        controllers.current.get(versionId)?.abort();
      },

      resume,

      setShare(projectId, versionId, share) {
        mutateVersion(projectId, versionId, (v) => {
          const next: IdeaVersion = { ...v, share: share ?? undefined };
          if (!share) delete next.share;
          return next;
        });
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

  // Reconnect to durable runs that were in progress when the page was last open.
  useEffect(() => {
    if (!state.ready) return;
    for (const p of state.projects) for (const v of p.versions) if (v.run && !controllers.current.has(v.id)) actions.resume(p.id, v.id);
  }, [state.ready, state.projects, actions]);

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
