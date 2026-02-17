-- Phase 2 AI guardrails: token budget helper and stricter runtime controls support.

CREATE OR REPLACE FUNCTION public.company_ai_token_usage(
  p_company_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ DEFAULT now()
)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_total BIGINT;
BEGIN
  IF NOT (
    public.is_company_member(p_company_id)
    OR public.is_site_admin((SELECT c.site_id FROM public.companies c WHERE c.id = p_company_id))
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT COALESCE(SUM(COALESCE(total_tokens, 0)), 0)::BIGINT
  INTO v_total
  FROM public.ai_usage_logs
  WHERE company_id = p_company_id
    AND status = 'success'
    AND created_at >= p_start
    AND created_at < p_end;

  RETURN v_total;
END;
$$;
