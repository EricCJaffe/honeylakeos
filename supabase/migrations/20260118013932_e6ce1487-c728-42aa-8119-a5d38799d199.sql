-- Create framework_playbooks table for coach guidance
CREATE TABLE public.framework_playbooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  framework_id UUID NOT NULL REFERENCES public.frameworks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_conditions_json JSONB NOT NULL DEFAULT '{}',
  recommended_actions_json JSONB NOT NULL DEFAULT '[]',
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Create coaching_sessions table
CREATE TABLE public.coaching_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  agenda_rte TEXT,
  notes_rte TEXT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  playbook_id UUID REFERENCES public.framework_playbooks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_coaching_relationship CHECK (coach_company_id != client_company_id)
);
-- Create suggested_tasks status enum
DO $$ BEGIN
  CREATE TYPE public.suggestion_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
-- Create suggested_tasks table
CREATE TABLE public.suggested_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description_rte TEXT,
  suggested_due_date DATE,
  status public.suggestion_status NOT NULL DEFAULT 'pending',
  decided_by_user_id UUID,
  decided_at TIMESTAMPTZ,
  converted_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  playbook_id UUID REFERENCES public.framework_playbooks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_coaching_relationship CHECK (coach_company_id != client_company_id)
);
-- Create share request type enum
DO $$ BEGIN
  CREATE TYPE public.share_request_type AS ENUM ('report', 'document', 'note');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
-- Create coach_share_requests table
CREATE TABLE public.coach_share_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  request_type public.share_request_type NOT NULL DEFAULT 'report',
  entity_id UUID NOT NULL,
  entity_name TEXT,
  reason TEXT,
  status public.suggestion_status NOT NULL DEFAULT 'pending',
  decided_by_user_id UUID,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_coaching_relationship CHECK (coach_company_id != client_company_id)
);
-- Indexes
CREATE INDEX framework_playbooks_framework_idx ON public.framework_playbooks(framework_id);
CREATE INDEX coaching_sessions_coach_idx ON public.coaching_sessions(coach_company_id);
CREATE INDEX coaching_sessions_client_idx ON public.coaching_sessions(client_company_id);
CREATE INDEX suggested_tasks_coach_idx ON public.suggested_tasks(coach_company_id);
CREATE INDEX suggested_tasks_client_idx ON public.suggested_tasks(client_company_id);
CREATE INDEX suggested_tasks_status_idx ON public.suggested_tasks(status) WHERE status = 'pending';
CREATE INDEX coach_share_requests_client_idx ON public.coach_share_requests(client_company_id);
CREATE INDEX coach_share_requests_status_idx ON public.coach_share_requests(status) WHERE status = 'pending';
-- Enable RLS
ALTER TABLE public.framework_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggested_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_share_requests ENABLE ROW LEVEL SECURITY;
-- RLS for framework_playbooks
CREATE POLICY "Anyone can view playbooks for adopted frameworks"
  ON public.framework_playbooks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_frameworks cf
      JOIN public.memberships m ON m.company_id = cf.company_id
      WHERE cf.active_framework_id = framework_playbooks.framework_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.frameworks f
      JOIN public.memberships m ON m.company_id = f.owner_company_id
      WHERE f.id = framework_playbooks.framework_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );
CREATE POLICY "Framework owners can manage playbooks"
  ON public.framework_playbooks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.frameworks f
      JOIN public.memberships m ON m.company_id = f.owner_company_id
      WHERE f.id = framework_playbooks.framework_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role = 'company_admin'
    )
  );
-- RLS for coaching_sessions
CREATE POLICY "Coach company can manage their sessions"
  ON public.coaching_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = coaching_sessions.coach_company_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );
CREATE POLICY "Client company can view sessions about them"
  ON public.coaching_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = coaching_sessions.client_company_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role = 'company_admin'
    )
  );
-- RLS for suggested_tasks
CREATE POLICY "Coach company can manage suggestions"
  ON public.suggested_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = suggested_tasks.coach_company_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );
CREATE POLICY "Client admins can view and decide on suggestions"
  ON public.suggested_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = suggested_tasks.client_company_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role = 'company_admin'
    )
  );
CREATE POLICY "Client admins can update suggestion status"
  ON public.suggested_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = suggested_tasks.client_company_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role = 'company_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = suggested_tasks.client_company_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role = 'company_admin'
    )
  );
-- RLS for coach_share_requests
CREATE POLICY "Coach company can manage share requests"
  ON public.coach_share_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = coach_share_requests.coach_company_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );
CREATE POLICY "Client admins can view and decide on share requests"
  ON public.coach_share_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = coach_share_requests.client_company_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role = 'company_admin'
    )
  );
CREATE POLICY "Client admins can update share request status"
  ON public.coach_share_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = coach_share_requests.client_company_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role = 'company_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = coach_share_requests.client_company_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role = 'company_admin'
    )
  );
-- Updated_at triggers
CREATE TRIGGER update_framework_playbooks_updated_at
  BEFORE UPDATE ON public.framework_playbooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_coaching_sessions_updated_at
  BEFORE UPDATE ON public.coaching_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suggested_tasks_updated_at
  BEFORE UPDATE ON public.suggested_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Function to convert accepted task suggestion into real task
CREATE OR REPLACE FUNCTION public.accept_suggested_task(
  _suggestion_id UUID,
  _assignee_user_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _suggestion RECORD;
  _new_task_id UUID;
BEGIN
  -- Get suggestion details
  SELECT * INTO _suggestion
  FROM public.suggested_tasks
  WHERE id = _suggestion_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Suggestion not found or already processed';
  END IF;
  
  -- Verify caller is client admin
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE company_id = _suggestion.client_company_id
    AND user_id = auth.uid()
    AND status = 'active'
    AND role = 'company_admin'
  ) THEN
    RAISE EXCEPTION 'Only client admins can accept suggestions';
  END IF;
  
  -- Create the task
  INSERT INTO public.tasks (
    company_id,
    title,
    description,
    due_date,
    assigned_to,
    status,
    created_by
  ) VALUES (
    _suggestion.client_company_id,
    _suggestion.title,
    _suggestion.description_rte,
    _suggestion.suggested_due_date,
    _assignee_user_id,
    'todo',
    auth.uid()
  )
  RETURNING id INTO _new_task_id;
  
  -- Update suggestion
  UPDATE public.suggested_tasks
  SET 
    status = 'accepted',
    decided_by_user_id = auth.uid(),
    decided_at = NOW(),
    converted_task_id = _new_task_id
  WHERE id = _suggestion_id;
  
  RETURN _new_task_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_suggested_task(UUID, UUID) TO authenticated;
