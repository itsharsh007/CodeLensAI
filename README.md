# CodeLens AI

Analyze any public GitHub repo through three lenses:

- **Map** — interactive architecture / dependency graph
- **Guard** — AI security & threat-model report (STRIDE)
- **Morph** — AI-detected code smells with side-by-side refactor diffs

## Screenshots

| Landing | Map lens |
|---|---|
| ![Landing](docs/screenshots/landing.png) | ![Map](docs/screenshots/map.png) |

![Node drawer](docs/screenshots/map-drawer.png)

*(Guard and Morph render AI results once `ANTHROPIC_API_KEY` is configured; without it the
graph still works and those tabs show a clear "analysis unavailable" state.)*

## Stack

| Part   | Tech |
|--------|------|
| Client | React 19, Vite, TypeScript, Tailwind CSS v4, Framer Motion, React Flow |
| Server | Node.js, Express 5, TypeScript, Anthropic SDK, Octokit |

## Setup

1. **Install dependencies**

   ```sh
   npm install            # root (concurrently)
   npm install --prefix client
   npm install --prefix server
   ```

2. **Configure environment**

   ```sh
   cp server/.env.example server/.env
   ```

   Fill in:
   - `ANTHROPIC_API_KEY` — from https://platform.claude.com/
   - `GITHUB_TOKEN` — a read-only personal access token for public repos
     (GitHub → Settings → Developer settings → Personal access tokens).
     Optional but recommended: without it you get GitHub's 60 req/hr anonymous limit.
   - `ANTHROPIC_MODEL` — optional model override (default `claude-sonnet-4-6`).

3. **Run both apps**

   ```sh
   npm run dev
   ```

   - Client: http://localhost:5173
   - Server: http://localhost:3001 (health check: `GET /api/health` → `{ "ok": true }`)

   Or run them separately with `npm run dev:client` / `npm run dev:server`.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Run client + server together |
| `npm run dev:client` | Vite dev server on :5173 |
| `npm run dev:server` | Express (tsx watch) on :3001 |
| `npm run typecheck` | Typecheck both packages |

## Architecture notes

```
client (React/Vite :5173)                server (Express :3001)
┌────────────────────────┐   POST /api/analyze   ┌─────────────────────────────┐
│ App — state machine    │ ───────────────────▶  │ github.ts  Octokit: tree +  │
│  idle/loading/done/err │                       │            blobs (≤50 src)  │
│ Results — 3 tabs       │                       │ graph.ts   import parsing → │
│  MapView (React Flow)  │                       │            { nodes, edges } │
│  GuardView (gauge,     │                       │ analysis.ts 3 structured    │
│   STRIDE, findings)    │  ◀───────────────────  │  LLM calls (allSettled)    │
│  MorphView (diffs)     │   AnalysisResult JSON │ llm.ts     callLLM() —      │
│ /r/:id read-only route │                       │  single provider seam       │
└────────────────────────┘   GET /api/report/:id │ cache.ts   10-min TTL Map   │
                                                 └─────────────────────────────┘
```

- **Repo fetch** (`server/src/github.ts`) — parses `owner/repo` from the URL, pulls the
  git tree of the default branch, filters to `.js .jsx .ts .tsx .py` (max 50 files,
  skipping `node_modules/dist/build`, `.d.ts`, minified and >200 KB files, preferring
  shallow paths), and base64-decodes the blobs. GitHub errors map to clean HTTP statuses
  (400 invalid URL, 404 private/missing, 429 rate-limited).
- **Dependency graph** (`server/src/graph.ts`) — regex-extracts `import` / `require` /
  `from` specifiers (JS/TS and Python), resolves *local* imports against the fetched
  file set (extension + `index.*` + `__init__.py` candidates), and infers a node type
  (`component | route | util | config | other`) from the path.
- **AI lenses** (`server/src/analysis.ts`, `llm.ts`) — three independent structured
  calls (architecture, STRIDE threat model, refactors) sharing one truncated code
  context (≤5 KB/file, ≤150 KB total). Every call goes through a single `callLLM()`,
  so swapping Claude for another provider is a one-function change. Responses must be
  strict JSON; parsing strips markdown fences and retries once on failure. The calls
  run with `Promise.allSettled` — if one lens fails, the graph and other lenses still
  return, with the error reported per-lens in `aiErrors`.
- **Caching & sharing** (`server/src/cache.ts`) — results live in an in-memory map for
  10 minutes, keyed both by repo URL (so re-analyzing is instant) and by a short hex id
  served from `GET /api/report/:id`. The client's Share button copies `/r/:id`, which
  loads the saved report read-only. Share links expire with the cache.
- **Client** — no router dependency: `/r/:id` is parsed from `location.pathname`
  (Vite's SPA fallback serves `index.html` for it). The dependency graph is laid out
  with a longest-path layering (left → right), and the Morph diff is a hand-rolled LCS
  line alignment rendered as paired red/green rows.

## Limitations

- Analysis covers at most 50 source files per repo (shallowest paths first).
- Share links live 10 minutes (in-memory cache; restart clears reports).
- Only public repos are supported.
