-- Create location_members table
CREATE TABLE IF NOT EXISTS public.location_members (
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (location_id, user_id)
);

-- Enable RLS
ALTER TABLE public.location_members ENABLE ROW LEVEL SECURITY;

-- Create is_location_manager function (mirrors is_group_manager)
CREATE OR REPLACE FUNCTION public.is_location_manager(p_location_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.location_members
    WHERE location_id = p_location_id
      AND user_id = p_user_id
      AND role = 'manager'
  )
$$;

-- Create can_delete_location_member function (mirrors can_delete_group_member)
CREATE OR REPLACE FUNCTION public.can_delete_location_member(p_location_id uuid, p_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_target_role text;
  v_manager_count int;
BEGIN
  -- Get company_id for the location
  SELECT company_id INTO v_company_id 
  FROM public.locations 
  WHERE id = p_location_id;

  -- Check if caller is company admin
  IF is_company_admin(v_company_id) THEN
    -- Still check last-manager rule
    SELECT role INTO v_target_role 
    FROM public.location_members 
    WHERE location_id = p_location_id AND user_id = p_target_user_id;
    
    IF v_target_role = 'manager' THEN
      SELECT COUNT(*) INTO v_manager_count 
      FROM public.location_members 
      WHERE location_id = p_location_id AND role = 'manager';
      
      IF v_manager_count <= 1 THEN
        RETURN FALSE;
      END IF;
    END IF;
    RETURN TRUE;
  END IF;

  -- Check if caller is a location manager
  IF NOT is_location_manager(p_location_id, auth.uid()) THEN
    RETURN FALSE;
  END IF;

  -- Managers cannot remove themselves if they are the last manager
  SELECT role INTO v_target_role 
  FROM public.location_members 
  WHERE location_id = p_location_id AND user_id = p_target_user_id;

  IF v_target_role = 'manager' THEN
    SELECT COUNT(*) INTO v_manager_count 
    FROM public.location_members 
    WHERE location_id = p_location_id AND role = 'manager';

    IF v_manager_count <= 1 THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;

-- Create can_update_location_member_role function
CREATE OR REPLACE FUNCTION public.can_update_location_member_role(
  p_location_id uuid,
  p_target_user_id uuid,
  p_new_role text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_current_role text;
  v_manager_count int;
BEGIN
  -- Get company_id for the location
  SELECT company_id INTO v_company_id 
  FROM public.locations 
  WHERE id = p_location_id;

  -- Check if caller is company admin or location manager
  IF NOT (is_company_admin(v_company_id) OR is_location_manager(p_location_id, auth.uid())) THEN
    RETURN FALSE;
  END IF;

  -- Get current role of target user
  SELECT role INTO v_current_role 
  FROM public.location_members 
  WHERE location_id = p_location_id AND user_id = p_target_user_id;

  -- If demoting a manager to member, check we're not removing the last manager
  IF v_current_role = 'manager' AND p_new_role = 'member' THEN
    SELECT COUNT(*) INTO v_manager_count 
    FROM public.location_members 
    WHERE location_id = p_location_id AND role = 'manager';

    IF v_manager_count <= 1 THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;

-- RLS Policies

-- SELECT: company members can view location members
CREATE POLICY "location_members_select_company_member"
ON public.location_members
FOR SELECT
USING (
  is_company_member((SELECT l.company_id FROM public.locations l WHERE l.id = location_members.location_id))
);

-- INSERT: company admin OR location manager can add members
CREATE POLICY "location_members_insert_admin_or_manager"
ON public.location_members
FOR INSERT
WITH CHECK (
  is_company_admin((SELECT l.company_id FROM public.locations l WHERE l.id = location_members.location_id))
  OR is_location_manager(location_id, auth.uid())
);

-- DELETE: use guard function (mirrors groups)
CREATE POLICY "location_members_delete_guard"
ON public.location_members
FOR DELETE
USING (can_delete_location_member(location_id, user_id));

-- UPDATE: use guard function for role changes
CREATE POLICY "location_members_update_role_guard"
ON public.location_members
FOR UPDATE
USING (can_update_location_member_role(location_id, user_id, role))
WITH CHECK (can_update_location_member_role(location_id, user_id, role));

-- Add UPDATE and DELETE policies to locations table
CREATE POLICY "locations_update_admins"
ON public.locations
FOR UPDATE
USING (
  is_company_admin(company_id) 
  OR is_site_admin((SELECT c.site_id FROM public.companies c WHERE c.id = locations.company_id))
);

CREATE POLICY "locations_delete_admins"
ON public.locations
FOR DELETE
USING (
  is_company_admin(company_id) 
  OR is_site_admin((SELECT c.site_id FROM public.companies c WHERE c.id = locations.company_id))
);