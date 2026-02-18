# Tasks

## Active
- [ ] Enable leaked password protection in Supabase Auth.
- [ ] Run final smoke test with a real coach account.
- [ ] Confirm module kill-switch behavior for Coaching and Frameworks in production.
- [ ] Send invite to admin email on coaching org creation (`src/hooks/useCoachingData.ts:508`).
- [ ] Filter coaching engagements by manager's assigned coaches (`src/pages/app/coaching/ManagerDashboard.tsx:27`).
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
- [ ] (Empty)

## Conventions
- Keep tasks small and outcome-focused.
- Add links to related ADRs, PRs, or files when helpful.
- Move items to Done instead of deleting.
