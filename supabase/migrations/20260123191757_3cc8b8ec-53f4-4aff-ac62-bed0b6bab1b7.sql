-- =============================================
-- BusinessOS Database Schema - Part 1: Tables
-- =============================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- 2. ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'viewer');
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
-- 3. TABLES (created first so functions can reference them)

-- Companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Memberships table (links users to companies with roles)
CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);
-- CRM Clients table
CREATE TABLE public.crm_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  notes text,
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Folders table
CREATE TABLE public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Projects table
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  status text DEFAULT 'active',
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Notes table
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- 4. INDEXES
CREATE INDEX idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX idx_memberships_company_id ON public.memberships(company_id);
CREATE INDEX idx_crm_clients_company_id ON public.crm_clients(company_id);
CREATE INDEX idx_folders_company_id ON public.folders(company_id);
CREATE INDEX idx_folders_parent_id ON public.folders(parent_id);
CREATE INDEX idx_projects_company_id ON public.projects(company_id);
CREATE INDEX idx_projects_folder_id ON public.projects(folder_id);
CREATE INDEX idx_tasks_company_id ON public.tasks(company_id);
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_notes_company_id ON public.notes(company_id);
CREATE INDEX idx_notes_project_id ON public.notes(project_id);
CREATE INDEX idx_notes_task_id ON public.notes(task_id);
CREATE INDEX idx_notes_user_id ON public.notes(user_id);
-- 5. HELPER FUNCTIONS (Security Definer to avoid RLS recursion)

-- Check if user has a specific role in a company
CREATE OR REPLACE FUNCTION public.has_company_role(_user_id uuid, _company_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND role = _role
  )
$$;
-- Check if user is member of a company (any role)
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = _user_id
      AND company_id = _company_id
  )
$$;
-- Get all company IDs for a user
CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.memberships
  WHERE user_id = _user_id
$$;
-- 6. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- 7. APPLY TRIGGERS
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_clients_updated_at BEFORE UPDATE ON public.crm_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- 8. ENABLE RLS ON ALL TABLES
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
-- 9. RLS POLICIES

-- Companies: Users can view companies they are members of
CREATE POLICY "Users can view their companies"
  ON public.companies FOR SELECT
  USING (id IN (SELECT public.get_user_company_ids(auth.uid())));
CREATE POLICY "Admins can update their companies"
  ON public.companies FOR UPDATE
  USING (public.has_company_role(auth.uid(), id, 'admin'));
CREATE POLICY "Admins can delete their companies"
  ON public.companies FOR DELETE
  USING (public.has_company_role(auth.uid(), id, 'admin'));
CREATE POLICY "Authenticated users can create companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
-- Memberships: Users can view memberships for their companies
CREATE POLICY "Users can view memberships in their companies"
  ON public.memberships FOR SELECT
  USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())));
CREATE POLICY "Admins can insert memberships"
  ON public.memberships FOR INSERT
  WITH CHECK (public.has_company_role(auth.uid(), company_id, 'admin') OR 
    (auth.uid() = user_id AND NOT EXISTS (SELECT 1 FROM public.memberships m WHERE m.company_id = memberships.company_id)));
CREATE POLICY "Admins can update memberships"
  ON public.memberships FOR UPDATE
  USING (public.has_company_role(auth.uid(), company_id, 'admin'));
CREATE POLICY "Admins can delete memberships"
  ON public.memberships FOR DELETE
  USING (public.has_company_role(auth.uid(), company_id, 'admin'));
-- CRM Clients: Company members can manage
CREATE POLICY "Members can view crm_clients"
  ON public.crm_clients FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create crm_clients"
  ON public.crm_clients FOR INSERT
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can update crm_clients"
  ON public.crm_clients FOR UPDATE
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can delete crm_clients"
  ON public.crm_clients FOR DELETE
  USING (public.has_company_role(auth.uid(), company_id, 'admin'));
-- Folders: Company members can manage
CREATE POLICY "Members can view folders"
  ON public.folders FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create folders"
  ON public.folders FOR INSERT
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can update folders"
  ON public.folders FOR UPDATE
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can delete folders"
  ON public.folders FOR DELETE
  USING (public.has_company_role(auth.uid(), company_id, 'admin'));
-- Projects: Company members can manage
CREATE POLICY "Members can view projects"
  ON public.projects FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can update projects"
  ON public.projects FOR UPDATE
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can delete projects"
  ON public.projects FOR DELETE
  USING (public.has_company_role(auth.uid(), company_id, 'admin'));
-- Tasks: Company members can manage
CREATE POLICY "Members can view tasks"
  ON public.tasks FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can update tasks"
  ON public.tasks FOR UPDATE
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can delete tasks"
  ON public.tasks FOR DELETE
  USING (public.has_company_role(auth.uid(), company_id, 'admin'));
-- Notes: Company members can manage
CREATE POLICY "Members can view notes"
  ON public.notes FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can create notes"
  ON public.notes FOR INSERT
  WITH CHECK (public.is_company_member(auth.uid(), company_id) AND auth.uid() = user_id);
CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notes or admins"
  ON public.notes FOR DELETE
  USING (auth.uid() = user_id OR public.has_company_role(auth.uid(), company_id, 'admin'));
