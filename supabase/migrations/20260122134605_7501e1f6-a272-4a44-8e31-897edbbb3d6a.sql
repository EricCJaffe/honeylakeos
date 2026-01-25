-- ============================================================
-- COACHES MODULE RETROFIT - PROMPT 3
-- Core Objects, Workflow Scaffolding, Dashboard Data Models
-- ============================================================

-- ============================================================
-- A) ENUMS FOR COACHING DOMAIN OBJECTS
-- ============================================================

-- Plan status
CREATE TYPE coaching_plan_status AS ENUM ('draft', 'active', 'completed', 'archived');

-- Goal status
CREATE TYPE coaching_goal_status AS ENUM ('planned', 'active', 'achieved', 'abandoned');

-- Meeting type
CREATE TYPE coaching_meeting_type AS ENUM ('annual', 'quarterly', 'monthly', 'one_on_one', 'ad_hoc');

-- Meeting status
CREATE TYPE coaching_meeting_status AS ENUM ('scheduled', 'completed', 'cancelled');

-- Prep item response type
CREATE TYPE coaching_prep_response_type AS ENUM ('text', 'number', 'scale', 'yes_no');

-- Health check subject type
CREATE TYPE coaching_health_subject_type AS ENUM ('leader', 'organization', 'team');

-- Health check assessment period
CREATE TYPE coaching_assessment_period AS ENUM ('quarterly', 'annual', 'ad_hoc');

-- Health check status
CREATE TYPE coaching_health_status AS ENUM ('draft', 'submitted', 'reviewed');

-- Workflow type
CREATE TYPE coaching_workflow_type AS ENUM (
  'annual_meeting',
  'quarterly_meeting',
  'monthly_meeting',
  'one_on_one',
  'content_creation',
  'operations'
);

-- Workflow step type
CREATE TYPE coaching_step_type AS ENUM ('task', 'form', 'meeting', 'note');

-- Dashboard type
CREATE TYPE coaching_dashboard_type AS ENUM ('org_admin', 'manager', 'coach', 'member');

-- ============================================================
-- B) CORE COACHING OBJECTS
-- ============================================================

-- 1) coaching_plans
CREATE TABLE public.coaching_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_engagement_id uuid NOT NULL REFERENCES public.coaching_org_engagements(id) ON DELETE CASCADE,
  member_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status coaching_plan_status NOT NULL DEFAULT 'draft',
  start_date date,
  end_date date,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coaching_plans_engagement_status ON public.coaching_plans(coaching_engagement_id, status);
CREATE INDEX idx_coaching_plans_company ON public.coaching_plans(member_company_id);

-- 2) coaching_goals
CREATE TABLE public.coaching_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_plan_id uuid NOT NULL REFERENCES public.coaching_plans(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  metric text,
  target_value text,
  status coaching_goal_status NOT NULL DEFAULT 'planned',
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coaching_goals_plan ON public.coaching_goals(coaching_plan_id);
CREATE INDEX idx_coaching_goals_status ON public.coaching_goals(status);

-- 3) coaching_meetings
CREATE TABLE public.coaching_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_engagement_id uuid NOT NULL REFERENCES public.coaching_org_engagements(id) ON DELETE CASCADE,
  meeting_type coaching_meeting_type NOT NULL,
  title text NOT NULL,
  scheduled_for timestamptz,
  status coaching_meeting_status NOT NULL DEFAULT 'scheduled',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coaching_meetings_engagement ON public.coaching_meetings(coaching_engagement_id);
CREATE INDEX idx_coaching_meetings_type_status ON public.coaching_meetings(meeting_type, status);
CREATE INDEX idx_coaching_meetings_scheduled ON public.coaching_meetings(scheduled_for);

