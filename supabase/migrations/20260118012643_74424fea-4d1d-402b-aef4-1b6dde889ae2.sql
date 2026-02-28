-- Create coach_organizations table for linking coach companies to client companies
CREATE TABLE IF NOT EXISTS public.coach_organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  relationship_type text NOT NULL DEFAULT 'coach' CHECK (relationship_type IN ('coach', 'advisor')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coach_company_id, client_company_id)
);
-- Extend reports visibility constraint to include coach_shared
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_visibility_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_visibility_check 
  CHECK (visibility IN ('personal', 'company_shared', 'company_restricted', 'coach_shared'));
-- Enable RLS
ALTER TABLE public.coach_organizations ENABLE ROW LEVEL SECURITY;
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_coach_organizations_coach ON public.coach_organizations(coach_company_id);
CREATE INDEX IF NOT EXISTS idx_coach_organizations_client ON public.coach_organizations(client_company_id);
CREATE INDEX IF NOT EXISTS idx_coach_organizations_status ON public.coach_organizations(status);
-- RLS: Company admins of the client company can manage coach relationships
CREATE POLICY "Client admins can manage coach relationships"
ON public.coach_organizations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = coach_organizations.client_company_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND m.role = 'company_admin'
  )
);
-- RLS: Coach company members can view their coach relationships
CREATE POLICY "Coach company members can view relationships"
ON public.coach_organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = coach_organizations.coach_company_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
  )
);
-- Create a security definer function to check coach access
CREATE OR REPLACE FUNCTION public.has_coach_access(
  _user_id uuid,
  _client_company_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coach_organizations co
    JOIN public.memberships m ON m.company_id = co.coach_company_id
    WHERE co.client_company_id = _client_company_id
    AND co.status = 'active'
    AND m.user_id = _user_id
    AND m.status = 'active'
  )
$$;
-- Create a function to get coach client metrics (aggregate only, no PII)
CREATE OR REPLACE FUNCTION public.get_coach_client_metrics(_client_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  today date := current_date;
BEGIN
  -- Only allow if caller has coach access
  IF NOT has_coach_access(auth.uid(), _client_company_id) THEN
    RETURN jsonb_build_object('error', 'Access denied');
  END IF;

  SELECT jsonb_build_object(
    'tasks_overdue', (
      SELECT COUNT(*)::int FROM tasks
      WHERE company_id = _client_company_id
      AND is_recurring_template = false
      AND status NOT IN ('completed', 'archived')
      AND due_date IS NOT NULL
      AND due_date < today
    ),
    'tasks_due_soon', (
      SELECT COUNT(*)::int FROM tasks
      WHERE company_id = _client_company_id
      AND is_recurring_template = false
      AND status NOT IN ('completed', 'archived')
      AND due_date IS NOT NULL
      AND due_date >= today
      AND due_date <= today + 7
    ),
    'projects_active', (
      SELECT COUNT(*)::int FROM projects
      WHERE company_id = _client_company_id
      AND is_template = false
      AND status IN ('active', 'in_progress')
    ),
    'projects_completed_30d', (
      SELECT COUNT(*)::int FROM projects
      WHERE company_id = _client_company_id
      AND is_template = false
      AND status = 'completed'
      AND updated_at >= now() - interval '30 days'
    ),
    'last_activity_at', (
      SELECT MAX(updated_at) FROM (
        SELECT updated_at FROM tasks WHERE company_id = _client_company_id
        UNION ALL
        SELECT updated_at FROM projects WHERE company_id = _client_company_id
        UNION ALL
        SELECT updated_at FROM events WHERE company_id = _client_company_id
      ) activity
    )
  ) INTO result;

  RETURN result;
END;
$$;
-- Update trigger for coach_organizations
CREATE OR REPLACE FUNCTION public.update_coach_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;
DROP TRIGGER IF EXISTS update_coach_organizations_updated_at ON public.coach_organizations;
CREATE TRIGGER update_coach_organizations_updated_at
BEFORE UPDATE ON public.coach_organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_coach_organizations_updated_at();
