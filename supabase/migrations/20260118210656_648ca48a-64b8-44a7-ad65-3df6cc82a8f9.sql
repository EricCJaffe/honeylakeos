-- =============================================================================
-- DEPARTMENTS + RESOURCES ORGANIZATIONAL LAYER
-- =============================================================================

-- Create department role enum
CREATE TYPE public.department_role AS ENUM ('member', 'manager');

-- Create resource type enum
CREATE TYPE public.resource_type AS ENUM ('document', 'link', 'file', 'video');

-- =============================================================================
-- DEPARTMENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(company_id, name)
);

-- Indexes
CREATE INDEX idx_departments_company ON public.departments(company_id);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments
CREATE POLICY "Company members can view departments"
  ON public.departments FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY "Company admins can insert departments"
  ON public.departments FOR INSERT
  WITH CHECK (public.is_company_admin(company_id));

CREATE POLICY "Company admins can update departments"
  ON public.departments FOR UPDATE
  USING (public.is_company_admin(company_id));

CREATE POLICY "Company admins can delete departments"
  ON public.departments FOR DELETE
  USING (public.is_company_admin(company_id));

-- =============================================================================
-- DEPARTMENT MEMBERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.department_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.department_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(department_id, user_id)
);

-- Indexes
CREATE INDEX idx_department_members_department ON public.department_members(department_id);
CREATE INDEX idx_department_members_user ON public.department_members(user_id);

-- Enable RLS
ALTER TABLE public.department_members ENABLE ROW LEVEL SECURITY;

-- Helper function to get company_id from department
CREATE OR REPLACE FUNCTION public.get_department_company_id(p_department_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.departments WHERE id = p_department_id
$$;

-- Helper function to check if user is department member
CREATE OR REPLACE FUNCTION public.is_department_member(p_user_id UUID, p_department_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.department_members
    WHERE department_id = p_department_id
      AND user_id = p_user_id
  )
$$;

-- Helper function to check if user is department manager
CREATE OR REPLACE FUNCTION public.is_department_manager(p_user_id UUID, p_department_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.department_members
    WHERE department_id = p_department_id
      AND user_id = p_user_id
      AND role = 'manager'
  )
$$;

-- RLS Policies for department_members
CREATE POLICY "Company members can view department members"
  ON public.department_members FOR SELECT
  USING (
    public.is_company_member(public.get_department_company_id(department_id))
  );

CREATE POLICY "Company admins can manage department members"
  ON public.department_members FOR INSERT
  WITH CHECK (
    public.is_company_admin(public.get_department_company_id(department_id))
  );

CREATE POLICY "Company admins can update department members"
  ON public.department_members FOR UPDATE
  USING (
    public.is_company_admin(public.get_department_company_id(department_id))
  );

CREATE POLICY "Company admins can delete department members"
  ON public.department_members FOR DELETE
  USING (
    public.is_company_admin(public.get_department_company_id(department_id))
  );

-- =============================================================================
-- RESOURCES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  resource_type public.resource_type NOT NULL DEFAULT 'link',
  content_ref TEXT NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Indexes
CREATE INDEX idx_resources_company ON public.resources(company_id);
CREATE INDEX idx_resources_department ON public.resources(department_id);
CREATE INDEX idx_resources_company_universal ON public.resources(company_id) WHERE department_id IS NULL;

-- Enable RLS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resources
-- Universal resources (department_id IS NULL) - readable by all company members
-- Department resources - readable by department members, managers, and company admins
CREATE POLICY "Company members can view resources"
  ON public.resources FOR SELECT
  USING (
    public.is_company_member(company_id)
    AND (
      department_id IS NULL
      OR public.is_department_member(auth.uid(), department_id)
      OR public.is_company_admin(company_id)
    )
  );

CREATE POLICY "Admins can insert resources"
  ON public.resources FOR INSERT
  WITH CHECK (
    public.is_company_member(company_id)
    AND (
      (department_id IS NULL AND public.is_company_admin(company_id))
      OR (department_id IS NOT NULL AND (
        public.is_department_manager(auth.uid(), department_id)
        OR public.is_company_admin(company_id)
      ))
    )
  );

CREATE POLICY "Admins can update resources"
  ON public.resources FOR UPDATE
  USING (
    (department_id IS NULL AND public.is_company_admin(company_id))
    OR (department_id IS NOT NULL AND (
      public.is_department_manager(auth.uid(), department_id)
      OR public.is_company_admin(company_id)
    ))
  );

CREATE POLICY "Admins can delete resources"
  ON public.resources FOR DELETE
  USING (
    (department_id IS NULL AND public.is_company_admin(company_id))
    OR (department_id IS NOT NULL AND (
      public.is_department_manager(auth.uid(), department_id)
      OR public.is_company_admin(company_id)
    ))
  );

-- =============================================================================
-- TRIGGERS for updated_at
-- =============================================================================
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();