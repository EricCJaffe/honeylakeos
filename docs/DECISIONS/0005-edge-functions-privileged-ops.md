# 0005 Use Supabase Edge Functions For Privileged Operations

## Date
2026-02-20

## Status
Accepted

## Context
The client is a SPA that runs in the browser and cannot safely hold service keys or perform privileged database actions. The repo includes server-side tasks that require elevated permissions or secret handling, including AI proxying, encryption of integration secrets, backup/restore, finance aggregation, and transactional email.

## Decision
Implement privileged workflows as Supabase edge functions using the service role key and server-side secrets. Client code invokes these functions via Supabase functions or direct fetch, keeping secrets and elevated permissions out of the browser.

Examples in this repo:
- `ai-gateway`, `ai-embed-content`, `manage-integration-secret`
- `create-backup`, `restore-backup`
- `get-finance-metrics`
- `send-employee-invite-email`, `exit-survey-notify`

## Consequences
- Secrets live in Supabase edge function settings, not in `VITE_*` env vars.
- Operational checks focus on edge function logs and secret configuration.
- The client remains a pure SPA with no separate backend service.

## Links
- `supabase/functions/`
- `docs/ENVIRONMENT.md`
- `docs/SUPABASE.md`
