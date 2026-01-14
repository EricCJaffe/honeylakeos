-- Function to safely check if a membership can be deleted
-- Prevents deleting the last active company_admin for a company
CREATE OR REPLACE FUNCTION public.can_delete_membership(p_membership_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_role text;
  v_status text;
  v_site_id uuid;
  v_active_admin_count integer;
BEGIN
  -- Fetch the target membership
  SELECT company_id, role, status
  INTO v_company_id, v_role, v_status
  FROM public.memberships
  WHERE id = p_membership_id;
  
  -- If membership doesn't exist, deny
  IF v_company_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check caller authorization: must be super_admin, site_admin, or company_admin
  -- Get site_id for site_admin check
  SELECT site_id INTO v_site_id
  FROM public.companies
  WHERE id = v_company_id;
  
  IF NOT (
    is_super_admin() OR 
    is_site_admin(v_site_id) OR 
    is_company_admin(v_company_id)
  ) THEN
    RETURN false;
  END IF;
  
  -- If not an active company_admin, allow deletion
  IF v_role != 'company_admin' OR v_status != 'active' THEN
    RETURN true;
  END IF;
  
  -- Count active company_admins for this company
  SELECT COUNT(*)
  INTO v_active_admin_count
  FROM public.memberships
  WHERE company_id = v_company_id
    AND role = 'company_admin'
    AND status = 'active';
  
  -- Allow deletion only if there's more than one active admin
  RETURN v_active_admin_count > 1;
END;
$$;

-- Add DELETE policy on memberships
CREATE POLICY "memberships_delete_admins"
ON public.memberships
FOR DELETE
USING (
  can_delete_membership(id)
);