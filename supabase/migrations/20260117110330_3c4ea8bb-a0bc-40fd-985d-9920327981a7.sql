-- Workflow & Forms Builder v2 Schema

-- Scope type enum
CREATE TYPE public.wf_scope_type AS ENUM ('site', 'company', 'group');
-- Form/Workflow status enum
CREATE TYPE public.wf_status AS ENUM ('draft', 'published', 'archived');
-- Field types enum
CREATE TYPE public.wf_field_type AS ENUM (
  'short_text', 'long_text', 'email', 'phone', 'number', 'date',
  'dropdown', 'multi_select', 'checkbox', 'rating', 'yes_no'
);
-- Workflow trigger types
CREATE TYPE public.wf_trigger_type AS ENUM (
  'manual', 'employee_event', 'scheduled', 'form_submission'
);
-- Workflow step types
CREATE TYPE public.wf_step_type AS ENUM (
  'form_step', 'approval_step', 'task_step', 'project_step',
  'calendar_step', 'document_step', 'note_step', 'notify_step',
  'assign_lms_step', 'support_ticket_step'
);
-- Assignee types
CREATE TYPE public.wf_assignee_type AS ENUM (
  'user', 'employee', 'group', 'company_admin', 'workflow_initiator'
);
-- Run status
CREATE TYPE public.wf_run_status AS ENUM ('running', 'completed', 'cancelled', 'failed');
-- Step run status
CREATE TYPE public.wf_step_run_status AS ENUM (
  'pending', 'in_progress', 'completed', 'rejected', 'skipped', 'failed'
);
-- Submission status
CREATE TYPE public.wf_submission_status AS ENUM ('submitted', 'under_review', 'completed', 'closed');
-- ============================================
-- FORMS
-- ============================================

CREATE TABLE public.wf_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type public.wf_scope_type NOT NULL DEFAULT 'company',
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status public.wf_status NOT NULL DEFAULT 'draft',
  language_code TEXT DEFAULT 'en',
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  CONSTRAINT valid_scope CHECK (
    (scope_type = 'site' AND site_id IS NOT NULL AND company_id IS NULL AND group_id IS NULL) OR
    (scope_type = 'company' AND company_id IS NOT NULL AND group_id IS NULL) OR
    (scope_type = 'group' AND group_id IS NOT NULL)
  )
);
CREATE TABLE public.wf_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.wf_forms(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  help_text TEXT,
  field_type public.wf_field_type NOT NULL DEFAULT 'short_text',
  is_required BOOLEAN NOT NULL DEFAULT false,
  options JSONB DEFAULT '[]',
  validation_rules JSONB DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(form_id, key)
);
CREATE TABLE public.wf_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.wf_forms(id) ON DELETE CASCADE,
  submitter_user_id UUID REFERENCES auth.users(id),
  company_context_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  status public.wf_submission_status NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.wf_form_submission_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.wf_form_submissions(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.wf_form_fields(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number NUMERIC,
  value_date DATE,
  value_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================
-- WORKFLOWS
-- ============================================

CREATE TABLE public.wf_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type public.wf_scope_type NOT NULL DEFAULT 'company',
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status public.wf_status NOT NULL DEFAULT 'draft',
  trigger_type public.wf_trigger_type NOT NULL DEFAULT 'manual',
  trigger_config JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  CONSTRAINT valid_scope CHECK (
    (scope_type = 'site' AND site_id IS NOT NULL AND company_id IS NULL AND group_id IS NULL) OR
    (scope_type = 'company' AND company_id IS NOT NULL AND group_id IS NULL) OR
    (scope_type = 'group' AND group_id IS NOT NULL)
  )
);
CREATE TABLE public.wf_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.wf_workflows(id) ON DELETE CASCADE,
  step_type public.wf_step_type NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  assignee_type public.wf_assignee_type,
  assignee_id UUID,
  due_days_offset INTEGER,
  config JSONB DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================
-- WORKFLOW RUNS
-- ============================================

CREATE TABLE public.wf_workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.wf_workflows(id) ON DELETE CASCADE,
  initiated_by_user_id UUID REFERENCES auth.users(id),
  company_context_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  target_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  status public.wf_run_status NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);