-- 4) coaching_meeting_prep_items
CREATE TABLE public.coaching_meeting_prep_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_meeting_id uuid NOT NULL REFERENCES public.coaching_meetings(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  response_type coaching_prep_response_type NOT NULL DEFAULT 'text',
  required boolean NOT NULL DEFAULT true,
  response text,
  responded_by_user_id uuid,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coaching_meeting_prep_meeting ON public.coaching_meeting_prep_items(coaching_meeting_id);

-- 5) coaching_health_checks
CREATE TABLE public.coaching_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_engagement_id uuid NOT NULL REFERENCES public.coaching_org_engagements(id) ON DELETE CASCADE,
  subject_type coaching_health_subject_type NOT NULL,
  assessment_period coaching_assessment_period NOT NULL,
  status coaching_health_status NOT NULL DEFAULT 'draft',
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coaching_health_checks_engagement ON public.coaching_health_checks(coaching_engagement_id);
CREATE INDEX idx_coaching_health_checks_status ON public.coaching_health_checks(status);

-- 6) coaching_health_check_responses
CREATE TABLE public.coaching_health_check_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_health_check_id uuid NOT NULL REFERENCES public.coaching_health_checks(id) ON DELETE CASCADE,
  question text NOT NULL,
  response text,
  score integer,
  responded_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coaching_health_responses_check ON public.coaching_health_check_responses(coaching_health_check_id);

-- ============================================================
-- C) WORKFLOW SCAFFOLDING
-- ============================================================

-- 7) coaching_workflow_templates
CREATE TABLE public.coaching_workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_org_id uuid NOT NULL REFERENCES public.coaching_orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  workflow_type coaching_workflow_type NOT NULL,
  description text,
  status template_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coaching_workflow_templates_org ON public.coaching_workflow_templates(coaching_org_id);
CREATE INDEX idx_coaching_workflow_templates_type ON public.coaching_workflow_templates(workflow_type);

-- 8) coaching_workflow_steps
CREATE TABLE public.coaching_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_workflow_template_id uuid NOT NULL REFERENCES public.coaching_workflow_templates(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  step_type coaching_step_type NOT NULL,
  title text NOT NULL,
  description text,
  config_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coaching_workflow_steps_template ON public.coaching_workflow_steps(coaching_workflow_template_id);
CREATE INDEX idx_coaching_workflow_steps_order ON public.coaching_workflow_steps(coaching_workflow_template_id, step_order);

-- ============================================================
-- D) DASHBOARD DATA MODELS
-- ============================================================

-- 9) coaching_dashboards
CREATE TABLE public.coaching_dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_type coaching_dashboard_type NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 10) coaching_dashboard_widgets
CREATE TABLE public.coaching_dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES public.coaching_dashboards(id) ON DELETE CASCADE,
  widget_key text NOT NULL,
  widget_order integer NOT NULL DEFAULT 0,
  description text,
  data_source text,
  config_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(dashboard_id, widget_key)
);

CREATE INDEX idx_coaching_dashboard_widgets_dashboard ON public.coaching_dashboard_widgets(dashboard_id);

-- ============================================================
-- E) INTEGRATION HOOKS - Add workflow template reference to tasks
-- ============================================================

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS coaching_workflow_template_id uuid REFERENCES public.coaching_workflow_templates(id);

CREATE INDEX IF NOT EXISTS idx_tasks_coaching_workflow ON public.tasks(coaching_workflow_template_id) 
WHERE coaching_workflow_template_id IS NOT NULL;

-- ============================================================
-- F) ENABLE RLS ON NEW TABLES
-- ============================================================

ALTER TABLE public.coaching_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_meeting_prep_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_health_check_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- G) RLS POLICIES FOR NEW TABLES
-- ============================================================

-- coaching_plans policies
CREATE POLICY "coaching_plans_select" ON public.coaching_plans
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR member_company_id = public.fn_active_company_id()
  OR public.fn_can_access_engagement(auth.uid(), coaching_engagement_id)
);

CREATE POLICY "coaching_plans_insert" ON public.coaching_plans
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR (member_company_id = public.fn_active_company_id() AND public.fn_is_company_member(auth.uid(), member_company_id))
  OR public.fn_has_coaching_access(auth.uid(), member_company_id, coaching_engagement_id, 'coaching', 'write')
);

CREATE POLICY "coaching_plans_update" ON public.coaching_plans
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR (member_company_id = public.fn_active_company_id() AND public.fn_is_company_member(auth.uid(), member_company_id))
  OR public.fn_has_coaching_access(auth.uid(), member_company_id, coaching_engagement_id, 'coaching', 'write')
);

