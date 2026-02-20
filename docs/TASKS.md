# Tasks

## Active
- [ ] Enable leaked password protection in Supabase Auth.
- [ ] Test the email invite flow in production (edge function is deployed; needs live testing).
- [ ] Customize production email templates for branding.
- [ ] Schedule `exit-survey-weekly-digest` (weekly) and `exit-survey-reminders` (every 48–72 hours) via cron/scheduler.
- [ ] Define department color configuration (per-deployment mapping vs fixed palette) and implement in leadership dashboard.
- [ ] Decide whether leadership feedback should be stored as structured fields (schema) vs. comment text; add migration if structured.
- [ ] Confirm scheduler details: where cron will run (Supabase scheduled functions vs external) and exact day/time/timezone.
- [ ] Confirm weekly digest recipients: question owners only vs a configured distribution list.
- [ ] Confirm reminder routing: assigned user vs owner/admin fallback for open alerts.
- [ ] Confirm whether department colors are standardized across deployments or configurable per company/department.
- [ ] Run final smoke test with a real coach account.
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

## Conventions
- Keep tasks small and outcome-focused.
- Add links to related ADRs, PRs, or files when helpful.
- Move items to Done instead of deleting.
