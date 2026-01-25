-- Add deleted_at column for soft delete and update status options
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL;

-- Add index for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON public.projects(deleted_at) WHERE deleted_at IS NULL;

-- Update RLS policies to exclude soft-deleted projects by default
DROP POLICY IF EXISTS "Users can view projects in their company" ON public.projects;
CREATE POLICY "Users can view projects in their company" 
ON public.projects FOR SELECT 
USING (
  deleted_at IS NULL 
  AND company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid())
);

-- Add policy to allow viewing deleted projects (for trash/recovery)
CREATE POLICY "Users can view deleted projects in their company" 
ON public.projects FOR SELECT 
USING (
  deleted_at IS NOT NULL 
  AND company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid())
);