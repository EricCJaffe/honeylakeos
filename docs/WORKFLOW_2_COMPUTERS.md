# Two-Computer Workflow (Cloud-First)

Use this workflow to avoid local Supabase drift and port conflicts while working across two laptops.

## Goals
- Keep schema and edge function changes controlled and reproducible.
- Test every change in Vercel Preview before production.
- Minimize local-only state and "it works on one machine" issues.

## Environment Model
- `Supabase DEV/STAGING`: daily development target.
- `Supabase PROD`: production only after sign-off.
- `Vercel Preview`: test branch deployments.
- `Vercel Production`: `main` only.

## One-Time Setup (each laptop)
```bash
git clone <repo-url>
cd honeylakeos
npm i
supabase login
vercel login
```

Create shell aliases (optional):
```bash
alias sbdev='supabase link --project-ref <DEV_PROJECT_REF>'
alias sbprod='supabase link --project-ref <PROD_PROJECT_REF>'
```

## Daily Start (either laptop)
```bash
git checkout main
git pull --ff-only
git checkout -b feat/<short-name>
vercel env pull .env.local --environment=preview
supabase link --project-ref <DEV_PROJECT_REF>
```

## Making Changes
1. Make code updates.
2. For DB changes: create a new migration (do not edit old migrations).
3. Apply to DEV only:
```bash
supabase db push
```
4. Deploy updated edge functions to DEV only:
```bash
supabase functions deploy <fn-name>
```
5. Push feature branch:
```bash
git push -u origin feat/<short-name>
```
6. Validate on Vercel Preview URL.

## Promotion to Production
1. Merge approved PR to `main`.
2. Pull latest on primary machine:
```bash
git checkout main
git pull --ff-only
```
3. Link PROD and apply migrations:
```bash
supabase link --project-ref <PROD_PROJECT_REF>
supabase db push
```
4. Deploy required functions to PROD:
```bash
supabase functions deploy <fn-name>
```
5. Confirm Vercel production deployment health.

## Rules That Prevent Drift
- Do not run long-lived local Supabase containers for normal work.
- Do not edit previous migration files after they are committed.
- If emergency SQL is run in dashboard, immediately capture it as a migration and commit.
- Keep branches short-lived; push frequently from both machines.
- Use `git pull --ff-only` before starting and before pushing.

## Recovery When Things Drift
1. Preserve current work:
```bash
git checkout -b backup/<date>-<note>
git add -A && git commit -m "WIP backup before resync"
```
2. Return to clean branch:
```bash
git checkout main
git pull --ff-only
```
3. Re-apply only needed changes via cherry-pick or selective file restore.

## Quick Commands
```bash
# DEV
supabase link --project-ref <DEV_PROJECT_REF>
supabase db push
supabase functions deploy <fn-name>

# PROD
supabase link --project-ref <PROD_PROJECT_REF>
supabase db push
supabase functions deploy <fn-name>
```

