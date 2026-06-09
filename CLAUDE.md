# CodeLens AI

A TypeScript full-stack app that analyzes any public GitHub repo through three lenses: **Map** (architecture dependency graph), **Guard** (security/threat model), **Morph** (AI refactor with diffs). React + Vite client in `/client`, Express server in `/server`.

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
