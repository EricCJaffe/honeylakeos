# Tasks

## Active
- [ ] Test the email invite flow in production (edge function is deployed; needs live testing).
- [ ] Customize production email templates for branding.
- [ ] Schedule `exit-survey-weekly-digest` (weekly) and `exit-survey-reminders` (every 48–72 hours) via cron/scheduler.
- [ ] Define department color configuration (per-deployment mapping vs fixed palette) and implement in leadership dashboard.
- [ ] Confirm scheduler details: where cron will run (Supabase scheduled functions vs external) and exact day/time/timezone.
- [ ] Confirm weekly digest recipients: question owners only vs a configured distribution list.
- [ ] Confirm reminder routing: assigned user vs owner/admin fallback for open alerts.
- [ ] Confirm whether department colors are standardized across deployments or configurable per company/department.
- [ ] Run final smoke test with a real coach account.
- [ ] SECURITY/HIPAA: Review low-hanging security hardening options and decide what can be shipped now vs Phase 2.
- [ ] SECURITY/HIPAA: Confirm data classification (PHI/PII scope) and required compliance targets; document in `docs/SECURITY_ADVISOR_NOTES.md` or new compliance doc.

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
- [ ] Build and add the patient exit survey workflow for Honey Lake — new workflow in `/app/workflows`.

## Backlog
- [ ] Stripe payment integration (currently stubbed).
- [ ] Recommendation history view.
- [ ] Framework diff viewer for version comparison.
- [ ] Advanced reporting dashboard.
- [ ] Email notifications for recommendations.
- [ ] Coaching team management page.
- [ ] Framework concept/cadence counts on dashboard.
- [ ] Automated health score snapshots (historical trends).
- [ ] Public framework marketplace.
- [ ] Usage-based billing.
- [ ] Multi-framework support per company.
- [ ] External calendar sync (Google, Outlook).
- [ ] Plaid banking integration.
- [ ] Virus scanning on attachment uploads (`src/hooks/useAttachments.ts:68`).

## Done
- [x] Remove coaching and coaches modules from the codebase (2026-02-18).
- [x] Fix crash when opening Exit Survey → Leadership tab (Trends screen). Error: `Cannot read properties of undefined (reading 'avg')` (2026-02-24).
- [x] Fix data filtering on Leadership tab using PostgREST `!inner` hint for proper date range queries (2026-02-24).
- [x] Add alert and comment functionality to submission detail pages (2026-02-24).
- [x] Redesign alert comments as intuitive thread-style interface with type selection (2026-02-24).
- [x] Enable leaked password protection in Supabase Auth (2026-02-24).
- [x] Decide whether leadership feedback should be stored as structured fields vs comment text - using comment text with type prefixes for flexibility (2026-02-24).

## Conventions
- Keep tasks small and outcome-focused.
- Add links to related ADRs, PRs, or files when helpful.
- Move items to Done instead of deleting.
