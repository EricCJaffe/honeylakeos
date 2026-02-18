# Runbook

## 1. Auth or Session Issues
- **Symptom**: stuck on login screen, blank app, or infinite spinner.
- **Checks**:
  - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set correctly in Vercel env.
  - Check Supabase project status at `https://app.supabase.com`.
  - Auth has an 8-second failsafe — if it fires, the user lands on a logged-out state without an error. Check browser console for `supabase.auth.getSession failed`.
- **Fix**: correct env vars and redeploy, or restore Supabase project if paused.

## 2. Module Access Missing
- **Symptom**: module nav items or pages are absent or show "Module Disabled".
- **Checks**:
  - Check `feature_flags` table for the company — a row with `enabled = false` disables the module.
  - Check RLS policies in Supabase if data is also inaccessible.
  - If flags fail to load (network error), the system enters safe mode: only core modules show.
- **Fix**: insert or update the flag row in `feature_flags`; verify RLS allows the membership role.

## 3. Data Not Loading
- **Symptom**: lists are empty, console shows Supabase errors, or queries return 0 rows unexpectedly.
- **Checks**:
  - Open browser DevTools → Network; look for Supabase REST/realtime errors (401, 403, 500).
  - Confirm the user has an active membership for the active company (`memberships` table, `status = active`).
  - Verify `profiles.active_company_id` is set for the user.
- **Fix**: ensure membership is active; check RLS policies; check Supabase logs under `Logs → API`.

## 4. AI Gateway Errors
- **Symptom**: AI copilot features fail silently or return errors; `/admin/ai-smoke` shows failures.
- **Checks**:
  - Verify `INTEGRATION_SECRET_KEY` is set in Supabase edge function secrets.
  - Check `company_integrations` has an `openai` row with `is_enabled = true` for the company.
  - Check `company_ai_settings` has `ai_enabled = true`.
  - Run the AI smoke test: `/app/admin/ai-smoke` or `/ai-smoke`.
  - Check edge function logs: Supabase dashboard → `Logs → Edge Functions → ai-gateway`.
- **Fix**: re-store the API key via `manage-integration-secret`; confirm `INTEGRATION_SECRET_KEY` has not changed since the key was stored (changing it breaks existing encrypted secrets).
