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
  - Exit survey assignment emails: ensure `exit-survey-send-assignment` is deployed; starts from workflow runs will call it for exit-survey workflows with a target employee email.
  - Weekly/reminder emails: ensure cron scheduler calls the functions with `{ "company_id": "<id>" }`.
  - Finance: requests to `get-finance-metrics` include an Authorization header (JWT).
  - Check edge function logs: Supabase dashboard → `Logs → Edge Functions`.
- **Fix**: re-store integration keys via `manage-integration-secret`; set missing secrets; retry with valid JWT for finance calls.

## 4. Exit Survey Scheduler (Weekly + Reminders)
- **Goal**: automate `exit-survey-weekly-digest` and `exit-survey-reminders` for all companies with active exit-survey questions.
- **Dispatcher function**: `exit-survey-scheduler`.
- **Runtime behavior**:
  - Per-company settings control execution:
    - `automation_weekly_digest_enabled`, `automation_weekly_digest_day`, `automation_weekly_digest_time`, `automation_weekly_digest_timezone`
    - `automation_reminder_enabled`, `automation_reminder_time`, `automation_reminder_timezone`, `automation_reminder_delay_hours`
  - Both triggers default to OFF until configured in Exit Survey Settings.
  - Scheduler records `automation_last_run_weekly_digest_local_date` and `automation_last_run_alert_reminder_local_date` to prevent duplicate same-day sends.
- **Recommended scheduler call cadence**:
  - Run scheduler every 15 minutes with `{ "mode": "all" }`.
  - It will only dispatch jobs that are enabled and currently inside each company's configured local time window.
- **Security hardening**:
  - Set Edge secret `EXIT_SURVEY_SCHEDULER_SECRET`.
  - Include matching `x-scheduler-secret` header on scheduler calls.
- **Manual test**:
  - POST to `.../functions/v1/exit-survey-scheduler` with `{ "mode": "all", "dry_run": true }`
  - POST with `{ "mode": "weekly", "company_ids": ["<company-id>"] }` for targeted runs.
- **Provision cron job**:
  - SQL migration file: `supabase/migrations/20260227181000_schedule_exit_survey_scheduler.sql`
  - If local/remote migration history is diverged, run that SQL directly in Supabase SQL Editor instead of `supabase db push`.

## 5. Go-Live Checklist (Exit Survey)
- **Data + schema**
  - Confirm `exit_survey_email_templates` exists and built-in templates are initialized.
  - Confirm scheduler cron exists in `cron.job` as `exit-survey-scheduler-every-15m` and `active = true`.
  - Confirm latest scheduler/function code is deployed (`exit-survey-scheduler`, `exit-survey-weekly-digest`, `exit-survey-reminders`, `exit-survey-send-assignment`, `exit-survey-send-test-email`).
- **Settings safety**
  - In Exit Survey -> Settings -> Automation Triggers, verify both toggles are OFF by default.
  - Save schedule values (day/time/timezone and reminder delay hours) and confirm values persist after refresh.
  - Confirm `Alert Threshold`, `Email Notifications`, and `Anonymity Mode` values are set intentionally for go-live.
- **Template quality**
  - For each active trigger template (`low_score_alert`, `weekly_digest`, `alert_reminder`, `survey_assignment`), verify:
    - subject renders variables correctly
    - HTML preview looks correct
    - plain text fallback is readable
  - Use `Send Test Email` from Email Templates and confirm delivery + rendering.
  - Confirm no PHI overexposure in subject lines or non-essential email body fields.
- **Workflow assignment email**
  - Use `Patient Exit Survey Follow-Up` template in Workflows and start a run with a real internal test user.
  - Confirm assignment email is received with the live public `/exit-survey` URL and expected variable values.
- **Public survey behavior**
  - Open the public link from email in an incognito window (no login).
  - Submit a test response and confirm it is saved and visible in Exit Survey Submissions.
  - Confirm scored questions that require comment follow-up show optional free-text prompt as intended.
- **Automation execution**
  - Use Automation `Test` buttons in Settings for weekly digest and reminders.
  - Confirm function logs appear in Supabase for:
    - `exit-survey-scheduler`
    - `exit-survey-weekly-digest`
    - `exit-survey-reminders`
  - Confirm same-day duplicate protection: scheduler should skip re-run with reason once local-date run is recorded.
- **Operational checks**
  - Confirm `RESEND_API_KEY`, `APP_URL`, `EMAIL_FROM`, and optional `EXIT_SURVEY_SCHEDULER_SECRET` are set in Supabase Edge secrets.
  - Confirm alert routing behavior (owner/admin fallback) with at least one real low-score alert.
  - Confirm at least two admin users can access Settings/Workflows (avoid single-operator lockout).
  - Confirm rollback path: disable automation toggles and unschedule cron job if needed.
  - Confirm monitoring/ownership: who checks function failures and where alerts are sent.
  - Document go-live date/time and test evidence links in your release notes.

## 6. Audit Trail Operations (HIPAA Prep)
- **Viewer locations**:
  - Company Console -> `Audit Logs`
  - Direct route: `/app/admin/audit-log`
- **What is logged now for Exit Survey**:
  - Question edits
  - Alert status + assignment + comments
  - Settings saves (single + batch)
  - Email template create/update/delete
  - Test email sends
  - Automation trigger tests
- **How to review quickly**:
  - Filter by action prefix `exit_survey.`
  - Expand a row to inspect metadata payload (changed keys, trigger names, recipients, etc.)
  - Export CSV for compliance review packets.
- **Known gap (tracked in tasks)**:
  - Read-access events (viewing submission detail/PHI screens) are not yet fully logged and remain a Phase 2 item.
