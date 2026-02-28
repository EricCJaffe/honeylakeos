-- ============================================================
-- PROMPT 4: Project Phases + Phase Templates + Task Phase Linkage
-- ============================================================

-- 1) Create project_phases table
CREATE TABLE IF NOT EXISTS public.project_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT unique_project_phase_name UNIQUE (company_id, project_id, name)
);
-- Indexes for project_phases
CREATE INDEX idx_project_phases_project ON public.project_phases(project_id);
CREATE INDEX idx_project_phases_company ON public.project_phases(company_id);
-- Enable RLS
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
-- RLS Policies for project_phases
CREATE POLICY "project_phases_select_company_member"
  ON public.project_phases FOR SELECT
  USING (is_company_member(company_id));
CREATE POLICY "project_phases_insert_company_admin"
  ON public.project_phases FOR INSERT
  WITH CHECK (is_company_admin(company_id) OR (
    SELECT owner_user_id FROM public.projects WHERE id = project_phases.project_id
  ) = auth.uid());
CREATE POLICY "project_phases_update_company_admin"
  ON public.project_phases FOR UPDATE
  USING (is_company_admin(company_id) OR (
    SELECT owner_user_id FROM public.projects WHERE id = project_phases.project_id
  ) = auth.uid());
CREATE POLICY "project_phases_delete_company_admin"
  ON public.project_phases FOR DELETE
  USING (is_company_admin(company_id) OR (
    SELECT owner_user_id FROM public.projects WHERE id = project_phases.project_id
  ) = auth.uid());
-- 2) Create project_phase_templates table
CREATE TABLE IF NOT EXISTS public.project_phase_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  phases jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT unique_phase_template_name UNIQUE (company_id, name)
);
-- Index for phase templates
CREATE INDEX idx_phase_templates_company ON public.project_phase_templates(company_id);
-- Enable RLS
ALTER TABLE public.project_phase_templates ENABLE ROW LEVEL SECURITY;
-- RLS Policies for project_phase_templates
CREATE POLICY "phase_templates_select_company_member"
  ON public.project_phase_templates FOR SELECT
  USING (is_company_member(company_id));
CREATE POLICY "phase_templates_insert_company_admin"
  ON public.project_phase_templates FOR INSERT
  WITH CHECK (is_company_admin(company_id));
CREATE POLICY "phase_templates_update_company_admin"
  ON public.project_phase_templates FOR UPDATE
  USING (is_company_admin(company_id));
CREATE POLICY "phase_templates_delete_company_admin"
  ON public.project_phase_templates FOR DELETE
  USING (is_company_admin(company_id));
-- 3) Add phase_id to tasks (nullable FK to project_phases)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS phase_id uuid REFERENCES public.project_phases(id) ON DELETE SET NULL;
-- Index for task phase lookup
CREATE INDEX IF NOT EXISTS idx_tasks_phase ON public.tasks(phase_id);