CREATE POLICY "coaching_plans_delete" ON public.coaching_plans
FOR DELETE USING (
  public.fn_is_site_admin(auth.uid())
  OR (member_company_id = public.fn_active_company_id() AND public.fn_is_company_admin(auth.uid(), member_company_id))
);

-- coaching_goals policies
CREATE POLICY "coaching_goals_select" ON public.coaching_goals
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_plans cp
    WHERE cp.id = coaching_plan_id
      AND (
        cp.member_company_id = public.fn_active_company_id()
        OR public.fn_can_access_engagement(auth.uid(), cp.coaching_engagement_id)
      )
  )
);

CREATE POLICY "coaching_goals_insert" ON public.coaching_goals
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_plans cp
    WHERE cp.id = coaching_plan_id
      AND (
        (cp.member_company_id = public.fn_active_company_id() AND public.fn_is_company_member(auth.uid(), cp.member_company_id))
        OR public.fn_has_coaching_access(auth.uid(), cp.member_company_id, cp.coaching_engagement_id, 'coaching', 'write')
      )
  )
);

CREATE POLICY "coaching_goals_update" ON public.coaching_goals
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_plans cp
    WHERE cp.id = coaching_plan_id
      AND (
        (cp.member_company_id = public.fn_active_company_id() AND public.fn_is_company_member(auth.uid(), cp.member_company_id))
        OR public.fn_has_coaching_access(auth.uid(), cp.member_company_id, cp.coaching_engagement_id, 'coaching', 'write')
      )
  )
);

CREATE POLICY "coaching_goals_delete" ON public.coaching_goals
FOR DELETE USING (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_plans cp
    WHERE cp.id = coaching_plan_id
      AND cp.member_company_id = public.fn_active_company_id()
      AND public.fn_is_company_admin(auth.uid(), cp.member_company_id)
  )
);

-- coaching_meetings policies
CREATE POLICY "coaching_meetings_select" ON public.coaching_meetings
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_can_access_engagement(auth.uid(), coaching_engagement_id)
  OR EXISTS (
    SELECT 1 FROM public.coaching_org_engagements coe
    WHERE coe.id = coaching_engagement_id
      AND coe.member_company_id = public.fn_active_company_id()
  )
);

CREATE POLICY "coaching_meetings_insert" ON public.coaching_meetings
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_can_access_engagement(auth.uid(), coaching_engagement_id)
);

CREATE POLICY "coaching_meetings_update" ON public.coaching_meetings
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_can_access_engagement(auth.uid(), coaching_engagement_id)
  OR EXISTS (
    SELECT 1 FROM public.coaching_org_engagements coe
    WHERE coe.id = coaching_engagement_id
      AND coe.member_company_id = public.fn_active_company_id()
      AND public.fn_is_company_member(auth.uid(), coe.member_company_id)
  )
);

CREATE POLICY "coaching_meetings_delete" ON public.coaching_meetings
FOR DELETE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_can_access_engagement(auth.uid(), coaching_engagement_id)
);

-- coaching_meeting_prep_items policies
CREATE POLICY "coaching_meeting_prep_items_select" ON public.coaching_meeting_prep_items
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_meetings cm
    WHERE cm.id = coaching_meeting_id
      AND (
        public.fn_can_access_engagement(auth.uid(), cm.coaching_engagement_id)
        OR EXISTS (
          SELECT 1 FROM public.coaching_org_engagements coe
          WHERE coe.id = cm.coaching_engagement_id
            AND coe.member_company_id = public.fn_active_company_id()
        )
      )
  )
);

CREATE POLICY "coaching_meeting_prep_items_insert" ON public.coaching_meeting_prep_items
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_meetings cm
    WHERE cm.id = coaching_meeting_id
      AND public.fn_can_access_engagement(auth.uid(), cm.coaching_engagement_id)
  )
);