CREATE TABLE public.wf_workflow_step_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.wf_workflow_runs(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.wf_workflow_steps(id) ON DELETE CASCADE,
  status public.wf_step_run_status NOT NULL DEFAULT 'pending',
  assigned_to_user_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  output_links JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_wf_forms_scope ON public.wf_forms(scope_type, site_id, company_id, group_id);
CREATE INDEX idx_wf_forms_status ON public.wf_forms(status);
CREATE INDEX idx_wf_form_fields_form ON public.wf_form_fields(form_id, sort_order);
CREATE INDEX idx_wf_form_submissions_form ON public.wf_form_submissions(form_id);
CREATE INDEX idx_wf_form_submissions_submitter ON public.wf_form_submissions(submitter_user_id);
CREATE INDEX idx_wf_form_submissions_status ON public.wf_form_submissions(status);
CREATE INDEX idx_wf_workflows_scope ON public.wf_workflows(scope_type, site_id, company_id, group_id);
CREATE INDEX idx_wf_workflows_status ON public.wf_workflows(status);
CREATE INDEX idx_wf_workflow_steps_workflow ON public.wf_workflow_steps(workflow_id, sort_order);
CREATE INDEX idx_wf_workflow_runs_workflow ON public.wf_workflow_runs(workflow_id);
CREATE INDEX idx_wf_workflow_runs_status ON public.wf_workflow_runs(status);
CREATE INDEX idx_wf_workflow_step_runs_run ON public.wf_workflow_step_runs(run_id);
CREATE INDEX idx_wf_workflow_step_runs_assigned ON public.wf_workflow_step_runs(assigned_to_user_id, status);
-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_wf_forms_updated_at
  BEFORE UPDATE ON public.wf_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wf_form_fields_updated_at
  BEFORE UPDATE ON public.wf_form_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wf_form_submissions_updated_at
  BEFORE UPDATE ON public.wf_form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wf_workflows_updated_at
  BEFORE UPDATE ON public.wf_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wf_workflow_steps_updated_at
  BEFORE UPDATE ON public.wf_workflow_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wf_workflow_step_runs_updated_at
  BEFORE UPDATE ON public.wf_workflow_step_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.wf_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wf_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wf_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wf_form_submission_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wf_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wf_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wf_workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wf_workflow_step_runs ENABLE ROW LEVEL SECURITY;
-- Forms: Read access
CREATE POLICY "wf_forms_select" ON public.wf_forms FOR SELECT USING (
  (scope_type = 'site' AND status = 'published') OR
  (scope_type = 'company' AND company_id IN (
    SELECT company_id FROM public.memberships WHERE user_id = auth.uid()
  )) OR
  (scope_type = 'group' AND group_id IN (
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
  )) OR
  created_by = auth.uid() OR
  is_site_admin(get_user_site_id())
);
-- Forms: Write access (site admin or company admin or group manager)
CREATE POLICY "wf_forms_insert" ON public.wf_forms FOR INSERT WITH CHECK (
  (scope_type = 'site' AND is_site_admin(get_user_site_id())) OR
  (scope_type = 'company' AND is_company_admin(company_id)) OR
  (scope_type = 'group' AND EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = wf_forms.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role IN ('manager', 'admin')
  ))
);
CREATE POLICY "wf_forms_update" ON public.wf_forms FOR UPDATE USING (
  (scope_type = 'site' AND is_site_admin(get_user_site_id())) OR
  (scope_type = 'company' AND is_company_admin(company_id)) OR
  (scope_type = 'group' AND EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = wf_forms.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role IN ('manager', 'admin')
  )) OR
  created_by = auth.uid()
);
CREATE POLICY "wf_forms_delete" ON public.wf_forms FOR DELETE USING (
  (scope_type = 'site' AND is_site_admin(get_user_site_id())) OR
  (scope_type = 'company' AND is_company_admin(company_id)) OR
  created_by = auth.uid()
);
-- Form fields: inherit from form
CREATE POLICY "wf_form_fields_select" ON public.wf_form_fields FOR SELECT USING (
  form_id IN (SELECT id FROM public.wf_forms)
);
CREATE POLICY "wf_form_fields_insert" ON public.wf_form_fields FOR INSERT WITH CHECK (
  form_id IN (SELECT id FROM public.wf_forms WHERE 
    created_by = auth.uid() OR
    (scope_type = 'site' AND is_site_admin(get_user_site_id())) OR
    (scope_type = 'company' AND is_company_admin(company_id))
  )
);
CREATE POLICY "wf_form_fields_update" ON public.wf_form_fields FOR UPDATE USING (
  form_id IN (SELECT id FROM public.wf_forms WHERE 
    created_by = auth.uid() OR
    (scope_type = 'site' AND is_site_admin(get_user_site_id())) OR
    (scope_type = 'company' AND is_company_admin(company_id))
  )
);
CREATE POLICY "wf_form_fields_delete" ON public.wf_form_fields FOR DELETE USING (
  form_id IN (SELECT id FROM public.wf_forms WHERE 
    created_by = auth.uid() OR
    (scope_type = 'site' AND is_site_admin(get_user_site_id())) OR
    (scope_type = 'company' AND is_company_admin(company_id))
  )
);
-- Submissions: submitter can view their own, admins can view all in scope
CREATE POLICY "wf_form_submissions_select" ON public.wf_form_submissions FOR SELECT USING (
  submitter_user_id = auth.uid() OR
  form_id IN (SELECT id FROM public.wf_forms WHERE 
    (scope_type = 'site' AND is_site_admin(get_user_site_id())) OR
    (scope_type = 'company' AND is_company_admin(company_id))
  )
);
CREATE POLICY "wf_form_submissions_insert" ON public.wf_form_submissions FOR INSERT WITH CHECK (
  form_id IN (SELECT id FROM public.wf_forms WHERE status = 'published')
);
CREATE POLICY "wf_form_submissions_update" ON public.wf_form_submissions FOR UPDATE USING (
  submitter_user_id = auth.uid() OR
  form_id IN (SELECT id FROM public.wf_forms WHERE 
    (scope_type = 'site' AND is_site_admin(get_user_site_id())) OR
    (scope_type = 'company' AND is_company_admin(company_id))
  )
);
-- Submission values: inherit from submission
CREATE POLICY "wf_form_submission_values_select" ON public.wf_form_submission_values FOR SELECT USING (
  submission_id IN (SELECT id FROM public.wf_form_submissions)
);
CREATE POLICY "wf_form_submission_values_insert" ON public.wf_form_submission_values FOR INSERT WITH CHECK (
  submission_id IN (SELECT id FROM public.wf_form_submissions WHERE submitter_user_id = auth.uid())
);
-- Workflows: similar to forms
CREATE POLICY "wf_workflows_select" ON public.wf_workflows FOR SELECT USING (
  (scope_type = 'site' AND status = 'published') OR
  (scope_type = 'company' AND company_id IN (
    SELECT company_id FROM public.memberships WHERE user_id = auth.uid()
  )) OR
  (scope_type = 'group' AND group_id IN (
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
  )) OR
  created_by = auth.uid() OR
  is_site_admin(get_user_site_id())
);
CREATE POLICY "wf_workflows_insert" ON public.wf_workflows FOR INSERT WITH CHECK (
  (scope_type = 'site' AND is_site_admin(get_user_site_id())) OR
  (scope_type = 'company' AND is_company_admin(company_id)) OR
  (scope_type = 'group' AND EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = wf_workflows.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role IN ('manager', 'admin')
  ))
);
CREATE POLICY "wf_workflows_update" ON public.wf_workflows FOR UPDATE USING (
  (scope_type = 'site' AND is_site_admin(get_user_site_id())) OR
  (scope_type = 'company' AND is_company_admin(company_id)) OR
  created_by = auth.uid()
);
CREATE POLICY "wf_workflows_delete" ON public.wf_workflows FOR DELETE USING (
  (scope_type = 'site' AND is_site_admin(get_user_site_id())) OR
  (scope_type = 'company' AND is_company_admin(company_id)) OR
  created_by = auth.uid()
);
-- Workflow steps: inherit from workflow
CREATE POLICY "wf_workflow_steps_select" ON public.wf_workflow_steps FOR SELECT USING (
  workflow_id IN (SELECT id FROM public.wf_workflows)
);
CREATE POLICY "wf_workflow_steps_insert" ON public.wf_workflow_steps FOR INSERT WITH CHECK (
  workflow_id IN (SELECT id FROM public.wf_workflows WHERE 
    created_by = auth.uid() OR
    (scope_type = 'site' AND is_site_admin(get_user_site_id())) OR
    (scope_type = 'company' AND is_company_admin(company_id))
  )
);
CREATE POLICY "wf_workflow_steps_update" ON public.wf_workflow_steps FOR UPDATE USING (
  workflow_id IN (SELECT id FROM public.wf_workflows WHERE 
    created_by = auth.uid() OR
    (scope_type = 'site' AND is_site_admin(get_user_site_id())) OR
    (scope_type = 'company' AND is_company_admin(company_id))
  )
);
CREATE POLICY "wf_workflow_steps_delete" ON public.wf_workflow_steps FOR DELETE USING (
  workflow_id IN (SELECT id FROM public.wf_workflows WHERE 
    created_by = auth.uid() OR
    (scope_type = 'site' AND is_site_admin(get_user_site_id())) OR
    (scope_type = 'company' AND is_company_admin(company_id))
  )
);
-- Workflow runs: initiator + assigned users + admins
CREATE POLICY "wf_workflow_runs_select" ON public.wf_workflow_runs FOR SELECT USING (
  initiated_by_user_id = auth.uid() OR
  id IN (SELECT run_id FROM public.wf_workflow_step_runs WHERE assigned_to_user_id = auth.uid()) OR
  workflow_id IN (SELECT id FROM public.wf_workflows WHERE 
    (scope_type = 'site' AND is_site_admin(get_user_site_id())) OR
    (scope_type = 'company' AND is_company_admin(company_id))
  )
);
CREATE POLICY "wf_workflow_runs_insert" ON public.wf_workflow_runs FOR INSERT WITH CHECK (
  workflow_id IN (SELECT id FROM public.wf_workflows WHERE status = 'published')
);
CREATE POLICY "wf_workflow_runs_update" ON public.wf_workflow_runs FOR UPDATE USING (
  initiated_by_user_id = auth.uid() OR
  workflow_id IN (SELECT id FROM public.wf_workflows WHERE 
    (scope_type = 'site' AND is_site_admin(get_user_site_id())) OR
    (scope_type = 'company' AND is_company_admin(company_id))
  )
);
-- Step runs: assigned user + admins
CREATE POLICY "wf_workflow_step_runs_select" ON public.wf_workflow_step_runs FOR SELECT USING (
  assigned_to_user_id = auth.uid() OR
  run_id IN (SELECT id FROM public.wf_workflow_runs)
);
CREATE POLICY "wf_workflow_step_runs_insert" ON public.wf_workflow_step_runs FOR INSERT WITH CHECK (
  run_id IN (SELECT id FROM public.wf_workflow_runs)
);
CREATE POLICY "wf_workflow_step_runs_update" ON public.wf_workflow_step_runs FOR UPDATE USING (
  assigned_to_user_id = auth.uid() OR
  run_id IN (SELECT id FROM public.wf_workflow_runs WHERE 
    initiated_by_user_id = auth.uid() OR
    workflow_id IN (SELECT id FROM public.wf_workflows WHERE 
      (scope_type = 'site' AND is_site_admin(get_user_site_id())) OR
      (scope_type = 'company' AND is_company_admin(company_id))
    )
  )
);
