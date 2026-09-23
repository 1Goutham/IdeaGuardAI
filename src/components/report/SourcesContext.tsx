"use client";

import { createContext, useContext } from "react";
import type { Source } from "@/types";

const Ctx = createContext<Source[]>([]);

export function SourcesProvider({ sources, children }: { sources: Source[]; children: React.ReactNode }) {
  return <Ctx.Provider value={sources}>{children}</Ctx.Provider>;
}

export const useSources = () => useContext(Ctx);
