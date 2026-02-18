# Project Context

## Purpose
HoneylakeOS is a multi-module web application built on React and Supabase. It includes public marketing pages, authentication, and a large authenticated app surface with role-based access and module feature flags. The product is a coach-led operating system for coaching orgs, client companies, and solo coaches.

## Tech Stack
- Vite + React + TypeScript
- Tailwind CSS + shadcn-ui
- Supabase for auth and data
- TanStack Query for client caching
- Vitest for tests

## Key Entry Points
- `src/main.tsx` bootstraps the app and applies a 404 redirect fallback.
- `src/App.tsx` wires providers and defines the full route map.

## Routing Structure
- Public routes live under `src/pages/public/*`.
- Auth routes are `src/pages/auth/*`.
- App routes are under `src/pages/app/*` and wrapped by `ProtectedRoute`.
- Layouts are in `src/components/layout/*`.

## Auth and Membership
- `src/lib/auth.tsx` provides `AuthProvider` and auth helpers.
- `src/lib/membership.tsx` provides `MembershipProvider` and active company selection.
- Supabase client lives in `src/integrations/supabase/client.ts`.

## Module Flags
- Feature/module gating is in `src/core/modules/*`.
- `ModuleGuard` and module registry are used to enable or disable sections by company flags.

## Product Surface (High Level)
- Core modules that are always available: tasks, projects, calendar, notes, documents.
- Optional modules: coaching, frameworks, LMS, CRM, forms, finance, reports, workflows, and more.
- Route surfaces live under `src/pages/app/*` with one folder per domain.

## Testing
- Vitest is configured in `vitest.config.ts`.
- A smoke test exists at `src/core/runtime/safety.smoke.test.ts`.

## Supabase
- Config and migrations are under `supabase/`.
- A schema snapshot and notes are in `docs/SCHEMA_SNAPSHOT.md` and related docs.

## Canonical Docs
- Architecture/risks: `docs/ARCHITECTURE_REPORT.md`
- Launch readiness: `docs/LAUNCH_READINESS.md`
- Resilience checklist: `docs/RESILIENCE_CHECKLIST.md`
