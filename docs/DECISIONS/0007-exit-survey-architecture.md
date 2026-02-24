# 0007 Exit Survey Module Architecture

## Date
2026-02-24

## Status
Accepted

## Context
The product needed a patient exit survey system for Honey Lake Clinic that supports:
- Public-facing survey forms accessible without authentication
- Admin dashboard for reviewing submissions, managing alerts, and analyzing trends
- Automated alert creation for low-score responses
- Email notifications to question owners
- Comment threads on alerts for team collaboration
- Historical data import from legacy systems

## Decision
Implement exit survey as a dual-route module with:
1. **Public route** (`/exit-survey`) — no auth required; token-based patient survey submission
2. **Admin route** (`/app/exit-survey`) — authenticated access with 7-tab dashboard (Overview, Submissions, Alerts, Trends, Questions, Settings, Leadership)
3. **Alert system** — database trigger auto-creates alerts when response score ≤ threshold; `exit-survey-notify` edge function sends Resend email to question owners
4. **Comment threads** — `exit_survey_alert_comments` table with CASCADE delete; accessible from both Alerts tab and Submissions detail sheet
5. **Scheduled jobs** — `exit-survey-weekly-digest` (weekly summaries) and `exit-survey-reminders` (follow-up notifications) require external cron setup
6. **Pre-aggregated trends** — `exit_survey_trends` table stores monthly and rolling average metrics for performance

## Consequences
- Public survey route bypasses authentication; RLS enforces company scoping on all tables
- Alert emails depend on `RESEND_API_KEY` and `APP_URL` edge function secrets
- Scheduled jobs require external cron/scheduler configuration (not built into Supabase)
- Trends table must be manually populated or refreshed via SQL (no automatic trigger)
- Historical import script (`import-exit-survey-history.ts`) is one-time use only

## Links
- `src/pages/exit-survey/PublicSurveyPage.tsx`
- `src/pages/app/exit-survey/ExitSurveyDashboardPage.tsx`
- `src/hooks/useExitSurvey.ts`
- `supabase/functions/exit-survey-notify/`
- `supabase/functions/exit-survey-weekly-digest/`
- `supabase/functions/exit-survey-reminders/`
- `scripts/import-exit-survey-history.ts`
