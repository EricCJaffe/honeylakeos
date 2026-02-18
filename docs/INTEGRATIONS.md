# Integrations

## OpenAI (Active)
- **Purpose**: AI copilot for workflows, templates, and insight summaries.
- **How**: All calls go server-side through the `ai-gateway` edge function. API keys are never sent to the browser.
- **Key storage**: Encrypted with AES-GCM via `manage-integration-secret`; stored in `company_integrations` per company.
- **Provider key**: `openai` in `integration_providers` table.
- **Models used**: Configured per prompt; currently gpt-4 class (see ai-gateway for defaults).
- **OpenAI is the only supported AI provider** — multi-provider support is not currently planned.
- **Setup**: `docs/AI_PHASE1_SETUP.md`

## Resend (Active)
- **Purpose**: Transactional email (employee invites).
- **Edge function**: `send-employee-invite-email`
- **Secret required**: `RESEND_API_KEY` (set in Supabase edge function secrets).
- **Sender**: configurable via `EMAIL_FROM` secret; defaults to `BusinessOS <onboarding@resend.dev>`.

## Plaid (Planned)
- Banking/finance integration; not yet implemented. Referenced in backlog.

## SOP Review Reminders (Active)
- **Purpose**: Scheduled reminders for SOP document reviews.
- **Edge function**: `sop-review-reminders`
- **Trigger**: Expected to be called on a schedule (cron); setup not documented in repo.

## Webhooks
- None documented yet.

## Internal Edge Functions
See `docs/SUPABASE.md` for the full edge function inventory.
