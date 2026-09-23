"use client";

import { useEffect, useState } from "react";
import { fetchEngine, type EngineInfo } from "@/lib/ai/client";

let cached: Promise<EngineInfo | null> | null = null;

/** Configured model and research providers, fetched once per page load. */
export function useEngine(): { info: EngineInfo | null; loading: boolean } {
  const [info, setInfo] = useState<EngineInfo | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    cached ??= fetchEngine();
    cached.then((i) => {
      if (!alive) return;
      setInfo(i);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);
  return { info, loading };
}
