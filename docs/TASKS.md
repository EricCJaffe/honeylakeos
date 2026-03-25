# Tasks

## HIPAA Program (Special)
- [x] SECURITY/HIPAA: Review low-hanging security hardening options and define shipped-now vs Phase 2 scope (`docs/HIPAA_COMPLIANCE_BASELINE.md`) (2026-02-27).
- [x] SECURITY/HIPAA: Confirm data classification (PHI/PII scope) and required compliance targets (`docs/HIPAA_COMPLIANCE_BASELINE.md`) (2026-02-27).
- [x] SECURITY/HIPAA: Add audit logging for high-sensitivity read events (exit survey submission detail page: `exit_survey.submission_viewed`) (2026-02-28).
- [x] SECURITY/HIPAA: Add audit trail filters for actor email in audit viewer (2026-02-28).
- [x] SECURITY/HIPAA: Decide retention/deletion policy for survey submissions, alerts, and exports — 90-day archive policy implemented (2026-03-03).
- [ ] SECURITY/HIPAA: Finalize secure email content policy (PHI in emails vs summary-only default) now that PHI-safe email mode toggle is shipped.

## Active
- [ ] Support Tickets: deploy `support-ticket-remediate` edge function and set `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` Supabase secrets.
- [ ] Support Tickets: deploy updated `ai-gateway` with enhanced `support_triage` prompt and test AI triage from admin ticket detail page.
- [ ] Support Tickets: test full AI pipeline end-to-end — submit ticket → open in admin → Run AI Triage → Approve & Generate Fix → verify PR on GitHub.
- [ ] Support Tickets: deploy `support-ticket-notify` edge function and verify email delivery.
- [ ] At go-live cutover, activate production cron for `exit-survey-scheduler` (recommended every 15 minutes with `{ "mode": "all" }`).
- [ ] Exit Survey: validate new `Advanced Reports` tab against real data and confirm KPI definitions with leadership.
- [ ] Define department color configuration (per-deployment mapping vs fixed palette) and implement in leadership dashboard.
- [ ] Choose default recipient policy for go-live (`owner/admin fallback` vs explicit distribution list overrides) and lock settings.
- [ ] Confirm whether department colors are standardized across deployments or configurable per company/department.
- [ ] End-of-cycle testing pass (deferred): run full smoke test + email/render checks + scheduler checks + audit-log checks as one final go-live verification.
- [ ] Pre-go-live: from `/app/admin/employees`, send manual invites to seeded exit-survey owners so they become auth users (do not bulk invite).
- [ ] At go-live cutover, apply/enable SOP reminder cron schedule and verify `cron.job` entry is active.
- [ ] Deploy `exit-survey-retention` and `sop-review-reminders` updates, then run dry-run scans with secret header.

## Discussion (Security / HIPAA / PII)
- [ ] Decide where cron runs (Supabase Scheduled Functions vs external) and confirm logging/monitoring for scheduled jobs.
- [ ] Confirm whether audit logging coverage is sufficient for PHI access (which tables/actions require audit entries).
- [ ] Decide on encryption scope at rest and in transit for PHI (Supabase storage, backups, and exports).
- [ ] Decide on access controls for exit survey detail pages (role-based view restrictions).
- [ ] Decide whether to mask/anonymize patient names by default in admin UI.
- [ ] Decide whether to add access logging to exit survey views (app-level logging).
- [ ] Decide whether to enforce SSO-only login and disable password login for orgs.
- [ ] Decide on MFA requirement for admins and supervisors.
- [ ] Decide on IP allowlists / network restrictions for admin actions.
- [ ] Decide on secure email content policy (PHI in emails vs summary-only).

## Phase 2 (Security / HIPAA)
- [ ] Implement field-level encryption for patient identifiers if required.
- [ ] Implement access review workflow (periodic user access certification).
- [ ] Enable `sop-review-reminders` cron schedule at go-live after dry-run validation.
- [ ] Test login to Honey Lake as a company — verify auth and app load work end-to-end.
- [ ] Set the modules Honey Lake will be using — configure feature flags in `feature_flags` table for their company.

## Manual Testing / Review (post-implementation)
- [ ] REVIEW: Dashboard framework widget — confirm concept/cadence counts display correctly for the adopted framework on `/app` dashboard.
- [ ] REVIEW: Dashboard quick stats — verify "Active Projects" and "Pending Tasks" counts reflect real data (no longer hardcoded).
- [ ] REVIEW: Data retention automation — set retention mode to `archive_only` in Exit Survey Settings, run a dry-run scan, then test apply with `{ "dry_run": false, "apply": true }` and confirm records get `archived_at` timestamps.
- [ ] REVIEW: Archived records hidden — after archiving, confirm archived submissions and alerts no longer appear in the Submissions and Alerts tabs.
- [ ] REVIEW: Virus scanning on attachment uploads (`src/hooks/useAttachments.ts:68`) — requires more sophisticated implementation; deferred to future sprint.

## Backlog
- [ ] Advanced reporting dashboard.
- [ ] Virus scanning on attachment uploads (`src/hooks/useAttachments.ts:68`).

