
-- =====================================================
-- WORKFLOW BUILDER LITE - ORG-OWNED WORKFLOW TABLES
-- =====================================================

-- 1. Create org-owned workflows table (copies from pack templates)
CREATE TABLE IF NOT EXISTS public.coaching_org_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coaching_org_id UUID NOT NULL REFERENCES public.coaching_orgs(id) ON DELETE CASCADE,
  source_pack_template_id UUID REFERENCES public.coaching_program_pack_workflow_templates(id),
  source_pack_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  workflow_type public.coaching_workflow_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  editable_fields JSONB NOT NULL DEFAULT '["name", "description", "is_active"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create org-owned workflow steps table
CREATE TABLE IF NOT EXISTS public.coaching_org_workflow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_workflow_id UUID NOT NULL REFERENCES public.coaching_org_workflows(id) ON DELETE CASCADE,
  source_pack_step_id UUID REFERENCES public.coaching_program_pack_workflow_steps(id),
  step_order INTEGER NOT NULL DEFAULT 0,
  step_type public.coaching_step_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_optional BOOLEAN NOT NULL DEFAULT false,
  is_disabled BOOLEAN NOT NULL DEFAULT false,
  attached_form_template_key TEXT,
  default_assignee public.workflow_default_assignee NOT NULL DEFAULT 'unassigned',
  due_offset_days INTEGER,
  cadence_days INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_coaching_org_workflows_org ON public.coaching_org_workflows(coaching_org_id);
CREATE INDEX IF NOT EXISTS idx_coaching_org_workflows_pack ON public.coaching_org_workflows(source_pack_key);
CREATE INDEX IF NOT EXISTS idx_coaching_org_workflow_steps_workflow ON public.coaching_org_workflow_steps(org_workflow_id);

-- 4. Enable RLS
ALTER TABLE public.coaching_org_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_org_workflow_steps ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for coaching_org_workflows
CREATE POLICY "Org members can view their org workflows"
  ON public.coaching_org_workflows FOR SELECT
  USING (
    coaching_org_id IN (
      SELECT company_id FROM public.memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Org admins can insert workflows"
  ON public.coaching_org_workflows FOR INSERT
  WITH CHECK (
    coaching_org_id IN (
      SELECT company_id FROM public.memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'company_admin'
    )
  );

CREATE POLICY "Org admins can update workflows"
  ON public.coaching_org_workflows FOR UPDATE
  USING (
    coaching_org_id IN (
      SELECT company_id FROM public.memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'company_admin'
    )
  );

CREATE POLICY "Org admins can delete workflows"
  ON public.coaching_org_workflows FOR DELETE
  USING (
    coaching_org_id IN (
      SELECT company_id FROM public.memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role = 'company_admin'
    )
  );

-- 6. RLS Policies for coaching_org_workflow_steps
CREATE POLICY "Org members can view workflow steps"
  ON public.coaching_org_workflow_steps FOR SELECT
  USING (
    org_workflow_id IN (
      SELECT id FROM public.coaching_org_workflows cow
      WHERE cow.coaching_org_id IN (
        SELECT company_id FROM public.memberships 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Org admins can insert workflow steps"
  ON public.coaching_org_workflow_steps FOR INSERT
  WITH CHECK (
    org_workflow_id IN (
      SELECT id FROM public.coaching_org_workflows cow
      WHERE cow.coaching_org_id IN (
        SELECT company_id FROM public.memberships 
        WHERE user_id = auth.uid() AND status = 'active' AND role = 'company_admin'
      )
    )
  );

CREATE POLICY "Org admins can update workflow steps"
  ON public.coaching_org_workflow_steps FOR UPDATE
  USING (
    org_workflow_id IN (
      SELECT id FROM public.coaching_org_workflows cow
      WHERE cow.coaching_org_id IN (
        SELECT company_id FROM public.memberships 
        WHERE user_id = auth.uid() AND status = 'active' AND role = 'company_admin'
      )
    )
  );

CREATE POLICY "Org admins can delete workflow steps"
  ON public.coaching_org_workflow_steps FOR DELETE
  USING (
    org_workflow_id IN (
      SELECT id FROM public.coaching_org_workflows cow
      WHERE cow.coaching_org_id IN (
        SELECT company_id FROM public.memberships 
        WHERE user_id = auth.uid() AND status = 'active' AND role = 'company_admin'
      )
    )
  );

-- 7. Trigger for updated_at
CREATE TRIGGER update_coaching_org_workflows_updated_at
  BEFORE UPDATE ON public.coaching_org_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coaching_org_workflow_steps_updated_at
  BEFORE UPDATE ON public.coaching_org_workflow_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
