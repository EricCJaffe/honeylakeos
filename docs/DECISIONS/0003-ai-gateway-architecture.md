# 0003 AI Gateway Architecture

## Date
2026-02-18

## Status
Accepted

## Context
The product needs to offer AI-powered copilot features (workflow generation, template suggestions, insight summaries) across multiple companies, each with their own OpenAI API key. Exposing API keys client-side is a security risk. Keys must also be stored per-company without leaking between tenants.

## Decision
All AI calls are routed through a Supabase edge function (`ai-gateway`) that:
1. Reads the calling company's encrypted OpenAI API key from `company_integrations`.
2. Decrypts the key using a platform-wide `INTEGRATION_SECRET_KEY` (AES-GCM, `enc:v1:` format).
3. Makes the OpenAI API call server-side and streams/returns the result.
4. Logs every call to `ai_usage_logs` for observability and token budget enforcement.

Prompt templates are stored as markdown files (`supabase/functions/ai-gateway/prompts/*.system.md`) so they can be edited without redeploying the function.

OpenAI is the only supported AI provider. Multi-provider support is not planned.

## Consequences
- API keys are never sent to the browser.
- Changing `INTEGRATION_SECRET_KEY` breaks all existing encrypted secrets — treat it as immutable after first use.
- Adding a new AI provider requires changes to `ai-gateway` and a new `integration_providers` row.
- Prompt changes require a function redeploy unless the gateway loads prompts dynamically from storage.

## Links
- `supabase/functions/ai-gateway/index.ts`
- `supabase/functions/_shared/secrets.ts`
- `docs/AI_PHASE1_SETUP.md`
- `docs/AI_PHASE2_SETUP.md`
