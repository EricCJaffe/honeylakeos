-- Phase 1 AI foundation: feature flags, usage logs, vector-ready chunk store, and provider seed.

-- Ensure vector extension is available for embeddings.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
-- Seed OpenAI as an integration provider (company-level by default).
INSERT INTO public.integration_providers (key, name, description, scope_supported, is_enabled_platform_wide)
VALUES (
  'openai',
  'OpenAI',
  'LLM and embedding provider used for workflow copilot, templates, and insights.',
  'company',
  true
)
ON CONFLICT (key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  scope_supported = EXCLUDED.scope_supported,
  is_enabled_platform_wide = EXCLUDED.is_enabled_platform_wide;
-- Company-level AI feature and budget controls.
CREATE TABLE IF NOT EXISTS public.company_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ai_enabled BOOLEAN NOT NULL DEFAULT false,
  insights_enabled BOOLEAN NOT NULL DEFAULT false,
  workflow_copilot_enabled BOOLEAN NOT NULL DEFAULT false,
  template_copilot_enabled BOOLEAN NOT NULL DEFAULT false,
  daily_token_budget INTEGER NOT NULL DEFAULT 150000,
  monthly_token_budget INTEGER NOT NULL DEFAULT 3000000,
  max_prompt_tokens INTEGER NOT NULL DEFAULT 6000,
  max_completion_tokens INTEGER NOT NULL DEFAULT 1200,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id),
  CONSTRAINT company_ai_settings_token_limits CHECK (
    daily_token_budget > 0
    AND monthly_token_budget >= daily_token_budget
    AND max_prompt_tokens BETWEEN 256 AND 32000
    AND max_completion_tokens BETWEEN 64 AND 32000
  )
);
ALTER TABLE public.company_ai_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can read AI settings" ON public.company_ai_settings;
CREATE POLICY "Company members can read AI settings"
ON public.company_ai_settings
FOR SELECT
USING (
  public.is_company_member(company_id)
  OR public.is_site_admin((SELECT c.site_id FROM public.companies c WHERE c.id = company_ai_settings.company_id))
);
DROP POLICY IF EXISTS "Company admins can manage AI settings" ON public.company_ai_settings;
CREATE POLICY "Company admins can manage AI settings"
ON public.company_ai_settings
FOR ALL
USING (
  public.is_company_admin(company_id)
  OR public.is_site_admin((SELECT c.site_id FROM public.companies c WHERE c.id = company_ai_settings.company_id))
)
WITH CHECK (
  public.is_company_admin(company_id)
  OR public.is_site_admin((SELECT c.site_id FROM public.companies c WHERE c.id = company_ai_settings.company_id))
);
DROP TRIGGER IF EXISTS update_company_ai_settings_updated_at ON public.company_ai_settings;
CREATE TRIGGER update_company_ai_settings_updated_at
  BEFORE UPDATE ON public.company_ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_company_ai_settings_company_id ON public.company_ai_settings(company_id);
-- Usage and spend observability for AI calls.
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_key TEXT NOT NULL DEFAULT 'openai',
  feature_key TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  latency_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'blocked')),
  error_code TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_usage_logs_token_nonnegative CHECK (
    (prompt_tokens IS NULL OR prompt_tokens >= 0)
    AND (completion_tokens IS NULL OR completion_tokens >= 0)
    AND (total_tokens IS NULL OR total_tokens >= 0)
  )
);
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can read AI usage logs" ON public.ai_usage_logs;
CREATE POLICY "Company members can read AI usage logs"
ON public.ai_usage_logs
FOR SELECT
USING (
  public.is_company_member(company_id)
  OR public.is_site_admin((SELECT c.site_id FROM public.companies c WHERE c.id = ai_usage_logs.company_id))
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_company_created ON public.ai_usage_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_company_feature_created ON public.ai_usage_logs(company_id, feature_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_company_status_created ON public.ai_usage_logs(company_id, status, created_at DESC);
-- Vector-ready chunk storage for RAG over notes/documents/SOPs.
CREATE TABLE IF NOT EXISTS public.ai_document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  source_version TEXT,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding extensions.vector(1536),
  embedding_model TEXT,
  embedded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, source_table, source_id, chunk_index)
);
ALTER TABLE public.ai_document_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can read AI document chunks" ON public.ai_document_chunks;
CREATE POLICY "Company members can read AI document chunks"
ON public.ai_document_chunks
FOR SELECT
USING (
  public.is_company_member(company_id)
  OR public.is_site_admin((SELECT c.site_id FROM public.companies c WHERE c.id = ai_document_chunks.company_id))
);
DROP POLICY IF EXISTS "Company admins can manage AI document chunks" ON public.ai_document_chunks;
CREATE POLICY "Company admins can manage AI document chunks"
ON public.ai_document_chunks
FOR ALL
USING (
  public.is_company_admin(company_id)
  OR public.is_site_admin((SELECT c.site_id FROM public.companies c WHERE c.id = ai_document_chunks.company_id))
)
WITH CHECK (
  public.is_company_admin(company_id)
  OR public.is_site_admin((SELECT c.site_id FROM public.companies c WHERE c.id = ai_document_chunks.company_id))
);
DROP TRIGGER IF EXISTS update_ai_document_chunks_updated_at ON public.ai_document_chunks;
CREATE TRIGGER update_ai_document_chunks_updated_at
  BEFORE UPDATE ON public.ai_document_chunks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_ai_document_chunks_company_source
  ON public.ai_document_chunks(company_id, source_table, source_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_ai_document_chunks_company_embedded
  ON public.ai_document_chunks(company_id, embedded_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_document_chunks_embedding
  ON public.ai_document_chunks
  USING ivfflat (embedding extensions.vector_cosine_ops)
  WITH (lists = 100);
-- RAG retrieval helper.
CREATE OR REPLACE FUNCTION public.match_ai_document_chunks(
  p_company_id UUID,
  p_query_embedding extensions.vector(1536),
  p_match_count INTEGER DEFAULT 8,
  p_source_tables TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_table TEXT,
  source_id UUID,
  content TEXT,
  metadata JSONB,
  similarity DOUBLE PRECISION
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT
    c.id,
    c.source_table,
    c.source_id,
    c.content,
    c.metadata,
    1 - (c.embedding <=> p_query_embedding) AS similarity
  FROM public.ai_document_chunks c
  WHERE c.company_id = p_company_id
    AND c.embedding IS NOT NULL
    AND (
      public.is_company_member(p_company_id)
      OR public.is_site_admin((SELECT site_id FROM public.companies WHERE id = p_company_id))
    )
    AND (p_source_tables IS NULL OR c.source_table = ANY(p_source_tables))
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT LEAST(GREATEST(p_match_count, 1), 20);
$$;
