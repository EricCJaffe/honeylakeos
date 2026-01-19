-- Fix the create_employee_invite(uuid, text) overload used by the frontend
CREATE OR REPLACE FUNCTION public.create_employee_invite(
  p_employee_id uuid,
  p_role text DEFAULT 'user'::text
)
RETURNS TABLE(invite_id uuid, email text, token text, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_employee record;
  v_company_id uuid;
  v_site_id uuid;
  v_existing_invite record;
  v_new_token text;
  v_new_invite_id uuid;
  v_expires_at timestamptz;
BEGIN
  -- Fetch employee
  SELECT e.id, e.company_id, e.email, e.status, e.user_id
  INTO v_employee
  FROM public.employees e
  WHERE e.id = p_employee_id;

  IF v_employee IS NULL THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;

  v_company_id := v_employee.company_id;

  -- Get site_id for authorization
  SELECT c.site_id INTO v_site_id
  FROM public.companies c
  WHERE c.id = v_company_id;

  -- Check authorization
  IF NOT (
    is_company_admin(v_company_id) OR
    is_site_admin(v_site_id) OR
    is_super_admin()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: only admins can create invites';
  END IF;

  -- Validate employee status and email
  IF v_employee.status != 'active' THEN
    RAISE EXCEPTION 'Employee is not active';
  END IF;

  IF v_employee.email IS NULL THEN
    RAISE EXCEPTION 'Employee has no email address';
  END IF;

  IF v_employee.user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Employee is already linked to a user account';
  END IF;

  -- Validate role
  IF p_role NOT IN ('user', 'company_admin', 'location_admin', 'module_admin', 'external') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  -- Check for existing pending non-expired invite
  SELECT i.id, i.email, i.token, i.expires_at
  INTO v_existing_invite
  FROM public.employee_invites i
  WHERE i.employee_id = p_employee_id
    AND i.status = 'pending'
    AND i.expires_at > now()
  LIMIT 1;

  IF v_existing_invite IS NOT NULL THEN
    -- Return existing invite
    RETURN QUERY SELECT 
      v_existing_invite.id,
      v_existing_invite.email,
      v_existing_invite.token,
      v_existing_invite.expires_at;
    RETURN;
  END IF;

  -- Generate new token and create invite (schema-qualified)
  v_new_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '7 days';

  INSERT INTO public.employee_invites (
    company_id,
    employee_id,
    email,
    role,
    token,
    status,
    expires_at,
    created_by
  ) VALUES (
    v_company_id,
    p_employee_id,
    v_employee.email,
    p_role,
    v_new_token,
    'pending',
    v_expires_at,
    auth.uid()
  )
  RETURNING id INTO v_new_invite_id;

  RETURN QUERY SELECT 
    v_new_invite_id,
    v_employee.email,
    v_new_token,
    v_expires_at;
END;
$function$;