CREATE POLICY "coaching_meeting_prep_items_update" ON public.coaching_meeting_prep_items
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_meetings cm
    WHERE cm.id = coaching_meeting_id
      AND (
        public.fn_can_access_engagement(auth.uid(), cm.coaching_engagement_id)
        OR EXISTS (
          SELECT 1 FROM public.coaching_org_engagements coe
          WHERE coe.id = cm.coaching_engagement_id
            AND coe.member_company_id = public.fn_active_company_id()
        )
      )
  )
);

CREATE POLICY "coaching_meeting_prep_items_delete" ON public.coaching_meeting_prep_items
FOR DELETE USING (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_meetings cm
    WHERE cm.id = coaching_meeting_id
      AND public.fn_can_access_engagement(auth.uid(), cm.coaching_engagement_id)
  )
);

-- coaching_health_checks policies
CREATE POLICY "coaching_health_checks_select" ON public.coaching_health_checks
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_can_access_engagement(auth.uid(), coaching_engagement_id)
  OR EXISTS (
    SELECT 1 FROM public.coaching_org_engagements coe
    WHERE coe.id = coaching_engagement_id
      AND coe.member_company_id = public.fn_active_company_id()
  )
);

CREATE POLICY "coaching_health_checks_insert" ON public.coaching_health_checks
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_can_access_engagement(auth.uid(), coaching_engagement_id)
);

CREATE POLICY "coaching_health_checks_update" ON public.coaching_health_checks
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_can_access_engagement(auth.uid(), coaching_engagement_id)
  OR EXISTS (
    SELECT 1 FROM public.coaching_org_engagements coe
    WHERE coe.id = coaching_engagement_id
      AND coe.member_company_id = public.fn_active_company_id()
  )
);

CREATE POLICY "coaching_health_checks_delete" ON public.coaching_health_checks
FOR DELETE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_can_access_engagement(auth.uid(), coaching_engagement_id)
);

-- coaching_health_check_responses policies
CREATE POLICY "coaching_health_check_responses_select" ON public.coaching_health_check_responses
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_health_checks chc
    WHERE chc.id = coaching_health_check_id
      AND (
        public.fn_can_access_engagement(auth.uid(), chc.coaching_engagement_id)
        OR EXISTS (
          SELECT 1 FROM public.coaching_org_engagements coe
          WHERE coe.id = chc.coaching_engagement_id
            AND coe.member_company_id = public.fn_active_company_id()
        )
      )
  )
);

CREATE POLICY "coaching_health_check_responses_insert" ON public.coaching_health_check_responses
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_health_checks chc
    WHERE chc.id = coaching_health_check_id
      AND (
        public.fn_can_access_engagement(auth.uid(), chc.coaching_engagement_id)
        OR EXISTS (
          SELECT 1 FROM public.coaching_org_engagements coe
          WHERE coe.id = chc.coaching_engagement_id
            AND coe.member_company_id = public.fn_active_company_id()
        )
      )
  )
);

CREATE POLICY "coaching_health_check_responses_update" ON public.coaching_health_check_responses
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_health_checks chc
    WHERE chc.id = coaching_health_check_id
      AND (
        public.fn_can_access_engagement(auth.uid(), chc.coaching_engagement_id)
        OR EXISTS (
          SELECT 1 FROM public.coaching_org_engagements coe
          WHERE coe.id = chc.coaching_engagement_id
            AND coe.member_company_id = public.fn_active_company_id()
        )
      )
  )
);

CREATE POLICY "coaching_health_check_responses_delete" ON public.coaching_health_check_responses
FOR DELETE USING (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_health_checks chc
    WHERE chc.id = coaching_health_check_id
      AND public.fn_can_access_engagement(auth.uid(), chc.coaching_engagement_id)
  )
);

-- coaching_workflow_templates policies (org admin only for write)
CREATE POLICY "coaching_workflow_templates_select" ON public.coaching_workflow_templates
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
  OR public.fn_is_coaching_manager(auth.uid(), coaching_org_id)
  OR public.fn_is_coach(auth.uid(), coaching_org_id)
);

CREATE POLICY "coaching_workflow_templates_insert" ON public.coaching_workflow_templates
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

CREATE POLICY "coaching_workflow_templates_update" ON public.coaching_workflow_templates
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

