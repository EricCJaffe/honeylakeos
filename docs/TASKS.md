# Tasks

## HIPAA Program (Special)
- [x] SECURITY/HIPAA: Review low-hanging security hardening options and define shipped-now vs Phase 2 scope (`docs/HIPAA_COMPLIANCE_BASELINE.md`) (2026-02-27).
- [x] SECURITY/HIPAA: Confirm data classification (PHI/PII scope) and required compliance targets (`docs/HIPAA_COMPLIANCE_BASELINE.md`) (2026-02-27).
- [ ] SECURITY/HIPAA: Add audit logging for high-sensitivity read events (submission detail view, patient profile lookups) after retention policy decision.
- [ ] SECURITY/HIPAA: Add audit trail filters for actor email in audit viewer.
- [ ] SECURITY/HIPAA: Decide retention/deletion policy for survey submissions, alerts, and exports.
- [ ] SECURITY/HIPAA: Decide secure email content policy (PHI in emails vs summary-only).

## Active
- [ ] Activate production cron for `exit-survey-scheduler` (recommended every 15 minutes with `{ "mode": "all" }`).
- [ ] Define department color configuration (per-deployment mapping vs fixed palette) and implement in leadership dashboard.
- [ ] Confirm weekly digest recipients: question owners only vs a configured distribution list.
- [ ] Confirm reminder routing: assigned user vs owner/admin fallback for open alerts.
- [ ] Confirm whether department colors are standardized across deployments or configurable per company/department.
- [ ] Run final smoke test with a real coach account.
- [ ] Pre-go-live: from `/app/admin/employees`, send manual invites to seeded exit-survey owners so they become auth users (do not bulk invite).

## Discussion (Security / HIPAA / PII)
- [ ] Decide where cron runs (Supabase Scheduled Functions vs external) and confirm logging/monitoring for scheduled jobs.
- [ ] Confirm whether audit logging coverage is sufficient for PHI access (which tables/actions require audit entries).
- [ ] Decide on data retention and deletion policies for survey submissions and alerts.
- [ ] Decide on encryption scope at rest and in transit for PHI (Supabase storage, backups, and exports).
- [ ] Decide on access controls for exit survey detail pages (role-based view restrictions).
- [ ] Decide whether to mask/anonymize patient names by default in admin UI.
- [ ] Decide whether to add access logging to exit survey views (app-level logging).
- [ ] Decide whether to enforce SSO-only login and disable password login for orgs.
- [ ] Decide on MFA requirement for admins and supervisors.
- [ ] Decide on IP allowlists / network restrictions for admin actions.
- [ ] Decide on secure email content policy (PHI in emails vs summary-only).

## Phase 2 (Security / HIPAA)
- [ ] Implement audit logging for exit survey reads (view events) if required.
- [ ] Implement data retention automation (auto-archive / purge by policy).
- [ ] Implement field-level encryption for patient identifiers if required.
- [ ] Implement access review workflow (periodic user access certification).
- [ ] Set up `sop-review-reminders` on a cron schedule (not yet documented or wired).
- [ ] Test login to Honey Lake as a company — verify auth and app load work end-to-end.
- [ ] Set the modules Honey Lake will be using — configure feature flags in `feature_flags` table for their company.

## Backlog
- [ ] Recommendation history view.
- [ ] Framework diff viewer for version comparison.
- [ ] Advanced reporting dashboard.
- [ ] Email notifications for recommendations.
- [ ] Framework concept/cadence counts on dashboard.
- [ ] Virus scanning on attachment uploads (`src/hooks/useAttachments.ts:68`).

## Done
- [x] Add branding to customer-facing public patient exit survey form (`/exit-survey`) including logo, typography, colors, and footer treatment (2026-02-27).
- [x] Upgrade admin audit log views to the paginated `AuditLogViewer` in Company Console + `/app/admin/audit-log` (2026-02-27).
- [x] Add exit-survey audit events for settings/template changes, assignment actions, and test trigger runs (2026-02-27).
- [x] Add audit action-prefix presets in audit viewer (`exit_survey.*`, `employee.*`, `integration.*`) (2026-02-27).
- [x] 2026-02-28 reminder complete: copied `docs/WORKFLOW_2_COMPUTERS.md` baseline process for reuse across projects (2026-02-27).
- [x] Build and add the patient exit survey workflow for Honey Lake in `/app/workflows` with assignment-email trigger support (2026-02-27).
- [x] Implement `exit-survey-scheduler` dispatcher and set reminder cadence to 72 hours (2026-02-27).
- [x] Wire scheduler to Exit Survey Settings automation controls (enable toggles, day/time/timezone, once-per-day local-date guard) (2026-02-27).
- [x] Add AI-assisted editing for exit survey email templates (plain-language prompt -> updated subject/body draft) (2026-02-27).
- [x] Remove coaching and coaches modules from the codebase (2026-02-18).
- [x] Fix crash when opening Exit Survey → Leadership tab (Trends screen). Error: `Cannot read properties of undefined (reading 'avg')` (2026-02-24).
- [x] Fix data filtering on Leadership tab using PostgREST `!inner` hint for proper date range queries (2026-02-24).
- [x] Add alert and comment functionality to submission detail pages (2026-02-24).
- [x] Redesign alert comments as intuitive thread-style interface with type selection (2026-02-24).
- [x] Enable leaked password protection in Supabase Auth (2026-02-24).
- [x] Decide whether leadership feedback should be stored as structured fields vs comment text - using comment text with type prefixes for flexibility (2026-02-24).
- [x] Test the email invite flow in production with Resend integration (2026-02-24).
- [x] Customize exit survey email templates for branding with per-trigger HTML/text variables editable in Settings (2026-02-27).
- [x] De-scoped: Stripe payment integration (not needed) (2026-02-27).
- [x] De-scoped: Coaching team management page (not needed) (2026-02-27).
- [x] De-scoped: Automated health score snapshots (not needed) (2026-02-27).
- [x] De-scoped: Public framework marketplace (not needed) (2026-02-27).
- [x] De-scoped: Usage-based billing (not needed) (2026-02-27).
- [x] De-scoped: Multi-framework support per company (not needed) (2026-02-27).
- [x] De-scoped: External calendar sync (Google, Outlook) (not needed) (2026-02-27).
- [x] De-scoped: Plaid banking integration (not needed) (2026-02-27).

## Conventions
- Keep tasks small and outcome-focused.
- Add links to related ADRs, PRs, or files when helpful.
- Move items to Done instead of deleting.
