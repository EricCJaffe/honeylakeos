-- ============================================================
-- Coaches Module Retrofit - Prompt 6: Workflow Automation MVP
-- Complete Migration (using correct table/function names)
-- ============================================================

-- A) New Enums
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.workflow_assignment_status AS ENUM ('active', 'paused', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.workflow_cadence AS ENUM ('one_time', 'weekly', 'monthly', 'quarterly', 'annually');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.workflow_run_status AS ENUM ('generated', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.workflow_run_item_type AS ENUM ('task', 'meeting', 'note', 'form');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.workflow_run_item_status AS ENUM ('active', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.workflow_default_assignee AS ENUM ('coach', 'member_admin', 'member_user', 'unassigned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_status AS ENUM ('unread', 'read', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_job_status AS ENUM ('scheduled', 'sent', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- B) Retrofit coaching_workflow_steps with offset columns
-- ============================================================

ALTER TABLE public.coaching_workflow_steps
ADD COLUMN IF NOT EXISTS due_offset_days integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS schedule_offset_days integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS default_assignee public.workflow_default_assignee DEFAULT 'unassigned';

ALTER TABLE public.coaching_program_pack_workflow_steps
ADD COLUMN IF NOT EXISTS due_offset_days integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS schedule_offset_days integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS default_assignee public.workflow_default_assignee DEFAULT 'unassigned';

-- C) New Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coaching_workflow_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_engagement_id uuid NOT NULL REFERENCES public.coaching_org_engagements(id) ON DELETE CASCADE,
  coaching_workflow_template_id uuid NOT NULL REFERENCES public.coaching_workflow_templates(id) ON DELETE CASCADE,
  name_override text,
  status public.workflow_assignment_status NOT NULL DEFAULT 'active',
  cadence public.workflow_cadence NOT NULL,
  start_on date NOT NULL,
  timezone text NOT NULL DEFAULT 'America/New_York',
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_assignments_unique_active 
ON public.coaching_workflow_assignments (coaching_engagement_id, coaching_workflow_template_id, cadence, start_on)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_workflow_assignments_engagement_status 
ON public.coaching_workflow_assignments (coaching_engagement_id, status);

CREATE INDEX IF NOT EXISTS idx_workflow_assignments_next_run 
ON public.coaching_workflow_assignments (next_run_at, status);

CREATE TABLE IF NOT EXISTS public.coaching_workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_workflow_assignment_id uuid NOT NULL REFERENCES public.coaching_workflow_assignments(id) ON DELETE CASCADE,
  run_for_period_start date NOT NULL,
  run_for_period_end date,
  scheduled_run_at timestamptz NOT NULL,
  status public.workflow_run_status NOT NULL DEFAULT 'generated',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_run_per_period UNIQUE (coaching_workflow_assignment_id, run_for_period_start)
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_assignment_period 
ON public.coaching_workflow_runs (coaching_workflow_assignment_id, run_for_period_start);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_scheduled 
ON public.coaching_workflow_runs (scheduled_run_at, status);

CREATE TABLE IF NOT EXISTS public.coaching_workflow_run_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_workflow_run_id uuid NOT NULL REFERENCES public.coaching_workflow_runs(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.coaching_workflow_steps(id) ON DELETE CASCADE,
  item_type public.workflow_run_item_type NOT NULL,
  created_entity_table text NOT NULL,
  created_entity_id uuid NOT NULL,
  status public.workflow_run_item_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_step_per_run UNIQUE (coaching_workflow_run_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_run_items_entity 
ON public.coaching_workflow_run_items (created_entity_table, created_entity_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  link text,
  due_at timestamptz,
  status public.notification_status NOT NULL DEFAULT 'unread',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_status 
ON public.notifications (user_id, status);

CREATE INDEX IF NOT EXISTS idx_notifications_due 
ON public.notifications (due_at, status);

CREATE TABLE IF NOT EXISTS public.notification_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  run_at timestamptz NOT NULL,
  status public.notification_job_status NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_run 
ON public.notification_jobs (run_at, status);

CREATE TABLE IF NOT EXISTS public.coaching_form_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_engagement_id uuid NOT NULL REFERENCES public.coaching_org_engagements(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  due_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_requests_engagement 
ON public.coaching_form_requests (coaching_engagement_id, status);

-- D) Updated_at Triggers
-- ============================================================

DROP TRIGGER IF EXISTS set_updated_at_coaching_workflow_assignments ON public.coaching_workflow_assignments;
CREATE TRIGGER set_updated_at_coaching_workflow_assignments
  BEFORE UPDATE ON public.coaching_workflow_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_coaching_workflow_runs ON public.coaching_workflow_runs;
CREATE TRIGGER set_updated_at_coaching_workflow_runs
  BEFORE UPDATE ON public.coaching_workflow_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_coaching_workflow_run_items ON public.coaching_workflow_run_items;
CREATE TRIGGER set_updated_at_coaching_workflow_run_items
  BEFORE UPDATE ON public.coaching_workflow_run_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_notifications ON public.notifications;
CREATE TRIGGER set_updated_at_notifications
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_notification_jobs ON public.notification_jobs;
CREATE TRIGGER set_updated_at_notification_jobs
  BEFORE UPDATE ON public.notification_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_coaching_form_requests ON public.coaching_form_requests;
CREATE TRIGGER set_updated_at_coaching_form_requests
  BEFORE UPDATE ON public.coaching_form_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- E) Helper Functions for RLS (using memberships table)
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_can_access_workflow_assignment(_user_id uuid, _assignment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.coaching_workflow_assignments cwa
    JOIN public.coaching_org_engagements coe ON coe.id = cwa.coaching_engagement_id
    WHERE cwa.id = _assignment_id
      AND coe.status IN ('active', 'suspended')
      AND (
        public.fn_is_site_admin(_user_id)
        OR public.fn_is_coaching_org_admin(_user_id, coe.coaching_org_id)
        OR public.fn_is_coaching_manager(_user_id, coe.coaching_org_id)
        OR EXISTS (
          SELECT 1 FROM public.coaching_org_engagement_assignments coea
          JOIN public.coaching_coaches cc ON cc.id = coea.coach_id
          WHERE coea.coaching_engagement_id = coe.id
            AND cc.user_id = _user_id
            AND coea.status = 'active'
        )
        OR public.fn_is_company_member(_user_id, coe.member_company_id)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.fn_can_manage_workflow_assignment(_user_id uuid, _assignment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.coaching_workflow_assignments cwa
    JOIN public.coaching_org_engagements coe ON coe.id = cwa.coaching_engagement_id
    WHERE cwa.id = _assignment_id
      AND coe.status IN ('active', 'suspended')
      AND (
        public.fn_is_site_admin(_user_id)
        OR public.fn_is_coaching_org_admin(_user_id, coe.coaching_org_id)
        OR EXISTS (
          SELECT 1 FROM public.coaching_org_engagement_assignments coea
          JOIN public.coaching_coaches cc ON cc.id = coea.coach_id
          WHERE coea.coaching_engagement_id = coe.id
            AND cc.user_id = _user_id
            AND coea.status = 'active'
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.fn_can_access_engagement_for_workflow(_user_id uuid, _engagement_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.coaching_org_engagements coe
    WHERE coe.id = _engagement_id
      AND coe.status IN ('active', 'suspended')
      AND (
        public.fn_is_site_admin(_user_id)
        OR public.fn_is_coaching_org_admin(_user_id, coe.coaching_org_id)
        OR public.fn_is_coaching_manager(_user_id, coe.coaching_org_id)
        OR EXISTS (
          SELECT 1 FROM public.coaching_org_engagement_assignments coea
          JOIN public.coaching_coaches cc ON cc.id = coea.coach_id
          WHERE coea.coaching_engagement_id = coe.id
            AND cc.user_id = _user_id
            AND coea.status = 'active'
        )
        OR public.fn_is_company_member(_user_id, coe.member_company_id)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.fn_can_manage_engagement_workflow(_user_id uuid, _engagement_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.coaching_org_engagements coe
    WHERE coe.id = _engagement_id
      AND coe.status IN ('active', 'suspended')
      AND (
        public.fn_is_site_admin(_user_id)
        OR public.fn_is_coaching_org_admin(_user_id, coe.coaching_org_id)
        OR EXISTS (
          SELECT 1 FROM public.coaching_org_engagement_assignments coea
          JOIN public.coaching_coaches cc ON cc.id = coea.coach_id
          WHERE coea.coaching_engagement_id = coe.id
            AND cc.user_id = _user_id
            AND coea.status = 'active'
        )
      )
  )
$$;

-- F) RLS Policies
-- ============================================================

ALTER TABLE public.coaching_workflow_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_workflow_run_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_form_requests ENABLE ROW LEVEL SECURITY;

-- coaching_workflow_assignments policies
CREATE POLICY "wf_assignments_select"
ON public.coaching_workflow_assignments FOR SELECT
TO authenticated
USING (public.fn_can_access_engagement_for_workflow(auth.uid(), coaching_engagement_id));

CREATE POLICY "wf_assignments_insert"
ON public.coaching_workflow_assignments FOR INSERT
TO authenticated
WITH CHECK (public.fn_can_manage_engagement_workflow(auth.uid(), coaching_engagement_id));

CREATE POLICY "wf_assignments_update"
ON public.coaching_workflow_assignments FOR UPDATE
TO authenticated
USING (public.fn_can_manage_workflow_assignment(auth.uid(), id))
WITH CHECK (public.fn_can_manage_workflow_assignment(auth.uid(), id));

CREATE POLICY "wf_assignments_delete"
ON public.coaching_workflow_assignments FOR DELETE
TO authenticated
USING (public.fn_can_manage_workflow_assignment(auth.uid(), id));

-- coaching_workflow_runs policies
CREATE POLICY "wf_runs_select"
ON public.coaching_workflow_runs FOR SELECT
TO authenticated
USING (public.fn_can_access_workflow_assignment(auth.uid(), coaching_workflow_assignment_id));

CREATE POLICY "wf_runs_insert"
ON public.coaching_workflow_runs FOR INSERT
TO authenticated
WITH CHECK (public.fn_can_manage_workflow_assignment(auth.uid(), coaching_workflow_assignment_id));

CREATE POLICY "wf_runs_update"
ON public.coaching_workflow_runs FOR UPDATE
TO authenticated
USING (public.fn_can_manage_workflow_assignment(auth.uid(), coaching_workflow_assignment_id))
WITH CHECK (public.fn_can_manage_workflow_assignment(auth.uid(), coaching_workflow_assignment_id));

CREATE POLICY "wf_runs_delete"
ON public.coaching_workflow_runs FOR DELETE
TO authenticated
USING (public.fn_can_manage_workflow_assignment(auth.uid(), coaching_workflow_assignment_id));

-- coaching_workflow_run_items policies
CREATE POLICY "wf_run_items_select"
ON public.coaching_workflow_run_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coaching_workflow_runs r
    WHERE r.id = coaching_workflow_run_id
      AND public.fn_can_access_workflow_assignment(auth.uid(), r.coaching_workflow_assignment_id)
  )
);

CREATE POLICY "wf_run_items_insert"
ON public.coaching_workflow_run_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.coaching_workflow_runs r
    WHERE r.id = coaching_workflow_run_id
      AND public.fn_can_manage_workflow_assignment(auth.uid(), r.coaching_workflow_assignment_id)
  )
);

CREATE POLICY "wf_run_items_update"
ON public.coaching_workflow_run_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coaching_workflow_runs r
    WHERE r.id = coaching_workflow_run_id
      AND public.fn_can_manage_workflow_assignment(auth.uid(), r.coaching_workflow_assignment_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.coaching_workflow_runs r
    WHERE r.id = coaching_workflow_run_id
      AND public.fn_can_manage_workflow_assignment(auth.uid(), r.coaching_workflow_assignment_id)
  )
);

CREATE POLICY "wf_run_items_delete"
ON public.coaching_workflow_run_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coaching_workflow_runs r
    WHERE r.id = coaching_workflow_run_id
      AND public.fn_can_manage_workflow_assignment(auth.uid(), r.coaching_workflow_assignment_id)
  )
);

-- notifications policies
CREATE POLICY "notifications_select_own"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_insert"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- notification_jobs policies
CREATE POLICY "notification_jobs_admin"
ON public.notification_jobs FOR ALL
TO authenticated
USING (public.fn_is_site_admin(auth.uid()))
WITH CHECK (public.fn_is_site_admin(auth.uid()));

CREATE POLICY "notification_jobs_select_own"
ON public.notification_jobs FOR SELECT
TO authenticated
USING (
  notification_id IN (
    SELECT id FROM public.notifications WHERE user_id = auth.uid()
  )
);

-- coaching_form_requests policies
CREATE POLICY "form_requests_select"
ON public.coaching_form_requests FOR SELECT
TO authenticated
USING (public.fn_can_access_engagement_for_workflow(auth.uid(), coaching_engagement_id));

CREATE POLICY "form_requests_insert"
ON public.coaching_form_requests FOR INSERT
TO authenticated
WITH CHECK (public.fn_can_manage_engagement_workflow(auth.uid(), coaching_engagement_id));

CREATE POLICY "form_requests_update"
ON public.coaching_form_requests FOR UPDATE
TO authenticated
USING (public.fn_can_manage_engagement_workflow(auth.uid(), coaching_engagement_id))
WITH CHECK (public.fn_can_manage_engagement_workflow(auth.uid(), coaching_engagement_id));

CREATE POLICY "form_requests_delete"
ON public.coaching_form_requests FOR DELETE
TO authenticated
USING (public.fn_can_manage_engagement_workflow(auth.uid(), coaching_engagement_id));

-- G) Automation Helper Functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_calculate_next_run_date(
  p_current_date date,
  p_cadence public.workflow_cadence,
  p_timezone text DEFAULT 'America/New_York'
)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_next_date date;
BEGIN
  CASE p_cadence
    WHEN 'one_time' THEN
      v_next_date := p_current_date;
    WHEN 'weekly' THEN
      v_next_date := p_current_date + INTERVAL '7 days';
    WHEN 'monthly' THEN
      v_next_date := p_current_date + INTERVAL '1 month';
    WHEN 'quarterly' THEN
      v_next_date := p_current_date + INTERVAL '3 months';
    WHEN 'annually' THEN
      v_next_date := p_current_date + INTERVAL '1 year';
    ELSE
      v_next_date := p_current_date;
  END CASE;
  
  RETURN (v_next_date::text || ' 10:00:00')::timestamp AT TIME ZONE p_timezone;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_initial_next_run()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.next_run_at IS NULL AND NEW.status = 'active' THEN
    NEW.next_run_at := (NEW.start_on::text || ' 10:00:00')::timestamp AT TIME ZONE NEW.timezone;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_initial_next_run ON public.coaching_workflow_assignments;
CREATE TRIGGER trg_set_initial_next_run
  BEFORE INSERT ON public.coaching_workflow_assignments
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_initial_next_run();

CREATE OR REPLACE FUNCTION public.fn_update_next_run_on_resume()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status != 'active' AND NEW.next_run_at IS NULL THEN
    IF NEW.start_on > CURRENT_DATE THEN
      NEW.next_run_at := (NEW.start_on::text || ' 10:00:00')::timestamp AT TIME ZONE NEW.timezone;
    ELSE
      NEW.next_run_at := NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_next_run_on_resume ON public.coaching_workflow_assignments;
CREATE TRIGGER trg_update_next_run_on_resume
  BEFORE UPDATE ON public.coaching_workflow_assignments
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_next_run_on_resume();