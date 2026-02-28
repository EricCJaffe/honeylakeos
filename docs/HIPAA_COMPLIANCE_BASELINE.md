# HIPAA Compliance Baseline (Operational Draft)

Last updated: 2026-02-27  
Scope: Honey Lake deployment of BusinessOS Exit Survey + employee/admin workflows.

This is an operational baseline for engineering and go-live readiness. Final legal/compliance interpretation still requires counsel and BAA review.

## 1) Compliance Targets
- HIPAA Security Rule administrative, physical, and technical safeguards (primary target).
- HIPAA Privacy Rule minimum-necessary handling for patient-identifiable data.
- Breach response readiness with auditability and incident logs.

## 2) Data Classification (Current)
- `PHI`:
  - Patient first/last name in exit survey submissions.
  - Patient free-text responses and comments that may include health details.
  - Low-score alerts tied to patient submissions.
- `PII`:
  - Employee names, titles, emails, phone (if captured).
  - User profile and auth-linked identity data.
- `Operational / Non-sensitive`:
  - Module flags, template metadata, non-patient configuration values.

## 3) System Boundary (Current Architecture)
- Application frontend: Vercel-hosted SPA.
- Data/auth/functions: Supabase project (Postgres + Auth + Edge Functions).
- Email delivery: Resend via edge functions.
- Public patient form endpoint: `/exit-survey` (no login).

## 4) Hardening Review (Low-Hanging Actions)
- `Done`
  - RLS + company scoping on primary business data paths.
  - Exit survey admin actions now produce audit events (settings/templates/tests/alerts/question edits).
  - Dedicated admin audit viewer in Company Console and `/app/admin/audit-log`.
  - Scheduler secret support for `exit-survey-scheduler` (`x-scheduler-secret`).
  - Leaked password protection previously enabled and verified.
- `In progress / To decide`
  - Add audit logging for high-sensitivity read events (submission detail view access logs).
  - Decide retention/deletion policy for submissions/alerts and exported data.
  - Decide PHI policy for email content (summary-only vs richer content).
  - Decide if admin-level MFA and SSO-only login are required for go-live.

## 5) Shipped vs Phase 2 Plan
- `Shipped now`
  - Change-event audit coverage for most exit-survey admin mutations.
  - Audit viewer with filtering/export for operator review.
  - Public survey submission path with persisted records and alerting.
- `Phase 2`
  - Read-access audit coverage for PHI screens.
  - Formal retention automation (archive/purge).
  - Optional field-level encryption for patient identifiers where required by policy.
  - Access review/certification workflow for privileged roles.

## 6) Required Go-Live Compliance Checks
- Verify active BAA coverage for hosting/subprocessors used in production.
- Confirm encryption in transit and at rest across Supabase + backup path.
- Confirm least-privilege access model for company admins/site admins.
- Confirm incident response owner and breach triage path.
- Confirm operational runbook for restoring service and preserving evidence.

## 7) Owner + Review Cadence
- Owner: Platform admin + engineering lead.
- Review cadence: monthly during rollout, quarterly after stabilization.

