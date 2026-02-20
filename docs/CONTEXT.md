# Project Context

## Purpose
HoneylakeOS is a multi-module web application built on React and Supabase. It includes public pages, authentication, and a large authenticated app surface with role-based access and module feature flags. The product targets coaching orgs, client companies, and solo coaches with an operating system for programs, operations, and learning.

## Tech Stack
- Vite 5 + React 18 + TypeScript
- Tailwind CSS + shadcn-ui (Radix primitives)
- Supabase (auth, Postgres, edge functions, storage)
- TanStack Query v5 for client-side caching
- react-router-dom v6 for client-side routing
- Tiptap for rich text editing
- Vitest + Testing Library for tests
- Vercel for deployment

## Key Entry Points
- `src/main.tsx` — bootstraps the app and applies a 404 redirect fallback for SPA routing.
- `src/App.tsx` — wires providers and defines the full route map (~100+ routes).

## Routing Structure
- **Public**: `src/pages/public/*` — no auth required.
- **Auth**: `/login`, `/signup`, `/auth/reset` — standalone pages.
- **App**: `/app/*` — wrapped in `ProtectedRoute` + `AppLayout`; all routes require authentication.
- **Public form**: `/f/:token` — token-based public form submission (no auth).
- **Public exit survey**: `/exit-survey` — public patient survey page (no auth).
- **Invite**: `/invite` — token-based invite acceptance.
- **Exit survey detail**: `/app/exit-survey/submissions/:submissionId` — full-page response viewer.
- **Utility**: `/ai-smoke` — protected standalone diagnostic page outside the app shell.
- Layouts live in `src/components/layout/*`.

## Auth and Membership
- `src/lib/auth.tsx` — `AuthProvider`; wraps `supabase.auth`; includes an 8-second failsafe to prevent infinite loading if auth hangs.
- `src/lib/membership.tsx` — `MembershipProvider`; fetches company memberships and site memberships for the current user; persists active company in `profiles.active_company_id`.
- Supabase client: `src/integrations/supabase/client.ts`.

### Roles
- **Membership roles** (per company): `company_admin`, `location_admin`, `module_admin`, `user`, `external`.
- **Site roles** (platform-level): `super_admin`, `site_admin`.
- `isSuperAdmin` / `isSiteAdmin` / `isCompanyAdmin` are derived booleans in `useMembership()`.

## Module System
All module definitions live in `src/core/modules/moduleRegistry.ts`.

### Core modules (always enabled, cannot be disabled)
`core`, `tasks`, `projects`, `calendar`, `notes`, `docs` (Documents), `groups`, `locations`, `admin`

### Optional modules (per-company feature flags)
`departments`, `board_meetings`, `exit_survey`, `crm`, `contacts`, `forms`, `workflows`, `announcements`, `finance`, `reports`, `lms`

Default enablement (from `moduleRegistry`):
- **Default enabled**: `departments`, `exit_survey`
- **Default disabled**: `board_meetings`, `crm`, `contacts`, `forms`, `workflows`, `announcements`, `finance`, `reports`, `lms`

### How flags work
- Flags are stored in the `feature_flags` Supabase table.
- If a flag row exists with `enabled = false`, the module is disabled.
- If no flag row exists, the module defaults to **enabled** (defers to legacy `company_modules` system).
- On flag load failure, the system enters **safe mode**: only core modules are shown.
- `ModuleGuard` in routes enforces UI-level gating; RLS enforces data-level gating.
- Hook: `useCompanyModuleFlags()` in `src/core/modules/useCompanyModuleFlags.ts`.

## AI Layer (Phase 1 + Phase 2)
- **AI gateway** edge function (`supabase/functions/ai-gateway/`) — server-side proxy to OpenAI; keys never sent to browser.
- **AI embed content** edge function (`supabase/functions/ai-embed-content/`) — generates and stores vector embeddings.
- **Secrets**: integration API keys are AES-GCM encrypted (`enc:v1:` prefix) and stored in `company_integrations`; managed via `manage-integration-secret` edge function.
- **Per-company AI settings**: `company_ai_settings` table controls `ai_enabled`, `workflow_copilot_enabled`, `template_copilot_enabled`, `insights_enabled`, and token limits.
- **Prompt files**: `supabase/functions/ai-gateway/prompts/*.system.md` (workflow-copilot, template-copilot, insight-summary).
- **Embeddings**: stored in `ai_document_chunks` with `vector(1536)`; retrieved via `match_ai_document_chunks()` RPC.
- **Usage logging**: all AI calls logged to `ai_usage_logs`.
- See `docs/AI_PHASE1_SETUP.md` and `docs/AI_PHASE2_SETUP.md` for setup steps.

## Testing
- Vitest configured in `vitest.config.ts`.
- Smoke test: `src/core/runtime/safety.smoke.test.ts`.
- Run: `npm run test` (all), `npm run test:smoke` (smoke only).

## Supabase
- Project ID: `umsibvxethuebdyjamxi`
- Config and migrations: `supabase/`
- See `docs/SUPABASE.md` for full details.

## Canonical Docs
- Architecture/risks: `docs/ARCHITECTURE_REPORT.md`
- Launch readiness: `docs/LAUNCH_READINESS.md`
- Resilience checklist: `docs/RESILIENCE_CHECKLIST.md`
- Security notes: `docs/SECURITY_ADVISOR_NOTES.md`
- Schema snapshot: `docs/SCHEMA_SNAPSHOT.md`
