-- Function to list audit logs with pagination
CREATE OR REPLACE FUNCTION public.list_audit_logs(
  p_company_id UUID,
  p_page_size INTEGER DEFAULT 50,
  p_page INTEGER DEFAULT 1,
  p_entity_type TEXT DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_actor_user_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  actor_user_id UUID,
  actor_email TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered_logs AS (
    SELECT 
      al.id,
      al.action,
      al.entity_type,
      al.entity_id::TEXT,
      al.actor_user_id,
      p.email as actor_email,
      al.metadata::JSONB,
      al.created_at
    FROM audit_logs al
    LEFT JOIN profiles p ON p.user_id = al.actor_user_id
    WHERE al.company_id = p_company_id
      AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
      AND (p_action IS NULL OR al.action ILIKE '%' || p_action || '%')
      AND (p_actor_user_id IS NULL OR al.actor_user_id = p_actor_user_id)
      AND (p_start_date IS NULL OR al.created_at >= p_start_date)
      AND (p_end_date IS NULL OR al.created_at <= p_end_date)
      AND (p_search IS NULL OR al.entity_id::TEXT ILIKE '%' || p_search || '%' OR al.action ILIKE '%' || p_search || '%')
  )
  SELECT 
    fl.*,
    (SELECT COUNT(*) FROM filtered_logs) as total_count
  FROM filtered_logs fl
  ORDER BY fl.created_at DESC
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
$$;
