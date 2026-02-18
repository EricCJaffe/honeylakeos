# 0004 Vercel SPA Deployment

## Date
2026-02-18

## Status
Accepted

## Context
The app is a client-side SPA (Vite + React + react-router-dom). All routing is handled in the browser. A hosting platform must serve `index.html` for every path so that deep links and page refreshes work correctly.

## Decision
Deploy to Vercel with a single catch-all rewrite rule in `vercel.json`:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Push to `main` branch triggers an automatic Vercel production deployment. No custom build command is needed — Vercel detects Vite automatically.

## Consequences
- All 404 handling is client-side (react-router `*` route → `NotFound` page).
- There is no SSR; the initial page load depends on the full JS bundle being parsed and executed.
- Environment variables must be set in Vercel project settings (not committed to the repo).
- CDN caching of `index.html` must be set to short TTL or no-cache to ensure deploys propagate.

## Links
- `vercel.json`
- `docs/DEPLOYMENT.md`
- ADR-0001 for the SPA + Supabase architecture decision.
