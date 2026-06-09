# CodeLens AI

Analyze any public GitHub repo through three lenses:

- **Map** — interactive architecture / dependency graph
- **Guard** — AI security & threat-model report (STRIDE)
- **Morph** — AI-detected code smells with side-by-side refactor diffs

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
     (GitHub → Settings → Developer settings → Personal access tokens)

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