CREATE POLICY "coaching_workflow_templates_delete" ON public.coaching_workflow_templates
FOR DELETE USING (
  public.fn_is_site_admin(auth.uid())
  OR public.fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
);

-- coaching_workflow_steps policies
CREATE POLICY "coaching_workflow_steps_select" ON public.coaching_workflow_steps
FOR SELECT USING (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_workflow_templates cwt
    WHERE cwt.id = coaching_workflow_template_id
      AND (
        public.fn_is_coaching_org_admin(auth.uid(), cwt.coaching_org_id)
        OR public.fn_is_coaching_manager(auth.uid(), cwt.coaching_org_id)
        OR public.fn_is_coach(auth.uid(), cwt.coaching_org_id)
      )
  )
);

CREATE POLICY "coaching_workflow_steps_insert" ON public.coaching_workflow_steps
FOR INSERT WITH CHECK (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_workflow_templates cwt
    WHERE cwt.id = coaching_workflow_template_id
      AND public.fn_is_coaching_org_admin(auth.uid(), cwt.coaching_org_id)
  )
);

CREATE POLICY "coaching_workflow_steps_update" ON public.coaching_workflow_steps
FOR UPDATE USING (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_workflow_templates cwt
    WHERE cwt.id = coaching_workflow_template_id
      AND public.fn_is_coaching_org_admin(auth.uid(), cwt.coaching_org_id)
  )
);

CREATE POLICY "coaching_workflow_steps_delete" ON public.coaching_workflow_steps
FOR DELETE USING (
  public.fn_is_site_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.coaching_workflow_templates cwt
    WHERE cwt.id = coaching_workflow_template_id
      AND public.fn_is_coaching_org_admin(auth.uid(), cwt.coaching_org_id)
  )
);

-- coaching_dashboards policies (read-only for all authenticated)
CREATE POLICY "coaching_dashboards_select" ON public.coaching_dashboards
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "coaching_dashboards_insert" ON public.coaching_dashboards
FOR INSERT WITH CHECK (public.fn_is_site_admin(auth.uid()));

CREATE POLICY "coaching_dashboards_update" ON public.coaching_dashboards
FOR UPDATE USING (public.fn_is_site_admin(auth.uid()));

CREATE POLICY "coaching_dashboards_delete" ON public.coaching_dashboards
FOR DELETE USING (public.fn_is_site_admin(auth.uid()));

-- coaching_dashboard_widgets policies
CREATE POLICY "coaching_dashboard_widgets_select" ON public.coaching_dashboard_widgets
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "coaching_dashboard_widgets_insert" ON public.coaching_dashboard_widgets
FOR INSERT WITH CHECK (public.fn_is_site_admin(auth.uid()));

CREATE POLICY "coaching_dashboard_widgets_update" ON public.coaching_dashboard_widgets
FOR UPDATE USING (public.fn_is_site_admin(auth.uid()));

CREATE POLICY "coaching_dashboard_widgets_delete" ON public.coaching_dashboard_widgets
FOR DELETE USING (public.fn_is_site_admin(auth.uid()));

-- ============================================================
-- H) UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER set_coaching_plans_updated_at
  BEFORE UPDATE ON public.coaching_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_coaching_goals_updated_at
  BEFORE UPDATE ON public.coaching_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_coaching_meetings_updated_at
  BEFORE UPDATE ON public.coaching_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_coaching_meeting_prep_updated_at
  BEFORE UPDATE ON public.coaching_meeting_prep_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_coaching_health_checks_updated_at
  BEFORE UPDATE ON public.coaching_health_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_coaching_health_responses_updated_at
  BEFORE UPDATE ON public.coaching_health_check_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_coaching_workflow_templates_updated_at
  BEFORE UPDATE ON public.coaching_workflow_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_coaching_workflow_steps_updated_at
  BEFORE UPDATE ON public.coaching_workflow_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_coaching_dashboards_updated_at
  BEFORE UPDATE ON public.coaching_dashboards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_coaching_dashboard_widgets_updated_at
  BEFORE UPDATE ON public.coaching_dashboard_widgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();