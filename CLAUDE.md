# HoneylakeOS

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build (run before pushing)
- `npm run lint` — ESLint
- `npm run test` — all tests (Vitest)
- `npm run test:smoke` — smoke tests only
- `npx tsx scripts/<name>.ts` — run TypeScript scripts

## Tech Stack

Vite 5, React 18, TypeScript, Tailwind CSS, shadcn-ui (Radix), Supabase (auth/Postgres/edge functions/storage), TanStack Query v5, react-router-dom v6, Vitest + Testing Library, Vercel deployment.

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
├── functions/      # Edge functions
├── migrations/     # SQL migrations (never modify without asking)
docs/               # Project documentation
scripts/            # Utility scripts
```

## Code Rules

- Use shadcn-ui from `src/components/ui/` — do not install alternative UI libraries
- Data fetching via TanStack Query hooks only — no raw `fetch()` in components
- Zod for form/input validation
- Module gating: `ModuleGuard` in routes + `useCompanyModuleFlags()` hook
- Edge functions for server-side privileged operations (keys never in browser)
- Audit log all PHI/PII access events

## Security (HIPAA)

- Treat all patient data as PHI
- Never put secrets or service role keys in `VITE_*` env vars
- Integration secrets use AES-GCM encryption (`enc:v1:` prefix)
- Cron jobs stay disabled until explicit go-live cutover

## Git Workflow

- Direct push to `main` is blocked — use feature branches + PRs
- Run `npm run build` before pushing to catch errors
- Run `npm run test` before committing to catch regressions

## Doc Maintenance

Update relevant docs **in the same commit** as code changes:

| Change type | Doc to update |
|---|---|
| Architecture decision | New ADR in `docs/DECISIONS/NNNN-<slug>.md` |
| Feature added/changed | `docs/TASKS.md` |
| New integration | `docs/INTEGRATIONS.md` |
| New env var/secret | `docs/ENVIRONMENT.md` |
| Workflow/process | `docs/WORKFLOWS.md` or `docs/RUNBOOK.md` |
| Deployment/release | `docs/RELEASES.md` |
| Security/compliance | `docs/HIPAA_COMPLIANCE_BASELINE.md` |
| API change | `docs/API.md` |

## Context Docs (read as needed)

- `docs/CONTEXT.md` — project purpose, entry points, module system
- `docs/TASKS.md` — active work, backlog, completed items
- `docs/ENVIRONMENT.md` — env var reference
- `docs/RUNBOOK.md` — operational procedures
- `docs/DECISIONS/` — architectural decision records
- `docs/DEPLOYMENT.md`, `docs/SUPABASE.md`, `docs/HIPAA_COMPLIANCE_BASELINE.md` — subsystem-specific

## Session End

Before ending a session with meaningful changes:
1. Update `docs/TASKS.md` with completed/discovered work
2. Commit all changes with clear messages
3. Push to the working branch
