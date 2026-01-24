-- Helper function: Check if caller is a manager of the group
CREATE OR REPLACE FUNCTION public.is_group_manager(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = auth.uid()
      AND role = 'manager'
  );
$$;

-- Helper function: Get company_id for a group
CREATE OR REPLACE FUNCTION public.get_group_company_id(p_group_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.groups WHERE id = p_group_id;
$$;

-- Function to check if role update is allowed
CREATE OR REPLACE FUNCTION public.can_update_group_member_role(p_group_id uuid, p_user_id uuid, p_new_role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_current_role text;
  v_manager_count integer;
BEGIN
  -- Validate role value
  IF p_new_role NOT IN ('member', 'manager') THEN
    RETURN false;
  END IF;

  -- Get company_id for authorization check
  v_company_id := get_group_company_id(p_group_id);
  IF v_company_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check authorization: must be company_admin, site_admin, super_admin, or group manager
  IF NOT (
    is_company_admin(v_company_id) OR
    is_super_admin() OR
    is_group_manager(p_group_id)
  ) THEN
    RETURN false;
  END IF;

  -- Get current role
  SELECT role INTO v_current_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;

  -- If demoting from manager to member, ensure at least 1 manager remains
  IF v_current_role = 'manager' AND p_new_role = 'member' THEN
    SELECT COUNT(*) INTO v_manager_count
    FROM public.group_members
    WHERE group_id = p_group_id AND role = 'manager';

    IF v_manager_count <= 1 THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- Function to check if member deletion is allowed
CREATE OR REPLACE FUNCTION public.can_delete_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_member_role text;
  v_manager_count integer;
BEGIN
  -- Get company_id for authorization check
  v_company_id := get_group_company_id(p_group_id);
  IF v_company_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check authorization: must be company_admin, site_admin, super_admin, or group manager
  IF NOT (
    is_company_admin(v_company_id) OR
    is_super_admin() OR
    is_group_manager(p_group_id)
  ) THEN
    RETURN false;
  END IF;

  -- Get the role of the member being deleted
  SELECT role INTO v_member_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;

  -- If deleting a manager, ensure at least 1 manager remains
  IF v_member_role = 'manager' THEN
    SELECT COUNT(*) INTO v_manager_count
    FROM public.group_members
    WHERE group_id = p_group_id AND role = 'manager';

    IF v_manager_count <= 1 THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- Drop existing UPDATE policy if exists
DROP POLICY IF EXISTS "group_members_update_company_admin" ON public.group_members;

-- Create new UPDATE policy using the function
CREATE POLICY "group_members_update_authorized"
ON public.group_members
FOR UPDATE
TO authenticated
USING (can_update_group_member_role(group_id, user_id, role))
WITH CHECK (can_update_group_member_role(group_id, user_id, role));

-- Drop existing DELETE policy if exists
DROP POLICY IF EXISTS "group_members_delete_admin_or_creator" ON public.group_members;

-- Create new DELETE policy using the function
CREATE POLICY "group_members_delete_authorized"
ON public.group_members
FOR DELETE
TO authenticated
USING (can_delete_group_member(group_id, user_id));