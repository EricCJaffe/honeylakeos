# 0006 Use Resend For Transactional Email

## Date
2026-02-20

## Status
Accepted

## Context
The product sends transactional emails (employee invites and exit survey alerts). The codebase uses Resend SDKs inside edge functions and expects a single provider API key configured as a secret.

## Decision
Standardize transactional email delivery on Resend via Supabase edge functions, using `RESEND_API_KEY` and optional `EMAIL_FROM` for sender configuration.

## Consequences
- Email delivery depends on Resend availability and valid API key configuration.
- Email sender defaults differ by function when `EMAIL_FROM` is not set.
- Operational checks should include Resend key setup and edge function logs.

## Links
- `supabase/functions/send-employee-invite-email/index.ts`
- `supabase/functions/exit-survey-notify/index.ts`
- `docs/ENVIRONMENT.md`
- `docs/INTEGRATIONS.md`
