---
paths:
  - "src/pages/app/exit-survey/**"
  - "src/pages/public/ExitSurvey*"
  - "src/hooks/useExitSurvey*"
  - "supabase/functions/exit-survey-*/**"
---

# Exit Survey Rules

- PHI-sensitive module — audit log all submission views and data exports
- Public form (`/exit-survey`) requires no auth; uses token-based access
- Admin dashboard at `/app/exit-survey` has tabs: Overview, Leadership, Advanced Reports, Submissions, Alerts, Preview, Questions, Settings
- Alert system: low-score responses auto-create alerts; assigned users get email via `exit-survey-notify` edge function
- Scheduler cadence is 72 hours; cron stays disabled until go-live
- Historical data (333 submissions) already imported — do not re-run import script
- Architecture decisions in `docs/DECISIONS/0007-exit-survey-architecture.md`
