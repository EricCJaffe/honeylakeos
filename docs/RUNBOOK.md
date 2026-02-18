# Runbook

## Auth or Session Issues
- Symptom: stuck on login or blank app.
- Checks: verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Fix: confirm env vars and Supabase project status.

## Module Access Missing
- Symptom: module nav or pages missing.
- Checks: company module flags and RLS policies.
- Fix: enable module for company and verify RLS allows access.

## Data Not Loading
- Symptom: lists are empty or errors in console.
- Checks: Supabase availability and network requests.
- Fix: check Supabase logs and ensure user membership is active.
