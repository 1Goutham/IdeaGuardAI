import { NextResponse } from "next/server";
import { engineStatus } from "@/lib/ai/engine";
import { researchProviderLabel } from "@/lib/research/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Which model and research providers are configured. Never includes keys. */
export async function GET() {
  const { providers, active } = await engineStatus();
  const primary = providers.find((p) => p.id === active[0]);
  return NextResponse.json({
    model: primary ? { label: primary.label, model: primary.model } : null,
    fallbacks: active.slice(1),
    research: researchProviderLabel(),
    development: active.includes("mock"),
  });
}
