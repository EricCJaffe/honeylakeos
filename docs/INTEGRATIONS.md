# Integrations

## OpenAI (Active)
- **Purpose**: AI copilot for workflows, templates, insight summaries, and support ticket triage/remediation.
- **How**: All calls go server-side through the `ai-gateway` edge function. API keys are never sent to the browser.
- **Key storage**: Encrypted with AES-GCM via `manage-integration-secret`; stored in `company_integrations` per company.
- **Provider key**: `openai` in `integration_providers` table.
- **Task types**: `workflow_copilot`, `template_copilot`, `insight_summary`, `support_triage`
- **Models used**: `gpt-4.1-mini` (default for triage), `gpt-4o` (remediation code generation).
- **Setup**: `docs/AI_PHASE1_SETUP.md`

## GitHub (Active — AI Remediation)
- **Purpose**: AI-generated code fixes for support tickets. Reads affected files, creates branches and pull requests.
- **Edge function**: `support-ticket-remediate`
- **Secrets required** (set in Supabase edge function secrets):
  - `GITHUB_TOKEN` — Personal access token with `repo` scope
  - `GITHUB_OWNER` — Repository owner (e.g. `EricCJaffe`)
  - `GITHUB_REPO` — Repository name (e.g. `honeylakeos`)
- **Flow**: Admin clicks "Approve & Generate Fix" → reads files via GitHub API → generates code via OpenAI → creates branch + single atomic commit + PR
- **Status**: Deployed and operational as of 2026-03-25.

## Resend (Active)
- **Purpose**: Transactional email (employee invites, exit survey alerts, weekly digests, reminders, support ticket notifications).
- **Edge functions**:
  - `send-employee-invite-email` (tested ✅)
  - `exit-survey-notify`
  - `exit-survey-weekly-digest`
  - `exit-survey-reminders`
  - `support-ticket-notify` (ticket created, status changed, assigned, message added)
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
