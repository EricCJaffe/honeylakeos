-- ================================================
-- Project Templates with Phases and Tasks
-- ================================================

-- 1. Create project_templates table (full templates, not just phases)
CREATE TABLE IF NOT EXISTS public.project_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NULL,
  emoji text NOT NULL DEFAULT '📋',
  color text NOT NULL DEFAULT '#2563eb',
  status text NOT NULL DEFAULT 'active',
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);
-- 2. Create project_template_phases table
CREATE TABLE IF NOT EXISTS public.project_template_phases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  color text NULL,
  description text NULL
);
-- 3. Create project_template_tasks table
CREATE TABLE IF NOT EXISTS public.project_template_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NULL,
  default_phase_name text NULL,
  priority text NULL DEFAULT 'medium',
  sort_order integer NOT NULL DEFAULT 0,
  relative_due_days integer NULL,
  is_milestone boolean NOT NULL DEFAULT false
);
-- 4. Enable RLS on all new tables
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_template_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_template_tasks ENABLE ROW LEVEL SECURITY;
-- 5. RLS Policies for project_templates
CREATE POLICY "project_templates_select_company_member"
  ON public.project_templates
  FOR SELECT
  USING (is_company_member(company_id));
CREATE POLICY "project_templates_insert_company_admin"
  ON public.project_templates
  FOR INSERT
  WITH CHECK (is_company_admin(company_id));
CREATE POLICY "project_templates_update_company_admin"
  ON public.project_templates
  FOR UPDATE
  USING (is_company_admin(company_id));
CREATE POLICY "project_templates_delete_company_admin"
  ON public.project_templates
  FOR DELETE
  USING (is_company_admin(company_id));
-- 6. RLS Policies for project_template_phases (access via template)
CREATE POLICY "project_template_phases_select"
  ON public.project_template_phases
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.project_templates pt
    WHERE pt.id = project_template_phases.template_id
    AND is_company_member(pt.company_id)
  ));
CREATE POLICY "project_template_phases_insert"
  ON public.project_template_phases
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.project_templates pt
    WHERE pt.id = project_template_phases.template_id
    AND is_company_admin(pt.company_id)
  ));
CREATE POLICY "project_template_phases_update"
  ON public.project_template_phases
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.project_templates pt
    WHERE pt.id = project_template_phases.template_id
    AND is_company_admin(pt.company_id)
  ));
CREATE POLICY "project_template_phases_delete"
  ON public.project_template_phases
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.project_templates pt
    WHERE pt.id = project_template_phases.template_id
    AND is_company_admin(pt.company_id)
  ));
-- 7. RLS Policies for project_template_tasks (access via template)
CREATE POLICY "project_template_tasks_select"
  ON public.project_template_tasks
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.project_templates pt
    WHERE pt.id = project_template_tasks.template_id
    AND is_company_member(pt.company_id)
  ));
CREATE POLICY "project_template_tasks_insert"
  ON public.project_template_tasks
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.project_templates pt
    WHERE pt.id = project_template_tasks.template_id
    AND is_company_admin(pt.company_id)
  ));
CREATE POLICY "project_template_tasks_update"
  ON public.project_template_tasks
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.project_templates pt
    WHERE pt.id = project_template_tasks.template_id
    AND is_company_admin(pt.company_id)
  ));
CREATE POLICY "project_template_tasks_delete"
  ON public.project_template_tasks
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.project_templates pt
    WHERE pt.id = project_template_tasks.template_id
    AND is_company_admin(pt.company_id)
  ));
-- 8. Create indexes
CREATE INDEX IF NOT EXISTS idx_project_templates_company ON public.project_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_project_template_phases_template ON public.project_template_phases(template_id);
CREATE INDEX IF NOT EXISTS idx_project_template_tasks_template ON public.project_template_tasks(template_id);
-- 9. RPC: create_project_from_template
CREATE OR REPLACE FUNCTION public.create_project_from_template(
  p_template_id uuid,
  p_company_id uuid,
  p_name text,
  p_start_date date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template project_templates%ROWTYPE;
  v_project_id uuid;
  v_user_id uuid;
  v_phase_map jsonb := '{}'::jsonb;
  v_phase project_template_phases%ROWTYPE;
  v_task project_template_tasks%ROWTYPE;
  v_new_phase_id uuid;
  v_task_phase_id uuid;
  v_task_due_date date;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Verify company membership
  IF NOT is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'Not a member of this company';
  END IF;
  
  -- Verify projects module is enabled
  IF NOT is_module_enabled(p_company_id, 'projects') THEN
    RAISE EXCEPTION 'Projects module is not enabled';
  END IF;
  
  -- Get template
  SELECT * INTO v_template
  FROM project_templates
  WHERE id = p_template_id AND company_id = p_company_id;
  
  IF v_template.id IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  
  -- Create project
  INSERT INTO projects (
    company_id,
    owner_user_id,
    name,
    description,
    emoji,
    color,
    status,
    start_date,
    created_by
  ) VALUES (
    p_company_id,
    v_user_id,
    p_name,
    v_template.description,
    v_template.emoji,
    v_template.color,
    'active',
    p_start_date,
    v_user_id
  )
  RETURNING id INTO v_project_id;
  
  -- Create phases from template and build name->id map
  FOR v_phase IN
    SELECT * FROM project_template_phases
    WHERE template_id = p_template_id
    ORDER BY sort_order
  LOOP
    INSERT INTO project_phases (
      company_id,
      project_id,
      name,
      sort_order,
      created_by
    ) VALUES (
      p_company_id,
      v_project_id,
      v_phase.name,
      v_phase.sort_order,
      v_user_id
    )
    RETURNING id INTO v_new_phase_id;
    
    -- Map phase name to new phase id
    v_phase_map := v_phase_map || jsonb_build_object(v_phase.name, v_new_phase_id);
  END LOOP;
  
  -- Create tasks from template
  FOR v_task IN
    SELECT * FROM project_template_tasks
    WHERE template_id = p_template_id
    ORDER BY sort_order
  LOOP
    -- Resolve phase_id from default_phase_name
    v_task_phase_id := NULL;
    IF v_task.default_phase_name IS NOT NULL AND v_phase_map ? v_task.default_phase_name THEN
      v_task_phase_id := (v_phase_map ->> v_task.default_phase_name)::uuid;
    END IF;
    
    -- Calculate due date from relative_due_days
    v_task_due_date := NULL;
    IF v_task.relative_due_days IS NOT NULL AND p_start_date IS NOT NULL THEN
      v_task_due_date := p_start_date + v_task.relative_due_days;
    END IF;
    
    INSERT INTO tasks (
      company_id,
      project_id,
      phase_id,
      title,
      description,
      priority,
      due_date,
      order_index,
      created_by
    ) VALUES (
      p_company_id,
      v_project_id,
      v_task_phase_id,
      v_task.title,
      v_task.description,
      COALESCE(v_task.priority, 'medium'),
      v_task_due_date,
      v_task.sort_order,
      v_user_id
    );
  END LOOP;
  
  RETURN json_build_object(
    'project_id', v_project_id,
    'phases_created', (SELECT count(*) FROM project_phases WHERE project_id = v_project_id),
    'tasks_created', (SELECT count(*) FROM tasks WHERE project_id = v_project_id)
  );
END;
$$;
