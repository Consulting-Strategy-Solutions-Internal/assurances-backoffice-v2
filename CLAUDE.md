# CLAUDE.md

- At the start of a session, read `context/memory.md` for project decisions, patterns, and progress.
- Before planning or writing code, read `context/project/lessons.md` — mistakes this project already made.

## Worktrees
- Location: .claude/worktrees/<slug> (ignored by git)
- Copy from the main worktree: .env.local (if present — dev proxy to the demo backend, see `context/memory.md`)
- Generate per worktree: nothing (front only, no database); run the dev server on the assigned port: `pnpm exec vite dev --port <app port>`
- Install: pnpm install --frozen-lockfile
- Checks: `npx tsc --noEmit && pnpm lint && pnpm test`
- Can't be isolated: the shared demo backend (`https://nsia.c2s-demo.cloud/api`) → write tests against it happen one at a time
