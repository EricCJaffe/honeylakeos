# AI Phase 2 Setup

This document describes Phase 2 hardening: budget enforcement, output schema validation, and embedding ingestion.

## What was added

- Migration:
  - `supabase/migrations/20260216213000_ai_phase2_guardrails.sql`
- Updated AI gateway:
  - `supabase/functions/ai-gateway/index.ts`
- New embedding ingestion function:
  - `supabase/functions/ai-embed-content/index.ts`
- Supabase function config updated:
  - `supabase/config.toml`

## Phase 2 capabilities

1. Token budget enforcement in `ai-gateway`
- Blocks requests before model call when projected tokens exceed:
  - `company_ai_settings.daily_token_budget`
  - `company_ai_settings.monthly_token_budget`
- Logs blocked requests to `ai_usage_logs` with:
  - `error_code = daily_token_budget_exceeded` or `monthly_token_budget_exceeded`

2. Strict output schema validation in `ai-gateway`
- Validates JSON output structure by task type:
  - `workflow_copilot`
  - `template_copilot`
  - `insight_summary`
- Returns `502` if output is invalid and logs:
  - `error_code = invalid_output_schema`

3. Embedding ingestion function (`ai-embed-content`)
- Input: list of source records with content.
- Chunks content, requests OpenAI embeddings, upserts into `ai_document_chunks`.
- Applies same daily/monthly budget checks before embedding calls.
- Logs usage into `ai_usage_logs` with `feature_key = embedding_ingestion`.

## Request shape for ai-embed-content

```json
{
  "companyId": "<uuid>",
  "sources": [
    {
      "sourceTable": "documents",
      "sourceId": "<uuid>",
      "sourceVersion": "v1",
      "content": "Long document text here...",
      "metadata": { "title": "Employee Handbook" },
      "replaceExisting": true
    }
  ],
  "embeddingModel": "text-embedding-3-small",
  "chunkSizeChars": 1200,
  "chunkOverlapChars": 200
}
```

## Deploy steps

1. Apply migration:
- `supabase/migrations/20260216213000_ai_phase2_guardrails.sql`

2. Deploy edge functions:
- `ai-gateway`
- `ai-embed-content`

3. Validate end-to-end:
- Call `ai-gateway` for one enabled feature and confirm `outputJson` is returned.
- Call `ai-embed-content` for one document and confirm rows in `ai_document_chunks`.
- Verify logs in `ai_usage_logs` for success/blocked/error records.

## Notes

- `ai-embed-content` assumes `sourceId` is a UUID because `ai_document_chunks.source_id` is UUID.
- If ingestion for non-UUID entities is needed later, we should add a separate text key column or a mapping table.
