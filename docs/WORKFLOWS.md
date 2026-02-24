# Workflows

## Local Dev
```bash
npm i              # install dependencies
npm run dev        # start Vite dev server (http://localhost:5173)
npm run build      # production build (output: dist/)
npm run build:dev  # development-mode build (useful for debugging)
npm run preview    # serve the production build locally
```

## Tests and Lint
```bash
npm run test        # run full test suite (vitest)
npm run test:watch  # vitest in watch mode
npm run test:smoke  # run only src/core/runtime/safety.smoke.test.ts
npm run lint        # ESLint
```

## Scripts
```bash
npx tsx scripts/<name>.ts  # run TypeScript scripts (e.g., import-exit-survey-history.ts)
```

## Env Vars
Copy `.env` to `.env.local` for local overrides. Required keys — see `docs/ENVIRONMENT.md` for details.

## Supabase CLI
```bash
supabase login                          # authenticate
supabase link --project-ref umsibvxethuebdyjamxi  # link to production project
supabase db push                        # apply local migrations to linked project
supabase functions deploy <name>        # deploy a specific edge function
supabase functions deploy               # deploy all edge functions
supabase db diff --schema public        # diff local vs remote schema
```

## Exit Survey Jobs (Manual Run)
```bash
supabase functions deploy exit-survey-weekly-digest exit-survey-reminders
supabase functions invoke exit-survey-weekly-digest --body '{"company_id":"<company_id>"}'
supabase functions invoke exit-survey-reminders --body '{"company_id":"<company_id>"}'
```

Scheduler required: configure a weekly cron for `exit-survey-weekly-digest` and a 48–72 hour cadence for `exit-survey-reminders`.

## Deploy (Vercel)
- Push to `main` branch — Vercel auto-deploys.
- `vercel.json` contains a single SPA catch-all rewrite rule (`/* → /index.html`).
- No build command override needed; Vercel detects Vite automatically.

## AI Setup (new environment or company)
See `docs/AI_PHASE1_SETUP.md` for the full checklist. Summary:
1. Apply migrations: `supabase db push`
2. Deploy edge functions: `supabase functions deploy ai-gateway manage-integration-secret ai-embed-content`
3. Set edge function secrets in Supabase dashboard (see `docs/ENVIRONMENT.md`).
4. Enable OpenAI integration per company via `company_integrations` + `manage-integration-secret`.
5. Set `ai_enabled = true` in `company_ai_settings` for each target company.