## Done
- [x] Support Tickets: AI Triage + Remediation — admin ticket detail now has "Run AI Triage" (classifies severity, identifies affected code, suggests fix) and "Approve & Generate Fix" (reads GitHub files, generates code changes, creates PR). New edge function `support-ticket-remediate`, new hooks `useTicketAI`, new components `AITriageCard`/`RemediationCard`, smart polling while AI works, admin sidebar controls for status/priority (2026-03-25).
- [x] Support Tickets: replace two-step submit form with single-page layout; add Ticket Dashboard nav link for admins (2026-03-25).
- [x] Support Tickets: fix submit bug — `useSiteId()` now waits for membership loading, event inserts are fire-and-forget to prevent blocking, inline error banner on review step (2026-03-25).
- [x] Support Tickets: update TypeScript types to include AI triage/remediation columns matching production DB schema (2026-03-25).
- [x] Support Tickets: wire AI suggestions to `ai-gateway` edge function with `support_triage` task type; graceful fallback to static suggestions if AI not configured (2026-03-25).
- [x] Support Tickets: create `support-ticket-notify` edge function for email notifications on ticket_created, status_changed, ticket_assigned, message_added events (2026-03-25).
- [x] Support Tickets: add notification calls in `useSupportCenter` hooks for all ticket lifecycle events (fire-and-forget pattern) (2026-03-25).
- [x] Fix: added missing `archived_at` columns to `exit_survey_submissions` and `exit_survey_alerts` tables in production DB — deployed code filtered on these columns but migration was never applied, causing all submission/alert queries to fail silently (2026-03-05).
- [x] Synced local `main` branch with `origin/main` — local was behind by 20 commits (2026-03-05).
- [x] Remove Recommendations page and sidebar nav item — coaching is not active on this site (2026-03-05).
- [x] Optimize CLAUDE.md for token efficiency (2026-03-05).
- [x] Data retention automation: upgraded `exit-survey-retention` from scaffold to working archive-only mode with 90-day default; added `archived_at` columns to submissions/alerts; UI queries filter out archived records (2026-03-03).
- [x] Recommendation history view: new page at `/app/recommendations` with filtering, accept/decline flow, and summary cards (2026-03-03). *Later removed — coaching not active.*
- [x] Email notifications for recommendations: new `recommendation-notify` edge function (2026-03-03). *Later removed — coaching not active.*
- [x] Framework concept/cadence counts on dashboard: `FrameworkSummaryWidget` on main dashboard (2026-03-03).
- [x] Dashboard quick stats now use real data (project count + task count) instead of hardcoded values (2026-03-03).
- [x] Cron jobs configured in Supabase; kept disabled until go-live (2026-03-02).
- [x] Retention scaffold: add retention policy settings + `exit-survey-retention` dry-run function integration (2026-02-28).
- [x] SOP reminder hardening: add scheduler-secret support + dry-run mode in `sop-review-reminders` function (2026-02-28).
- [x] Hard-delete sweep: removed remaining legacy module references from onboarding, templates, plan usage, and capability labels (2026-02-28).
- [x] Exit Survey Settings: add collapsible Email Template Manager with rich HTML editing, variable detection, preview, and test send controls (2026-02-28).
- [x] Exit Survey Settings: add Automation Trigger Rules controls (per-trigger on/off, schedule fields, dry-run/test buttons) (2026-02-28).
- [x] Exit Survey UI: add PHI-safe mode badges and name masking/reveal controls across Submissions, Alerts, and Leadership tabs (2026-02-28).
- [x] Audit Viewer: add saved filter presets + metadata-enriched CSV export headers (2026-02-28).
- [x] Employees (Company Console): add role/phone fields and active-row invite UX (`Resend Invite`, `Copy Invite Link`, `Reset Password`) (2026-02-28).
- [x] Company Console: add `Security` tab with minimum security baseline panel (2026-02-28).
- [x] SECURITY/HIPAA: Add PHI-safe email mode setting and enforce redaction in exit-survey email functions (2026-02-28).
- [x] Add branding to customer-facing public patient exit survey form (`/exit-survey`) (2026-02-27).
- [x] Upgrade admin audit log views to the paginated `AuditLogViewer` (2026-02-27).
- [x] Add exit-survey audit events for settings/template changes, assignment actions, and test trigger runs (2026-02-27).
- [x] Add audit action-prefix presets in audit viewer (2026-02-27).
- [x] Build and add the patient exit survey workflow for Honey Lake (2026-02-27).
- [x] Implement `exit-survey-scheduler` dispatcher and set reminder cadence to 72 hours (2026-02-27).
- [x] Wire scheduler to Exit Survey Settings automation controls (2026-02-27).
- [x] Add AI-assisted editing for exit survey email templates (2026-02-27).
- [x] Customize exit survey email templates for branding (2026-02-27).
- [x] Exit Survey: add initial `Advanced Reports` tab (2026-02-27).
- [x] Fix crash when opening Exit Survey Leadership tab (2026-02-24).
- [x] Fix data filtering on Leadership tab using PostgREST `!inner` hint (2026-02-24).
- [x] Add alert and comment functionality to submission detail pages (2026-02-24).
- [x] Redesign alert comments as intuitive thread-style interface (2026-02-24).
- [x] Enable leaked password protection in Supabase Auth (2026-02-24).
- [x] Test the email invite flow in production with Resend integration (2026-02-24).
- [x] De-scoped: Stripe payment integration, automated health score snapshots, public framework marketplace, usage-based billing, multi-framework support, external calendar sync, Plaid banking integration, framework diff viewer (2026-02-27).
- [x] Remove coaching and coaches modules from the codebase (2026-02-18).

## Conventions
- Keep tasks small and outcome-focused.
- Add links to related ADRs, PRs, or files when helpful.
- Move items to Done instead of deleting.
