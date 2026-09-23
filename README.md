# IdeaGuard

**Turn an idea into evidence.** IdeaGuard is an AI product intelligence workspace that researches, stress-tests and turns early-stage ideas into evidence-backed product strategy.

It doesn't just tell you whether an idea is good. It restates the idea precisely, researches the market with cited sources, maps the competition, assesses feasibility and risk, challenges the assumptions the idea depends on, and ends with a focused MVP, experiments to run first, a PRD and a technical blueprint.

```
Idea → Understand → Research → Competition → Feasibility → Risks → Stress test → Strategy → MVP → Experiments
```

No account needed. Open it and start. Projects are stored in your browser.

## Getting started

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY (free) and TAVILY_API_KEY (free)
npm run dev
```

To work on the interface without any keys, set `AI_PROVIDERS=mock` and `RESEARCH_PROVIDER=mock`. The mock engine returns fixed sample output about fictional companies with `example.com` sources, and the app labels it as a development engine everywhere it appears.

```bash
npm run test        # vitest: schemas, grounding, diff, pipeline, orchestrator
npm run typecheck
npm run lint
npm run build
```

## The workspace

| Section | What it answers |
| --- | --- |
| Overview | What is this idea, really? A recommendation (pursue / refine / rethink), seven opportunity signals with reasons, and how much of the report is sourced. |
| Research | What does the market say? Findings by topic, each marked **Sourced** (with references) or **Inference**. |
| Competition | Who else solves this? A comparison table, a qualitative positioning map, and where you can win. Competitors not found in any source are marked unverified. |
| Feasibility | Can it be built? Components, build/buy/integrate, data dependencies, the hard problems. |
| Risks | What could sink it? A severity × likelihood matrix, mitigations, and regulation to check. |
| Stress test | What has to be true? The biggest assumption, sceptical challenges, and an assumption map. |
| Experiments | How to find out cheaply. Status (unknown / testing / validated / invalidated) and results are saved as you go. |
| MVP | Build first, and just as important, don't build yet. |
| PRD · Architecture | Generated on demand from the analysis. Copy or download as Markdown. |
| Versions | Refine the idea into v2, v3… and compare what changed, word by word. |

## Architecture

```
src/
  app/
    page.tsx                    Landing and idea composer
    p/[id]/…                    Workspace: layout + one route per section
    api/analyse                 Runs the agent pipeline, streams progress (NDJSON)
    api/documents               PRD and technical blueprint
    api/engine                  Which model and research providers are configured
  components/
    ui/                         Primitives: Button, TextAction, Disclosure, LevelMeter, …
    report/                     Evidence marks, source refs, signals, matrices, maps
    workspace/                  Shell, section nav, progress, stage gates, refine dialog
    sections/                   One component per workspace section
    home/                       Composer, project list, pipeline strip
  lib/
    agents/                     Agent prompts, the orchestrator, the pipeline graph
    ai/                         Engine (fallback + structured output), providers, API client
    research/                   Search providers, source gathering, citation grounding
    schemas/                    Zod contracts for every agent
    scoring/                    Signal semantics and the evidence tally
    storage/  store/            Repository interface, local implementation, React store
    utils/                      Diff, Markdown export, formatting
  types/                        Domain types
```

### The agent pipeline

The AI is not one prompt. Seven agents run as a dependency graph, not a fixed sequence:

```
understand
    │
research ─ gather sources ───────────────┐
    │                                    │
research ─ synthesis                competitors
    │                                    │
    ├─────────────┐                      │
feasibility     risks                    │
    └─────────────┴──────────┬───────────┘
                           critic
                             │
                          strategy
```

- **Concurrency where the data allows it.** Competitor mapping starts as soon as sources are gathered, in parallel with research synthesis. Feasibility and risk run in parallel. Each stage starts the moment its inputs exist.
- **Real progress.** `/api/analyse` streams an event for every stage start, search note, completion and failure. The progress UI only changes when the server says something happened.
- **Partial failure is normal.** If one agent fails, only the stages that depend on it are blocked. Completed results are kept, and retrying a step re-runs just that step, its failed prerequisites, and what depends on it.

### Structured output

Every agent has a Zod schema in `lib/schemas/agents.ts`. The same schema is:

1. rendered into the prompt as JSON Schema,
2. used to validate the answer, leniently where drift is harmless (`"High"` → `"high"`, one malformed list item dropped rather than failing the section) and strictly where it isn't (an unknown signal key is dropped, never relabelled),
3. inferred into the TypeScript types the UI renders.

If validation fails, the engine sends the specific validation errors back once for repair before giving up.

### Evidence discipline

The product's central promise is that AI claims are distinguishable from evidence. That is enforced in code, not left to the prompt:

- Sources come only from the search provider, never from a model. They are deduplicated and numbered (`S1…Sn`).
- Agents may only cite those numbers. `lib/research/grounding.ts` removes any citation to a source that wasn't retrieved, and anything left without a real source is marked **Inference**.
- A competitor is **Verified** only if a retrieved source actually names it.
- With no search provider configured, research runs offline and the UI says so: no finding is presented as sourced.
- Signals are levels (low / medium / high) with direction and reasons. They are never combined into a score.

**Known limitation:** grounding checks that a cited source exists and, for competitors, that it names the product. It does not yet check that a source *entails* the specific claim. An entailment check (a small verifier call per finding) is the natural next step.

### Model providers

`lib/ai/providers` holds a fallback chain: Anthropic Claude (official SDK, streaming, server-side refusal fallback), Google Gemini (model resolved from the API so retired IDs don't break it), and any OpenAI-compatible endpoint (Groq, OpenRouter, a local Ollama). The first configured provider handles a request; rate limits, timeouts and outages fall through to the next.

### Persistence and future accounts

The UI only talks to `ProjectRepository`. Today that is `LocalRepository` (browser storage, one key per project, synced across tabs). Accounts can be added by implementing the same interface against a database and swapping it in `lib/storage`; `Project.ownerId` is already in place. There is no login, billing or team model by design.

## Design

IdeaGuard shares a design language with [Ideako](https://ideako.vercel.app) and Goutham's portfolio: warm paper and ink, Outfit at a light weight for display type, Anonymous Pro for small mono labels, hairlines instead of boxes, bracketed text actions, and one lime accent reserved for state: what's running, what's current, what's selected.

Evidence has its own visual grammar: a solid rule means sourced, a dashed rule means inference. Light and dark themes are both supported, motion respects `prefers-reduced-motion`, and every control is keyboard-reachable.
