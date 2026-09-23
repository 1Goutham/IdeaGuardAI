import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { StageEvent } from "./orchestrator";
import type { StageId } from "@/types";

/**
 * End-to-end through the real OpenAI-compatible provider code against the
 * local Groq stub: forced 429 (with retry-after), Groq's json_validate_failed,
 * and a permanently failing agent, in one run.
 */

const PORT = 8799;
let stub: ChildProcess;

beforeAll(async () => {
  stub = spawn(process.execPath, ["--import", "tsx", path.resolve(import.meta.dirname, "../../../scripts/groq-stub.mts")], {
    env: { ...process.env, STUB_PORT: String(PORT), STUB_TPM: "200000", STUB_LATENCY_MS: "30", STUB_429_ONCE: "feasibility", STUB_JSON_FAIL: "competitors", STUB_FAIL: "risks" },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`http://localhost:${PORT}/openai/v1/models`);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  Object.assign(process.env, {
    AI_PROVIDERS: "groq",
    GROQ_API_KEY: "stub",
    GROQ_API_BASE: `http://localhost:${PORT}/openai/v1`,
    GROQ_MODEL: "openai/gpt-oss-120b",
    RESEARCH_PROVIDER: "tavily",
    TAVILY_API_KEY: "stub",
    TAVILY_API_BASE: `http://localhost:${PORT}`,
  });
});

afterAll(() => {
  stub?.kill();
});

it("recovers from a 429, repairs invalid JSON and isolates a failing agent", async () => {
  const { runAnalysis } = await import("./orchestrator");
  const events: StageEvent[] = [];
  await runAnalysis(
    { idea: "An AI meal planner for people with several dietary constraints.", stages: ["understand", "research", "competitors", "feasibility", "risks", "critic", "strategy"], prior: {} },
    (e) => events.push(e),
  );
  const done = (s: StageId) => events.find((e): e is Extract<StageEvent, { status: "done" }> => e.type === "stage" && e.stage === s && e.status === "done");
  const failed = (s: StageId) => events.find((e): e is Extract<StageEvent, { status: "error" }> => e.type === "stage" && e.stage === s && e.status === "error");

  expect(done("feasibility")!.trace.calls).toBe(2);
  expect(done("feasibility")!.trace.waitedMs).toBeGreaterThanOrEqual(900);
  expect(done("competitors")!.trace.repaired).toBe(true);
  expect(done("research")!.note).toBe("24 sources");

  const risk = failed("risks")!;
  expect(risk.error.detail?.status).toBe(500);
  expect(JSON.stringify(risk.error)).not.toMatch(/stub123|gsk_/);

  expect(done("critic")!.missingInputs).toEqual(["risks"]);
  expect(done("strategy")!.missingInputs).toEqual(["risks"]);
}, 60_000);
