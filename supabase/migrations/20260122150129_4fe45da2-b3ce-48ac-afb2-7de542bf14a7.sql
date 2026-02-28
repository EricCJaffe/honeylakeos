-- ============================================================
-- PROMPT 12: DATA INTEGRITY CONSTRAINTS + INDEXES (Fixed v2)
-- ============================================================

-- A) Additional indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tasks_coaching_engagement 
ON public.tasks(company_id, coaching_engagement_id) 
WHERE coaching_engagement_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_coaching_engagement 
ON public.projects(company_id, coaching_engagement_id) 
WHERE coaching_engagement_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_coaching_engagement 
ON public.notes(company_id, coaching_engagement_id) 
WHERE coaching_engagement_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coaching_workflow_assignments_next_run 
ON public.coaching_workflow_assignments(next_run_at, status) 
WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_health_check_responses_check_question 
ON public.coaching_health_check_responses(coaching_health_check_id, template_question_id);
-- B) Unique constraint on workflow runs (correct column name)
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_coaching_workflow_runs_period 
ON public.coaching_workflow_runs(coaching_workflow_assignment_id, run_for_period_start);
-- C) Create coaching-specific audit view
-- ============================================================

CREATE OR REPLACE VIEW public.v_coaching_audit_events AS
SELECT 
  al.id,
  al.actor_user_id,
  p.full_name as actor_name,
  al.company_id,
  c.name as company_name,
  al.action,
  al.entity_type,
  al.entity_id,
  al.metadata,
  al.created_at,
  coe.coaching_org_id,
  corg.name as coaching_org_name
FROM audit_logs al
LEFT JOIN profiles p ON p.user_id = al.actor_user_id
LEFT JOIN companies c ON c.id = al.company_id
LEFT JOIN coaching_org_engagements coe ON coe.member_company_id = al.company_id AND coe.status = 'active'
LEFT JOIN companies corg ON corg.id = coe.coaching_org_id
WHERE al.action LIKE 'coaching.%'
   OR al.action LIKE 'access_grant.%'
   OR al.action LIKE 'engagement.%'
   OR al.entity_type IN ('coaching_engagement', 'access_grant', 'coaching_workflow', 'coaching_health_check')
ORDER BY al.created_at DESC;
-- D) Validation trigger for workflow runs
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_validate_workflow_run_engagement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_engagement_status text;
BEGIN
  SELECT coe.status INTO v_engagement_status
  FROM coaching_workflow_assignments cwa
  JOIN coaching_org_engagements coe ON coe.id = cwa.engagement_id
  WHERE cwa.id = NEW.coaching_workflow_assignment_id;
  
  IF v_engagement_status IS NOT NULL AND v_engagement_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'Cannot create workflow run for engagement with status: %', v_engagement_status;
  END IF;
  
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_workflow_run_engagement ON public.coaching_workflow_runs;
CREATE TRIGGER trg_validate_workflow_run_engagement
BEFORE INSERT ON public.coaching_workflow_runs
FOR EACH ROW
EXECUTE FUNCTION public.fn_validate_workflow_run_engagement();
