# CodeLens AI

A TypeScript full-stack app that analyzes any public GitHub repo through three lenses: **Map** (architecture dependency graph), **Guard** (security/threat model), **Morph** (AI refactor with diffs).

## Stack & layout

- `/client` — React 19 + Vite 6 + TypeScript + Tailwind CSS v4 (`@tailwindcss/vite`, no config file) + Framer Motion + React Flow (`reactflow` v11). No router: `/r/:id` is parsed from `location.pathname`.
- `/server` — Express 5 + TypeScript (ESM, `tsx` for dev) on :3001. `@anthropic-ai/sdk` + `@octokit/rest`.
- All AI calls go through `server/src/llm.ts` `callLLM()` — the single provider seam. Model defaults to `claude-sonnet-4-6` (override with `ANTHROPIC_MODEL`).
- Run: `npm run dev` at root (concurrently). Typecheck: `npm run typecheck`.

## Operating principles

- Treat my phase prompts as the source of truth, and treat my later messages as refinements — adapt the plan instead of rigidly following earlier instructions.
- Verify your own work before declaring a phase done: run the app, run typecheck/lint/tests, and fix every error and warning. Never report success with a failing build.
- Self-review against the requirements: before finishing a phase, re-read its bullet points, confirm each is implemented, and list what's done vs what's pending.
- Diagnose root causes, not symptoms. Do not hide errors behind empty try/catch blocks.
- Do not invent APIs, packages, or methods. Verify names/versions exist and that imports resolve; check docs or type definitions when unsure.
- Keep a running "Lessons" section in this file: when you hit and fix a mistake, add a one-line note so you do not repeat it.
- Make small, testable commits per phase and explain what changed and why.
- Ask before any destructive or irreversible action (deleting files, dropping data, force-push).
- Abstract the LLM call behind a single callLLM() function so the AI provider can be swapped without touching the rest of the code.
- If a requirement is ambiguous, stop and ask rather than guessing wrong.

## Lessons

- This machine runs Node 20.17.0; Vite 7/8 require Node ≥20.19, so the client is pinned to vite@^6 + @vitejs/plugin-react@^4. Don't bump Vite without upgrading Node first.
- The spec's model claude-sonnet-4-20250514 is deprecated (retires 2026-06-15); the official replacement claude-sonnet-4-6 is the default instead.
- Writing a NUL escape inside a template literal in a Write tool call emits a literal NUL byte into the source file — escape it as `\u0000 (escaped)` (caught in graph.ts).
- React 19 + eslint react-hooks forbids synchronous setState in a useEffect body — derive initial state in useState(init) instead.
