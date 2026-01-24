-- 1) Create public.employees table
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NULL,
  email text NULL,
  full_name text NOT NULL,
  title text NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  
  -- Validation constraint using trigger pattern (avoiding CHECK with mutable expressions)
  CONSTRAINT employees_status_check CHECK (status IN ('active', 'inactive'))
);

-- 2) Add unique partial indexes (unique constraints with WHERE clause)
CREATE UNIQUE INDEX employees_company_email_unique 
ON public.employees (company_id, email) 
WHERE email IS NOT NULL;

CREATE UNIQUE INDEX employees_company_user_unique 
ON public.employees (company_id, user_id) 
WHERE user_id IS NOT NULL;

-- 3) Add employee_id column to memberships
ALTER TABLE public.memberships 
ADD COLUMN employee_id uuid NULL REFERENCES public.employees(id);

-- 4) RLS policies on employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- SELECT: company members can view employees in their company
CREATE POLICY "employees_select_company_member"
ON public.employees
FOR SELECT
TO authenticated
USING (is_company_member(company_id));

-- INSERT: company_admin, site_admin, or super_admin
CREATE POLICY "employees_insert_admin"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (
  is_company_admin(company_id) OR 
  is_site_admin((SELECT site_id FROM public.companies WHERE id = employees.company_id)) OR
  is_super_admin()
);

-- UPDATE: company_admin, site_admin, or super_admin
CREATE POLICY "employees_update_admin"
ON public.employees
FOR UPDATE
TO authenticated
USING (
  is_company_admin(company_id) OR 
  is_site_admin((SELECT site_id FROM public.companies WHERE id = employees.company_id)) OR
  is_super_admin()
);

-- DELETE: company_admin, site_admin, or super_admin
CREATE POLICY "employees_delete_admin"
ON public.employees
FOR DELETE
TO authenticated
USING (
  is_company_admin(company_id) OR 
  is_site_admin((SELECT site_id FROM public.companies WHERE id = employees.company_id)) OR
  is_super_admin()
);

-- 5) Function to auto-link employee on profile upsert
CREATE OR REPLACE FUNCTION public.link_employee_on_profile_upsert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only proceed if we have an email
  IF NEW.email IS NOT NULL THEN
    -- Update employees where email matches and user_id is not yet set
    -- We need to find employees in companies the user has membership in
    UPDATE public.employees e
    SET user_id = NEW.user_id
    WHERE e.email = NEW.email
      AND e.user_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.company_id = e.company_id
          AND m.user_id = NEW.user_id
          AND m.status = 'active'
      );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger on profiles after insert or update of email
CREATE TRIGGER trigger_link_employee_on_profile_upsert
AFTER INSERT OR UPDATE OF email ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.link_employee_on_profile_upsert();