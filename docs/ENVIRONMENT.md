# Environment

There are two separate sets of env vars: **Vite build-time vars** (client app) and **Supabase edge function secrets** (server-side). Keep them separate.

---

## Vite Build-Time Variables (client app)

Set in `.env` (local) or Vercel project environment settings.

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://<project>.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key (JWT). Non-standard name; equivalent to the Supabase anon key. |
| `VITE_SUPABASE_PROJECT_ID` | No | Project ref ID; used by health/admin diagnostics pages. |

**Note**: Never put service role keys or integration secrets in `VITE_*` variables — they are bundled into the client JS.

---

## Supabase Edge Function Secrets

Set in the Supabase dashboard under **Project Settings → Edge Functions → Secrets**.

| Secret | Required | Used By | Description |
|---|---|---|---|
| `SUPABASE_URL` | Yes | All functions | Injected automatically by Supabase runtime. |
| `SUPABASE_ANON_KEY` | Yes | `ai-gateway`, `ai-embed-content` | Injected automatically by Supabase runtime. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Most functions | Full DB access; required for admin operations. |
| `INTEGRATION_SECRET_KEY` | Yes | `_shared/secrets.ts`, `manage-integration-secret` | AES-GCM key for encrypting integration API keys. Must be 16+ chars. Rotate with care — changing it breaks existing encrypted secrets. |
| `RESEND_API_KEY` | Yes | `send-employee-invite-email` | Resend transactional email API key. |
| `APP_URL` | No | `send-employee-invite-email` | Base URL for links in emails (e.g. `https://app.honeylakeos.com`). |
| `EMAIL_FROM` | No | `send-employee-invite-email` | Sender address. Defaults to `BusinessOS <onboarding@resend.dev>`. |

---

## Local Setup Notes
- Vite reads `VITE_*` variables at build time from `.env` or `.env.local`.
- Do not commit `.env` to git — it is already in `.gitignore`.
- Edge function secrets are not needed locally unless running `supabase functions serve`.
