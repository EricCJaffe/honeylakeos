-- Drop partially created objects from failed migration
DROP TABLE IF EXISTS public.sop_revisions CASCADE;
DROP TABLE IF EXISTS public.sops CASCADE;
DROP TYPE IF EXISTS public.sop_visibility CASCADE;

-- Create SOP visibility enum
CREATE TYPE public.sop_visibility AS ENUM ('department_only', 'company_public');

-- Create SOPs table
CREATE TABLE public.sops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  purpose TEXT,
  scope TEXT,
  owner_role TEXT,
  tools_systems TEXT[] DEFAULT '{}',
  procedure_steps JSONB DEFAULT '[]'::jsonb,
  exceptions_notes TEXT,
  related_sop_ids UUID[] DEFAULT '{}',
  visibility public.sop_visibility NOT NULL DEFAULT 'department_only',
  tags TEXT[] DEFAULT '{}',
  current_version INTEGER NOT NULL DEFAULT 1,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create SOP revisions table for version history
CREATE TABLE public.sop_revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sop_id UUID NOT NULL REFERENCES public.sops(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  purpose TEXT,
  scope TEXT,
  owner_role TEXT,
  tools_systems TEXT[],
  procedure_steps JSONB DEFAULT '[]'::jsonb,
  exceptions_notes TEXT,
  related_sop_ids UUID[],
  change_summary TEXT,
  revised_by UUID REFERENCES auth.users(id),
  revised_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sop_id, version)
);

-- Create indexes for SOPs
CREATE INDEX idx_sops_company_id ON public.sops(company_id);
CREATE INDEX idx_sops_department_id ON public.sops(department_id);
CREATE INDEX idx_sops_visibility ON public.sops(visibility);
CREATE INDEX idx_sops_tags ON public.sops USING GIN(tags);
CREATE INDEX idx_sops_title_search ON public.sops USING GIN(to_tsvector('english', title));

-- Create index for revisions
CREATE INDEX idx_sop_revisions_sop_id ON public.sop_revisions(sop_id);

-- Enable RLS
ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_revisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for SOPs

-- Company members can view company-public SOPs
CREATE POLICY "Company members can view public SOPs"
ON public.sops
FOR SELECT
USING (
  visibility = 'company_public'
  AND EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.company_id = sops.company_id
    AND memberships.user_id = auth.uid()
    AND memberships.status = 'active'
  )
);

-- Department members can view department-only SOPs
CREATE POLICY "Department members can view department SOPs"
ON public.sops
FOR SELECT
USING (
  visibility = 'department_only'
  AND EXISTS (
    SELECT 1 FROM public.department_members
    WHERE department_members.department_id = sops.department_id
    AND department_members.user_id = auth.uid()
  )
);

-- Company admins can view all SOPs in their company
CREATE POLICY "Company admins can view all SOPs"
ON public.sops
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.company_id = sops.company_id
    AND memberships.user_id = auth.uid()
    AND memberships.role = 'company_admin'
    AND memberships.status = 'active'
  )
);

-- Department managers and company admins can create SOPs
CREATE POLICY "Managers can create SOPs"
ON public.sops
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.department_members
    WHERE department_members.department_id = sops.department_id
    AND department_members.user_id = auth.uid()
    AND department_members.role = 'manager'
  )
  OR EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.company_id = sops.company_id
    AND memberships.user_id = auth.uid()
    AND memberships.role = 'company_admin'
    AND memberships.status = 'active'
  )
);

-- Department managers and company admins can update SOPs
CREATE POLICY "Managers can update SOPs"
ON public.sops
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.department_members
    WHERE department_members.department_id = sops.department_id
    AND department_members.user_id = auth.uid()
    AND department_members.role = 'manager'
  )
  OR EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.company_id = sops.company_id
    AND memberships.user_id = auth.uid()
    AND memberships.role = 'company_admin'
    AND memberships.status = 'active'
  )
);

-- Department managers and company admins can delete SOPs
CREATE POLICY "Managers can delete SOPs"
ON public.sops
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.department_members
    WHERE department_members.department_id = sops.department_id
    AND department_members.user_id = auth.uid()
    AND department_members.role = 'manager'
  )
  OR EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.company_id = sops.company_id
    AND memberships.user_id = auth.uid()
    AND memberships.role = 'company_admin'
    AND memberships.status = 'active'
  )
);

-- RLS Policies for SOP Revisions (inherit from parent SOP access)

-- Anyone who can view the SOP can view its revisions
CREATE POLICY "Users can view SOP revisions if they can view the SOP"
ON public.sop_revisions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sops
    WHERE sops.id = sop_revisions.sop_id
    AND (
      -- Company public and user is company member
      (sops.visibility = 'company_public' AND EXISTS (
        SELECT 1 FROM public.memberships
        WHERE memberships.company_id = sops.company_id
        AND memberships.user_id = auth.uid()
        AND memberships.status = 'active'
      ))
      OR
      -- Department only and user is department member
      (sops.visibility = 'department_only' AND EXISTS (
        SELECT 1 FROM public.department_members
        WHERE department_members.department_id = sops.department_id
        AND department_members.user_id = auth.uid()
      ))
      OR
      -- Company admin
      EXISTS (
        SELECT 1 FROM public.memberships
        WHERE memberships.company_id = sops.company_id
        AND memberships.user_id = auth.uid()
        AND memberships.role = 'company_admin'
        AND memberships.status = 'active'
      )
    )
  )
);

-- Managers can insert revisions
CREATE POLICY "Managers can create SOP revisions"
ON public.sop_revisions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sops
    WHERE sops.id = sop_revisions.sop_id
    AND (
      EXISTS (
        SELECT 1 FROM public.department_members
        WHERE department_members.department_id = sops.department_id
        AND department_members.user_id = auth.uid()
        AND department_members.role = 'manager'
      )
      OR EXISTS (
        SELECT 1 FROM public.memberships
        WHERE memberships.company_id = sops.company_id
        AND memberships.user_id = auth.uid()
        AND memberships.role = 'company_admin'
        AND memberships.status = 'active'
      )
    )
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_sops_updated_at
BEFORE UPDATE ON public.sops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();