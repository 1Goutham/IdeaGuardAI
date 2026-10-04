/**
 * Local stand-in for Groq's OpenAI-compatible API, for reproducing
 * rate-limit and JSON-mode behaviour without a key or network access.
 *
 * Mirrors what Groq documents for openai/gpt-oss-120b on the base tier:
 *   - 8,000 tokens per minute (rolling), 30 requests per minute
 *   - 429 with `retry-after` and x-ratelimit-* headers when exceeded
 *   - `message.reasoning` alongside `content` in JSON mode
 * Content comes from the development fixtures, so it is sample data.
 *
 *   npx tsx scripts/groq-stub.ts            # port 8787
 *   STUB_TPM=8000 STUB_JSON_FAIL=competitors npx tsx scripts/groq-stub.ts
 *
 * Then run the app with GROQ_API_KEY=stub GROQ_API_BASE=http://localhost:8787/openai/v1
 */
import { createServer } from "node:http";
import { MOCK_OUTPUTS } from "../src/lib/ai/providers/mockFixtures.ts";

const PORT = Number(process.env.STUB_PORT ?? 8787);
const TPM = Number(process.env.STUB_TPM ?? 8000);
const RPM = Number(process.env.STUB_RPM ?? 30);
/** Agent tag whose first attempt returns Groq's json_validate_failed 400. */
const JSON_FAIL = process.env.STUB_JSON_FAIL ?? "";
const LATENCY = Number(process.env.STUB_LATENCY_MS ?? 1200);
/** Agent tags whose first call gets a 429 with retry-after: 1, to test waiting and retrying. */
const RATE_LIMIT_ONCE = (process.env.STUB_429_ONCE ?? "").split(",").filter(Boolean);
const limitedOnce = new Set<string>();
/** Agent tags that always get a 500, to test isolation. */
const ALWAYS_FAIL = (process.env.STUB_FAIL ?? "").split(",").filter(Boolean);

const ROLE_TO_TAG: [RegExp, string][] = [
  [/ROLE: Idea Analyst/, "understand"],
  [/ROLE: Research Agent/, "research"],
  [/ROLE: Competitor Agent/, "competitors"],
  [/ROLE: Feasibility Agent/, "feasibility"],
  [/ROLE: Risk & Governance Agent/, "risks"],
  [/ROLE: Critic/, "critic"],
  [/ROLE: Product Strategist/, "strategy"],
  [/ROLE: Senior Product Manager/, "prd"],
  [/ROLE: Staff Engineer/, "blueprint"],
];

const window: { at: number; tokens: number }[] = [];
const failedOnce = new Set<string>();
const tokens = (s: string) => Math.ceil(s.length / 4);

function used(now: number) {
  while (window.length && now - window[0].at > 60_000) window.shift();
  return { tokens: window.reduce((n, w) => n + w.tokens, 0), requests: window.length };
}

createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const url = req.url ?? "";

  // Tavily-shaped search: five results per query with realistic snippet length.
  if (url.endsWith("/search")) {
    const { query = "" } = JSON.parse(Buffer.concat(chunks).toString() || "{}") as { query?: string };
    const names = ["Northwind Careers", "Contoso Jobs", "Fabrikam Intern", "Tailspin Mentors", "Adventure Works"];
    const results = Array.from({ length: 5 }, (_, i) => ({
      title: `${names[(query.length + i) % names.length]}: sample page ${i + 1} for "${query.slice(0, 40)}"`,
      url: `https://example.com/${encodeURIComponent(query.slice(0, 20))}/${i}`,
      content: `Sample fixture for ${names[(query.length + i) % names.length]}. `.concat("Stub search result text standing in for a real page snippet. ".repeat(10)),
      published_date: "2026-06-01",
    }));
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ results }));
    return;
  }

  if (url.endsWith("/models")) {
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ data: [{ id: "openai/gpt-oss-120b" }] }));
    return;
  }
  if (!url.endsWith("/chat/completions")) return void res.writeHead(404).end();

  const body = JSON.parse(Buffer.concat(chunks).toString() || "{}") as {
    model: string;
    messages: { role: string; content: string }[];
    max_tokens?: number;
    max_completion_tokens?: number;
    response_format?: { type: string };
    reasoning_effort?: string;
  };
  const prompt = body.messages.map((m) => m.content).join("\n");
  const tag = ROLE_TO_TAG.find(([re]) => re.test(prompt))?.[1] ?? "unknown";
  const promptTokens = tokens(prompt);
  // STUB_DUMP=<dir> writes the last prompt each agent received, for inspecting context.
  if (process.env.STUB_DUMP) (await import("node:fs")).writeFileSync(`${process.env.STUB_DUMP}/${tag}.txt`, prompt);
  const now = Date.now();
  const u = used(now);
  const resetIn = window.length ? Math.max(0.5, (60_000 - (now - window[0].at)) / 1000) : 0;
  // STUB_NO_HEADERS=1 hides the limit headers, so clients can't pace themselves and must handle 429s.
  const headers: Record<string, string> = process.env.STUB_NO_HEADERS
    ? { "content-type": "application/json" }
    : {
        "content-type": "application/json",
        "x-ratelimit-limit-tokens": String(TPM),
        "x-ratelimit-remaining-tokens": String(Math.max(0, TPM - u.tokens)),
        "x-ratelimit-reset-tokens": `${resetIn.toFixed(2)}s`,
        "x-ratelimit-limit-requests": "1000",
      };

  const log = (status: number, note = "") =>
    console.log(`${new Date().toISOString().slice(11, 19)} ${status} ${tag.padEnd(11)} prompt≈${promptTokens} used=${u.tokens}/${TPM} effort=${body.reasoning_effort ?? "-"} max=${body.max_completion_tokens ?? body.max_tokens ?? "-"} ${note}`);

  if (promptTokens > TPM) {
    log(413);
    res.writeHead(413, headers).end(
      JSON.stringify({ error: { message: `Request too large for model \`${body.model}\` in organization \`org_stub\` service tier \`on_demand\` on tokens per minute (TPM): Limit ${TPM}, Requested ${promptTokens}, please reduce your message size and try again.`, type: "tokens", code: "rate_limit_exceeded" } }),
    );
    return;
  }
  if (u.tokens + promptTokens > TPM || u.requests >= RPM) {
    const wait = Math.max(1, Math.ceil(resetIn));
    log(429, `retry-after ${wait}s`);
    res.writeHead(429, { ...headers, "retry-after": String(wait) }).end(
      JSON.stringify({ error: { message: `Rate limit reached for model \`${body.model}\` in organization \`org_stub\` service tier \`on_demand\` on tokens per minute (TPM): Limit ${TPM}, Used ${u.tokens}, Requested ${promptTokens}. Please try again in ${resetIn.toFixed(2)}s.`, type: "tokens", code: "rate_limit_exceeded" } }),
    );
    return;
  }

  window.push({ at: now, tokens: promptTokens });
  await new Promise((r) => setTimeout(r, LATENCY + Math.random() * LATENCY));

  if (RATE_LIMIT_ONCE.includes(tag) && !limitedOnce.has(tag)) {
    limitedOnce.add(tag);
    log(429, "forced once, retry-after 1s");
    res.writeHead(429, { ...headers, "retry-after": "1" }).end(JSON.stringify({ error: { message: "Rate limit reached for model in organization `org_stub123`. Please try again in 1s.", type: "tokens", code: "rate_limit_exceeded" } }));
    return;
  }

  if (ALWAYS_FAIL.includes(tag)) {
    log(500, "simulated outage");
    res.writeHead(500, headers).end(JSON.stringify({ error: { message: "Internal server error", type: "internal_server_error" } }));
    return;
  }

  if (JSON_FAIL === tag && !failedOnce.has(tag)) {
    failedOnce.add(tag);
    log(400, "json_validate_failed");
    res.writeHead(400, headers).end(
      JSON.stringify({ error: { message: "Failed to generate JSON. Please adjust your prompt. See 'failed_generation' for more details.", type: "invalid_request_error", code: "json_validate_failed", failed_generation: '{"competitors": [{"name": "Northwind Careers", "description": ' } }),
    );
    return;
  }

  const content = JSON.stringify(MOCK_OUTPUTS[tag] ?? {});
  const reasoning = "Reasoning about the request. ".repeat(body.reasoning_effort === "high" ? 120 : body.reasoning_effort === "low" ? 10 : 40);
  const completion = tokens(content) + tokens(reasoning);
  window.push({ at: Date.now(), tokens: completion });
  log(200, `completion≈${completion}`);
  res.writeHead(200, headers).end(
    JSON.stringify({
      id: "chatcmpl-stub",
      model: body.model,
      choices: [{ index: 0, message: { role: "assistant", content, reasoning }, finish_reason: "stop" }],
      usage: { prompt_tokens: promptTokens, completion_tokens: completion, total_tokens: promptTokens + completion },
    }),
  );
}).listen(PORT, () => console.log(`Groq stub on :${PORT} · ${TPM} TPM · ${RPM} RPM`));
