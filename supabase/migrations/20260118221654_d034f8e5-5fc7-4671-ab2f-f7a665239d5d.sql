-- Add department_id to projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
-- Add department_id to tasks  
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
-- Add department_id to notes
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
-- Add department_id to documents
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
-- Add department_id to forms
ALTER TABLE public.forms
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_projects_department_id ON public.projects(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_department_id ON public.tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_notes_department_id ON public.notes(department_id);
CREATE INDEX IF NOT EXISTS idx_documents_department_id ON public.documents(department_id);
CREATE INDEX IF NOT EXISTS idx_forms_department_id ON public.forms(department_id);
-- Function to seed default departments for a company (called once per company)
CREATE OR REPLACE FUNCTION public.seed_default_departments(p_company_id uuid, p_created_by uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dept_count integer;
BEGIN
  -- Check if company already has departments
  SELECT COUNT(*) INTO dept_count FROM departments WHERE company_id = p_company_id;
  
  -- Only seed if no departments exist
  IF dept_count = 0 THEN
    INSERT INTO departments (company_id, name, description, created_by)
    VALUES
      (p_company_id, 'Sales', 'Revenue generation and client acquisition', p_created_by),
      (p_company_id, 'Accounting', 'Financial management and reporting', p_created_by),
      (p_company_id, 'Marketing', 'Brand awareness and lead generation', p_created_by),
      (p_company_id, 'Operations', 'Day-to-day business operations', p_created_by);
  END IF;
END;
$$;
-- Update department_members RLS to allow managers to add/remove members in their department
DROP POLICY IF EXISTS "Department managers can manage their department members" ON public.department_members;
CREATE POLICY "Department managers can manage their department members"
ON public.department_members
FOR ALL
USING (
  -- Company admin can manage all
  public.is_company_admin(public.get_department_company_id(department_id))
  OR
  -- Department managers can manage their own department members
  public.is_department_manager(department_id, auth.uid())
)
WITH CHECK (
  public.is_company_admin(public.get_department_company_id(department_id))
  OR
  public.is_department_manager(department_id, auth.uid())
);
