# Integrations

## OpenAI (Active)
- **Purpose**: AI copilot for workflows, templates, and insight summaries.
- **How**: All calls go server-side through the `ai-gateway` edge function. API keys are never sent to the browser.
- **Key storage**: Encrypted with AES-GCM via `manage-integration-secret`; stored in `company_integrations` per company.
- **Provider key**: `openai` in `integration_providers` table.
- **Models used**: Configured per prompt; currently gpt-4 class (see ai-gateway for defaults).
- **Setup**: `docs/AI_PHASE1_SETUP.md`

## Resend (Active)
- **Purpose**: Transactional email (employee invites, exit survey alerts, weekly digests, reminders).
- **Edge functions**:
  - `send-employee-invite-email` (tested ✅)
  - `exit-survey-notify`
  - `exit-survey-weekly-digest`
  - `exit-survey-reminders`
- **Secrets required** (set in Supabase edge function secrets):
  - `RESEND_API_KEY` - API key from resend.com
  - `APP_URL` - Production app URL (e.g., `https://honeylakeos-git-main-ericcjaffes-projects.vercel.app`)
  - `EMAIL_FROM` - Sender address (e.g., `Honey Lake Clinic <onboarding@resend.dev>`)
- **Status**: Integration tested and operational as of 2026-02-24.

## Microsoft 365 SSO (Active)
- **Purpose**: Single sign-on for staff using work emails.
- **How**: Supabase OAuth provider `azure` (Microsoft) with `signInWithOAuth`.
- **Setup**: Configure the Azure provider in Supabase Auth settings.

## Zapier (Planned)
- Triggers + Actions integration. Listed in `integration_providers` and UI scaffolding, but no edge functions yet.

## Plaid (Planned)
- Banking/finance integration. Listed in `integration_providers` and UI scaffolding, but no edge functions yet.

## Planning Center (Planned)
- People + Giving sync. Listed in `integration_providers` and UI scaffolding, but no edge functions yet.

## SOP Review Reminders (Active)
- **Purpose**: Scheduled reminders for SOP document reviews.
- **Edge function**: `sop-review-reminders`
- **Trigger**: Expected to be called on a schedule (cron); setup not documented in repo.

## Webhooks
- None documented yet.

## Internal Edge Functions
See `docs/SUPABASE.md` for the full edge function inventory.
