---
paths:
  - "supabase/**"
  - "src/integrations/supabase/**"
---

# Supabase Rules

- Project ID: `umsibvxethuebdyjamxi`
- Edge functions handle all privileged server-side operations
- Service role key must NEVER appear in client-side code or `VITE_*` vars
- Integration secrets use AES-GCM encryption (`enc:v1:` prefix) via `manage-integration-secret` function
- AI gateway proxies OpenAI calls server-side — keys never reach the browser
- Shared utilities live in `supabase/functions/_shared/`
- Reference `docs/SUPABASE.md` for schema and function details
