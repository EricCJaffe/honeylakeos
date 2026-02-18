# Workflows

## Local Dev
- Install dependencies: `npm i`
- Start dev server: `npm run dev`
- Build: `npm run build`
- Preview build: `npm run preview`

## Tests and Lint
- Run all tests: `npm run test`
- Watch tests: `npm run test:watch`
- Smoke test: `npm run test:smoke`
- Lint: `npm run lint`

## Env Vars
- Supabase config is read from `import.meta.env` in `src/integrations/supabase/client.ts`.
- Required keys: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

## Deploy
- Vercel config is in `vercel.json`.
- If using Lovable, publish via its UI as described in `README.md`.
