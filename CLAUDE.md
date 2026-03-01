# HoneylakeOS

## Build & Test Commands

- `npm run dev` — local dev server (Vite)
- `npm run build` — production build
- `npm run build:dev` — development build
- `npm run lint` — ESLint
- `npm run test` — run all tests (Vitest)
- `npm run test:smoke` — smoke test only
- `npm run test:watch` — watch mode
- TypeScript scripts: `npx tsx scripts/<name>.ts`

## Tech Stack

- Vite 5 + React 18 + TypeScript
- Tailwind CSS + shadcn-ui (Radix primitives)
- Supabase (auth, Postgres, edge functions, storage)
- TanStack Query v5 for data fetching/caching
- react-router-dom v6 for routing
- Vitest + Testing Library for tests
- Vercel for deployment

## Doc Maintenance Rules

When making changes, update the relevant docs **in the same commit**:

| Change type | Update |
|---|---|
| Major architectural decision | New ADR in `docs/DECISIONS/NNNN-<slug>.md` |
| New or changed feature | `docs/TASKS.md` (mark done or add new) |
| New integration or service | `docs/INTEGRATIONS.md` |
| New env var or secret | `docs/ENVIRONMENT.md` |
| Workflow or process change | `docs/WORKFLOWS.md` or `docs/RUNBOOK.md` |
| Release or deployment | `docs/RELEASES.md` |
| Security or compliance change | `docs/HIPAA_COMPLIANCE_BASELINE.md` |
| API change | `docs/API.md` |

## Code Conventions

- Functional React components with hooks (no class components)
- Use shadcn-ui components from `src/components/ui/` — do not install alternatives
- Data fetching via TanStack Query hooks, never raw `fetch()` in components
- Zod for form/input validation
- Module gating via `ModuleGuard` in routes + `useCompanyModuleFlags()` hook
- Edge functions for any server-side privileged operations (keys never in browser)
- Audit log all PHI/PII access events

## Project Structure

```
src/
├── components/     # React components (layout/, ui/)
├── core/           # Business logic (modules/, runtime/, safety/)
├── pages/          # Route pages (public/, auth/, app/)
├── lib/            # Auth, membership, helpers
├── hooks/          # Custom React hooks
├── integrations/   # Supabase client config
├── data/           # Static data/config
├── test/           # Test utilities
supabase/
├── functions/      # Edge functions (ai-gateway, exit-survey-*, etc.)
├── migrations/     # SQL migrations
docs/               # All project documentation
scripts/            # One-off and utility scripts
```

## Security & Compliance

- HIPAA-aware project — treat patient data as PHI
- Never put secrets or service role keys in `VITE_*` env vars
- AES-GCM encrypted integration secrets (`enc:v1:` prefix)
- All cron jobs stay disabled until explicit go-live cutover
- Run `npm run test` before committing to catch regressions

## Daily Workflow Prompts (for the developer)

### Starting your day (new machine or new session)

Say one of these:

> "Pull latest and get up to speed"

or

> "Start of day — pull latest from main, read the project docs, and tell me where we left off"

This tells Claude to:
1. `git pull origin main` to get the latest code
2. Read `CONTEXT.md`, `ENVIRONMENT.md`, `TASKS.md`, `RUNBOOK.md`, and any relevant ADRs
3. Summarize what's in progress and what's next

### Ending your day (closing out a session)

Say one of these:

> "End of day — commit, push, and update tasks"

or

> "Close out for the day"

This tells Claude to:
1. Update `docs/TASKS.md` with any completed or newly discovered work
2. Commit all changes with clear messages
3. Push to the working branch (usually `main`)
4. Give you a summary of what was done and what's next

## On Session Start (Claude instructions)

Read these docs automatically to load project context before doing any work:
1. `docs/CONTEXT.md` — purpose, tech stack, entry points, module system
2. `docs/ENVIRONMENT.md` — env vars (Vite build-time vs Supabase secrets)
3. `docs/TASKS.md` — active tasks, backlog, and completed work
4. `docs/RUNBOOK.md` — operational procedures
5. Scan `docs/DECISIONS/` for any ADRs relevant to the current task

If the session involves a specific subsystem, also read:
- Exit survey work → `docs/DECISIONS/0007-exit-survey-architecture.md`
- AI features → `docs/AI_PHASE1_SETUP.md`, `docs/AI_PHASE2_SETUP.md`
- Deployment → `docs/DEPLOYMENT.md`
- Supabase schema/functions → `docs/SUPABASE.md`
- Security/compliance → `docs/HIPAA_COMPLIANCE_BASELINE.md`

## On Session End (Claude instructions)

Before ending a session with meaningful changes:
1. Ensure `docs/TASKS.md` reflects any completed or newly discovered work
2. Commit all changes with clear messages
3. Push to the working branch
