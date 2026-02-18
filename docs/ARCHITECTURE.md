# Architecture

## Summary
- Client-side SPA built with Vite + React + TypeScript.
- Supabase provides auth, data, storage, and edge functions.

## Key Components
- App bootstrap: `src/main.tsx`
- Routing and providers: `src/App.tsx`
- Auth context: `src/lib/auth.tsx`
- Membership context: `src/lib/membership.tsx`
- Module gating: `src/core/modules/*`

## Risks
- Auth and routing protections are client-side; RLS is required for enforcement.
- The Supabase client is a single point for all data access.

## Deep Dive
- See `docs/ARCHITECTURE_REPORT.md` for the full runtime inventory and blast radius analysis.
