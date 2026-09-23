"use client";

import { createContext, useContext } from "react";
import type { IdeaVersion, Project } from "@/types";

export interface WorkspaceValue {
  project: Project;
  version: IdeaVersion;
  isRunning: boolean;
  isGenerating: (kind: "prd" | "blueprint") => boolean;
  openRefine: (prefill?: string) => void;
  href: (slug: string) => string;
}

const Ctx = createContext<WorkspaceValue | null>(null);
export const WorkspaceProvider = Ctx.Provider;

export function useWorkspace(): WorkspaceValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspace must be used inside the workspace layout");
  return v;
}
