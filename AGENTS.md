# AGENTS.md — HoneylakeOS (Codex)

## What this project is
HoneylakeOS is a HIPAA-aware web app built with Vite + React + TypeScript and Supabase. It uses a modular runtime and strict conventions around UI primitives, data access, and compliance. Treat patient data as PHI.

## How Codex should work in this repo
- Prefer small, reviewable changes. If the change is large, propose a plan first.
- Never expose secrets to the browser; privileged operations must live in Supabase Edge Functions.
- Always preserve HIPAA/compliance guarantees—when uncertain, stop and ask.

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
- TanStack Query v5
- react-router-dom v6
- Vitest + Testing Library
- Vercel deployment

## Project Structure (high level)
src/
- `components/` — React components (layout/, ui/)
- `core/` — business logic (modules/, runtime/, safety/)
- `pages/` — route pages (public/, auth/, app/)
- `lib/` — auth, membership, helpers
- `hooks/` — custom hooks
- `integrations/` — Supabase client config
- `data/` — static data/config
- `test/` — test utilities

supabase/
- `functions/` — Edge functions (ai-gateway, exit-survey-*, etc.)
- `migrations/` — SQL migrations

docs/ — project documentation
scripts/ — one-off utilities

## Code Conventions (non-negotiables)
- Functional React components with hooks (no class components).
- Use shadcn-ui components from `src/components/ui/`. Do not install alternatives.
- Data fetching via TanStack Query hooks; never raw `fetch()` in components.
- Zod for form/input validation.
- Module gating via `ModuleGuard` in routes + `useCompanyModuleFlags()` hook.
- Any server-side privileged operations must be in Supabase Edge Functions.
- Audit log all PHI/PII access events.

## Security & Compliance Guardrails
- HIPAA-aware: treat patient data as PHI.
- Never put secrets or service role keys in `VITE_*` env vars.
- AES-GCM encrypted integration secrets use `enc:v1:` prefix.
- All cron jobs remain disabled until explicit go-live cutover.

## Doc Maintenance Rules (update docs in the same commit)
- Major architectural decision → new ADR in `docs/DECISIONS/NNNN-<slug>.md`
- New/changed feature → `docs/TASKS.md`
- New integration/service → `docs/INTEGRATIONS.md`
- New env var/secret → `docs/ENVIRONMENT.md`
- Workflow/process change → `docs/WORKFLOWS.md` or `docs/RUNBOOK.md`
- Release/deployment → `docs/RELEASES.md`
- Security/compliance change → `docs/HIPAA_COMPLIANCE_BASELINE.md`
- API change → `docs/API.md`

## Session Preflight (what to read before starting work)
Read in this order:
1. `docs/CONTEXT.md`
2. `docs/ENVIRONMENT.md`
3. `docs/TASKS.md`
4. `docs/RUNBOOK.md`
5. Scan `docs/DECISIONS/` for ADRs relevant to the task

If working on specific areas, also read:
- Exit survey → `docs/DECISIONS/0007-exit-survey-architecture.md`
- AI → `docs/AI_PHASE1_SETUP.md`, `docs/AI_PHASE2_SETUP.md`
- Deployment → `docs/DEPLOYMENT.md`
- Supabase schema/functions → `docs/SUPABASE.md`
- Security/compliance → `docs/HIPAA_COMPLIANCE_BASELINE.md`

## Session Closeout (before ending a meaningful session)
1. Update `docs/TASKS.md` with completed/new work
2. Commit changes with clear messages
3. Push to the working branch
