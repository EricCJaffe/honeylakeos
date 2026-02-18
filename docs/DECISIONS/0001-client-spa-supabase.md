# 0001 Client-Side SPA With Supabase Backend

## Date
2026-02-18

## Status
Accepted

## Context
The product requires a fast-moving, client-driven UI with modular feature surfaces and a serverless backend. The current runtime has no SSR and relies on Supabase for auth, data, and edge functions.

## Decision
Keep the application as a client-side SPA (Vite + React) with Supabase as the primary backend. All auth and data access flows are handled via the Supabase SDK and edge functions.

## Consequences
- No SSR: initial load depends on the full JS bundle.
- Auth and routing protections are client-side and must be reinforced by RLS policies.
- Backend logic is request-scoped via Supabase edge functions.

## Links
- `docs/ARCHITECTURE_REPORT.md`
- `src/integrations/supabase/client.ts`
