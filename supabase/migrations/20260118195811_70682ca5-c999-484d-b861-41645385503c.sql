-- Add can_access_finance column to memberships
ALTER TABLE public.memberships 
ADD COLUMN IF NOT EXISTS can_access_finance BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster finance permission lookups
CREATE INDEX IF NOT EXISTS idx_memberships_finance_access 
ON public.memberships(company_id, user_id, can_access_finance) 
WHERE can_access_finance = true;

-- Update is_finance_admin function to check for can_access_finance permission
CREATE OR REPLACE FUNCTION public.is_finance_admin(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Company admin always has access
    SELECT 1 FROM public.memberships 
    WHERE company_id = p_company_id 
      AND user_id = auth.uid() 
      AND status = 'active' 
      AND role = 'company_admin'
  )
  OR EXISTS (
    -- Users with explicit finance access
    SELECT 1 FROM public.memberships 
    WHERE company_id = p_company_id 
      AND user_id = auth.uid() 
      AND status = 'active' 
      AND can_access_finance = true
  )
  OR EXISTS (
    -- Site admins and super admins
    SELECT 1 FROM public.site_memberships sm
    JOIN public.companies c ON c.site_id = sm.site_id
    WHERE c.id = p_company_id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('site_admin', 'super_admin')
  );
$$;

-- Add comment for documentation
COMMENT ON COLUMN public.memberships.can_access_finance IS 'Whether the user has access to finance module features. Company admins always have access regardless of this flag.';