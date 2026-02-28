# Supabase

## Project
- **Project ID**: `umsibvxethuebdyjamxi`
- **URL**: `https://umsibvxethuebdyjamxi.supabase.co`
- Config: `supabase/config.toml`

## Client
- Client setup: `src/integrations/supabase/client.ts`
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- Auth storage: `localStorage` with `persistSession: true` and `autoRefreshToken: true`.

## Auth
- Context provider: `src/lib/auth.tsx`
- Membership and active company: `src/lib/membership.tsx`
- Active company persisted in `profiles.active_company_id`.
- Auth failsafe: 8-second timeout to prevent infinite loading on network/storage failure.

## Database
- Migrations: `supabase/migrations/`
- Schema snapshot: `docs/SCHEMA_SNAPSHOT.md`
- Seed data: `docs/SEED_DATA.md`
- RLS is enforced at the database layer; module flags in the UI are a UX convenience only.

## Edge Functions

| Function | JWT Required | Description |
|---|---|---|
| `ai-gateway` | Yes | Server-side OpenAI proxy; reads company API key from encrypted store |
| `ai-embed-content` | Yes | Generates OpenAI embeddings and stores in `ai_document_chunks` |
| `manage-integration-secret` | Yes | Encrypts (AES-GCM) and stores integration API keys in `company_integrations` |
| `send-employee-invite-email` | Yes | Sends invite emails via Resend |
| `exit-survey-notify` | No | Sends Resend alerts for exit survey low-score notifications |
| `exit-survey-weekly-digest` | No | Sends weekly exit survey summaries to question owners (Resend) |
| `exit-survey-reminders` | No | Sends reminder emails for open exit survey alerts (Resend) |
| `exit-survey-retention` | No | Dry-run retention candidate scan for exit-survey submissions/alerts based on settings |
| `get-finance-metrics` | Yes | Finance dashboard metrics (requires Authorization header) |
| `create-backup` | Yes | Exports schema + data to backup store |
| `restore-backup` | Yes | Restores from a backup |
| `sop-review-reminders` | No | Sends scheduled SOP review reminders (supports scheduler secret + dry-run mode) |

## AI Tables (Phase 1)
- `company_ai_settings` — per-company AI feature flags and token limits.
- `ai_usage_logs` — logs every AI call (model, tokens, latency, status).
- `ai_document_chunks` — vector embedding store (`vector(1536)`).
- `match_ai_document_chunks(...)` — RPC for similarity search / RAG retrieval.
- `company_integrations` — stores encrypted API keys per provider per company.

## Backups
- `create-backup` and `restore-backup` read/write backups in the `company-backups` storage bucket.

## Schema References
- Snapshot: `docs/SCHEMA_SNAPSHOT.md`
- Seed data: `docs/SEED_DATA.md`
- AI setup: `docs/AI_PHASE1_SETUP.md`, `docs/AI_PHASE2_SETUP.md`
