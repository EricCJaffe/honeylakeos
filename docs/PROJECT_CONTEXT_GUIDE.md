# Project Context Bootstrapping Guide

## Goal
Create a consistent, lightweight context system across all projects so any machine or new session can ramp up quickly.

## One-Time Setup (per repo)
1. Copy the script into the repo:
   - Place `scripts/init-context.sh` in the project.
2. Run it from the repo root:
   - `bash scripts/init-context.sh`
3. Commit the generated `docs/` structure.

## Run on Any New Project
1. Add the script (`scripts/init-context.sh`) to the repo.
2. From repo root, run:
   - `bash scripts/init-context.sh`
3. Open and fill the docs:
   - `docs/CONTEXT.md`
   - `docs/WORKFLOWS.md`
   - `docs/ENVIRONMENT.md`
   - `docs/RUNBOOK.md`
   - `docs/TASKS.md`
   - `docs/DECISIONS/*`
   - `docs/API.md`
   - `docs/ARCHITECTURE.md`
   - `docs/CONTRIBUTING.md`
   - `docs/DEPLOYMENT.md`
   - `docs/INTEGRATIONS.md`
   - `docs/RELEASES.md`
   - `docs/OWNERSHIP.md`

## Prompt to Populate Docs (Paste in a New Thread)
Scan this repo and populate the standard context docs created by scripts/init-context.sh. 
Use only information found in the codebase.

Tasks:
1. Read docs/README.md and update it if needed.
2. Fill in docs/CONTEXT.md with a clear summary of purpose, tech stack, entry points, routing, auth/membership, module flags, and testing.
3. Fill in docs/WORKFLOWS.md with actual commands and environment notes from package.json and config files.
4. Fill in docs/ENVIRONMENT.md with required env vars and how they are used.
5. Fill in docs/SUPABASE.md if Supabase is present; otherwise note "Not used."
6. Fill in docs/INTEGRATIONS.md with any external services or webhooks found.
7. Fill in docs/RUNBOOK.md with the top 3 operational issues implied by the code/docs and their checks/fixes.
8. Fill in docs/TASKS.md with any explicitly listed TODOs from docs or code comments.
9. Add 1-2 ADRs in docs/DECISIONS/ for major architecture decisions you can infer from the repo.
10. Keep changes minimal and do not delete existing content.

After updates, summarize what you changed and call out any gaps where the repo didn't provide enough info.

## Keeping It Up To Date
- When you make a major decision, add an ADR in `docs/DECISIONS/`.
- When starting a new feature, add/adjust tasks in `docs/TASKS.md`.
- When adding integrations, update `docs/INTEGRATIONS.md`.
- When adding env vars, update `docs/ENVIRONMENT.md`.
- When deployment/workflow changes, update `docs/WORKFLOWS.md`.
- When release notes are needed, update `docs/RELEASES.md`.

## New Machine / New Session Checklist
1. Open `docs/README.md`.
2. Read in order:
   - `docs/CONTEXT.md`
   - `docs/WORKFLOWS.md`
   - `docs/ENVIRONMENT.md`
   - `docs/RUNBOOK.md`
3. Set required env vars (per `docs/ENVIRONMENT.md`).
4. Install deps and run locally if needed.
5. Check `docs/TASKS.md` for current priorities.
6. If you make a major architectural change, add an ADR.
