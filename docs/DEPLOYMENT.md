# Deployment

## Environments
- Local: Vite dev server via `npm run dev`
- Production: Vercel (primary)

## Initial Setup (Vercel + Supabase CLI Linking)

Both CLIs need API tokens to link to the project. Generate them:
- **Vercel**: https://vercel.com/account/tokens
- **Supabase**: https://supabase.com/dashboard/account/tokens

Then run the setup script from the repo root:
```bash
VERCEL_TOKEN=vcp_... SUPABASE_ACCESS_TOKEN=sbp_... ./scripts/setup-services.sh
```

This will:
1. Authenticate and link the Vercel CLI (creates `.vercel/project.json`)
2. Sync `VITE_SUPABASE_*` env vars to Vercel project settings
3. Authenticate and link the Supabase CLI to project `umsibvxethuebdyjamxi`

### Vercel Environment Variables

These must be set in Vercel project settings (all environments):

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://umsibvxethuebdyjamxi.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `VITE_SUPABASE_PROJECT_ID` | `umsibvxethuebdyjamxi` |

The setup script copies these from `.env` automatically.

## Build & Deploy

- Build: `npm run build`
- Preview deploy: `npx vercel --token $VERCEL_TOKEN`
- Production deploy: `npx vercel --prod --token $VERCEL_TOKEN`
- Preview locally: `npm run preview`

## SPA Routing

`vercel.json` contains a catch-all rewrite (`/(.*) -> /index.html`) for client-side routing.

## Rollback
- Revert to a previous Vercel deployment or prior git commit.
