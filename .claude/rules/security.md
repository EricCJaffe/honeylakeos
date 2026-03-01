---
paths:
  - "supabase/functions/**"
  - "src/lib/auth*"
  - "src/lib/membership*"
  - "src/core/runtime/safety*"
---

# Security & HIPAA Rules

- This is a HIPAA-aware application handling PHI (patient exit survey data)
- All PHI access must generate audit log entries
- Never expose service role keys, integration secrets, or API keys to the client
- Edge functions must validate auth tokens before processing requests
- Cron/scheduler endpoints require shared secret headers (`x-scheduler-secret`)
- Email content defaults to summary-only (no PHI in email bodies unless explicitly toggled)
- RLS enforces data-level access control — UI gating alone is not sufficient
- Reference `docs/HIPAA_COMPLIANCE_BASELINE.md` for compliance requirements
