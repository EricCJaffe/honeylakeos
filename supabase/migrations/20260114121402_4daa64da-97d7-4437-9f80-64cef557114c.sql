-- Drop existing functions and policies to recreate with correct signatures
DROP POLICY IF EXISTS "group_members_update_authorized" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete_authorized" ON public.group_members;
DROP FUNCTION IF EXISTS public.can_update_group_member_role(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.can_delete_group_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_group_manager(uuid);
DROP FUNCTION IF EXISTS public.get_group_company_id(uuid);
-- 1) Function to check if a specific user is a manager of a group
CREATE OR REPLACE FUNCTION public.is_group_manager(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
      AND role = 'manager'
  );
$$;
-- 2) Function to check if role update is allowed
CREATE OR REPLACE FUNCTION public.can_update_group_member_role(p_group_id uuid, p_target_user_id uuid, p_new_role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_site_id uuid;
  v_current_role text;
  v_other_manager_count integer;
BEGIN
  -- Validate role value
  IF p_new_role NOT IN ('member', 'manager') THEN
    RETURN false;
  END IF;

  -- Get company_id and site_id for authorization check
  SELECT g.company_id, c.site_id 
  INTO v_company_id, v_site_id
  FROM public.groups g
  JOIN public.companies c ON c.id = g.company_id
  WHERE g.id = p_group_id;

  IF v_company_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check authorization: super_admin, site_admin, company_admin, or group manager
  IF NOT (
    is_super_admin() OR
    is_site_admin(v_site_id) OR
    is_company_admin(v_company_id) OR
    is_group_manager(p_group_id, auth.uid())
  ) THEN
    RETURN false;
  END IF;

  -- Get current role of target
  SELECT role INTO v_current_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_target_user_id;

  -- If demoting from manager to member, ensure at least 1 other manager remains
  IF v_current_role = 'manager' AND p_new_role = 'member' THEN
    SELECT COUNT(*) INTO v_other_manager_count
    FROM public.group_members
    WHERE group_id = p_group_id 
      AND role = 'manager'
      AND user_id != p_target_user_id;

    IF v_other_manager_count < 1 THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;
-- 3) Function to check if member deletion is allowed
CREATE OR REPLACE FUNCTION public.can_delete_group_member(p_group_id uuid, p_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_site_id uuid;
  v_member_role text;
  v_other_manager_count integer;
BEGIN
  -- Get company_id and site_id for authorization check
  SELECT g.company_id, c.site_id 
  INTO v_company_id, v_site_id
  FROM public.groups g
  JOIN public.companies c ON c.id = g.company_id
  WHERE g.id = p_group_id;

  IF v_company_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check authorization: super_admin, site_admin, company_admin, or group manager
  IF NOT (
    is_super_admin() OR
    is_site_admin(v_site_id) OR
    is_company_admin(v_company_id) OR
    is_group_manager(p_group_id, auth.uid())
  ) THEN
    RETURN false;
  END IF;

  -- Get the role of the member being deleted
  SELECT role INTO v_member_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_target_user_id;

  -- If deleting a manager, ensure at least 1 other manager remains
  IF v_member_role = 'manager' THEN
    SELECT COUNT(*) INTO v_other_manager_count
    FROM public.group_members
    WHERE group_id = p_group_id 
      AND role = 'manager'
      AND user_id != p_target_user_id;

    IF v_other_manager_count < 1 THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;
-- 4) RLS policies on group_members
CREATE POLICY "group_members_update_role_guard"
ON public.group_members
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (can_update_group_member_role(group_id, user_id, role));
CREATE POLICY "group_members_delete_guard"
ON public.group_members
FOR DELETE
TO authenticated
USING (can_delete_group_member(group_id, user_id));
