# Runbook

## 1. Auth or Session Issues
- **Symptom**: stuck on login screen, blank app, or infinite spinner.
- **Checks**:
  - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set correctly in Vercel env.
  - Check Supabase project status at `https://app.supabase.com`.
  - Auth has an 8-second failsafe — if it fires, the user lands on a logged-out state without an error. Check browser console for `supabase.auth.getSession failed`.
- **Fix**: correct env vars and redeploy, or restore Supabase project if paused.

## 2. Module Access Missing / Safe Mode
- **Symptom**: module nav items or pages are absent or show "Module Disabled".
- **Checks**:
  - Check `feature_flags` table for the company — a row with `enabled = false` disables the module.
  - If flags fail to load (network error), the system enters safe mode: only core modules show.
  - Confirm the user has an active membership for the active company (`memberships` table, `status = active`).
- **Fix**: insert or update the flag row in `feature_flags`; verify memberships are active; check Supabase logs under `Logs → API` if flags fail to load.

## 3. Edge Function Failures (AI, Emails, Finance)
- **Symptom**: AI copilot errors, invite/exit-survey emails fail, or finance metrics return 401/500.
- **Checks**:
  - AI: `INTEGRATION_SECRET_KEY` set; `company_integrations.openai` enabled; `company_ai_settings.ai_enabled = true`.
  - Email: `RESEND_API_KEY`, `APP_URL`, and optional `EMAIL_FROM` set for `send-employee-invite-email`, `exit-survey-notify`, `exit-survey-weekly-digest`, `exit-survey-reminders`.
  - Weekly/reminder emails: ensure cron scheduler calls the functions with `{ "company_id": "<id>" }`.
  - Finance: requests to `get-finance-metrics` include an Authorization header (JWT).
  - Check edge function logs: Supabase dashboard → `Logs → Edge Functions`.
- **Fix**: re-store integration keys via `manage-integration-secret`; set missing secrets; retry with valid JWT for finance calls.
