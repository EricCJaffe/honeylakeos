# AI Phase 1 Setup

This document describes the AI foundation added in Phase 1.

## Phase 1 execution checklist (must complete)

1. Apply DB migrations including:
   - `supabase/migrations/20260216200000_ai_foundation_phase1.sql`
2. Deploy edge functions:
   - `manage-integration-secret`
   - `ai-gateway`
3. Set edge secrets (Supabase project settings):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `INTEGRATION_SECRET_KEY` (strong random value, 16+ chars)
4. Configure OpenAI integration for each target company:
   - Enable `company_integrations.provider_key = 'openai'`
   - Store `api_key` via `manage-integration-secret`
5. Enable company AI flags in `company_ai_settings`:
   - `ai_enabled = true`
   - feature flags as needed (`workflow_copilot_enabled`, `template_copilot_enabled`, `insights_enabled`)

## What was added

- Supabase migration: `supabase/migrations/20260216200000_ai_foundation_phase1.sql`
- New edge function: `supabase/functions/ai-gateway/index.ts`
- Shared secret crypto utilities: `supabase/functions/_shared/secrets.ts`
- AI prompt markdown templates:
  - `supabase/functions/ai-gateway/prompts/workflow-copilot.system.md`
  - `supabase/functions/ai-gateway/prompts/template-copilot.system.md`
  - `supabase/functions/ai-gateway/prompts/insight-summary.system.md`

## Database objects created

- `company_ai_settings`: per-company AI feature flags + token limits.
- `ai_usage_logs`: token, latency, status, and model logging for observability.
- `ai_document_chunks`: chunk store with `vector(1536)` embedding column for RAG.
- `match_ai_document_chunks(...)`: retrieval helper RPC.
- Provider seed/upgrade for `integration_providers.key = 'openai'`.

## Security changes

- `manage-integration-secret` now stores integration keys with AES-GCM (`enc:v1:` format).
- Legacy stored values are still decryptable during migration to avoid breaking existing data.
- AI calls run server-side only through `ai-gateway`; keys are never sent to the browser.

## Required environment variables

Set these in Supabase edge function secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INTEGRATION_SECRET_KEY` (required, at least 16 chars; use a strong random secret)

## Initial enablement steps per company

1. Ensure `openai` integration exists and `is_enabled = true` in `company_integrations`.
2. Store company `openai` `api_key` via `manage-integration-secret`.
3. Insert or update `company_ai_settings` for the company:
   - `ai_enabled = true`
   - turn on desired features (`workflow_copilot_enabled`, `template_copilot_enabled`, `insights_enabled`)
4. Call `ai-gateway` with `taskType` and compact structured context.

## Request shape for ai-gateway

```json
{
  "companyId": "<uuid>",
  "taskType": "workflow_copilot",
  "userPrompt": "Create an onboarding workflow for a new account executive",
  "context": {
    "allowedStepTypes": ["form_step", "task_step", "notify_step"],
    "requiredModules": ["employees", "tasks"]
  },
  "temperature": 0.2,
  "maxOutputTokens": 800
}
```

## Next phase candidates

- Add embedding ingestion edge function for notes/documents/SOPs.
- Add strict JSON schema validation per `taskType` before returning model output.
- Enforce daily/monthly token budgets in `ai-gateway` using `ai_usage_logs`.
- Add eval fixtures for workflow and template generation quality checks.
