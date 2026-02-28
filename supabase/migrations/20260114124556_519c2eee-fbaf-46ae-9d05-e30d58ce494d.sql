-- 1) Add sent_at column to employee_invites if missing
ALTER TABLE public.employee_invites 
ADD COLUMN IF NOT EXISTS sent_at timestamptz NULL;
-- 2) Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_employee_invites_token_status 
ON public.employee_invites(token, status);
-- 3) Create public RPC to get invite info (no auth required for token lookup)
CREATE OR REPLACE FUNCTION public.get_employee_invite_public(p_token text)
RETURNS TABLE(
  status text,
  expires_at timestamptz,
  employee_name text,
  company_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.status,
    i.expires_at,
    e.full_name,
    c.name
  FROM public.employee_invites i
  JOIN public.employees e ON e.id = i.employee_id
  JOIN public.companies c ON c.id = i.company_id
  WHERE i.token = p_token
    AND i.status = 'pending'
  LIMIT 1;
$$;
-- 4) Create RPC to accept an invite by token (requires auth)
CREATE OR REPLACE FUNCTION public.accept_employee_invite(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invite record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user email from profile
  SELECT email INTO v_user_email
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_user_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User has no email');
  END IF;

  -- Find the invite
  SELECT i.id, i.company_id, i.employee_id, i.email, i.role, i.status, i.expires_at
  INTO v_invite
  FROM public.employee_invites i
  WHERE i.token = p_token
  LIMIT 1;

  IF v_invite IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invite not found');
  END IF;

  IF v_invite.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Invite is not pending');
  END IF;

  IF v_invite.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Invite has expired');
  END IF;

  -- Check email matches
  IF lower(v_user_email) != lower(v_invite.email) THEN
    RETURN json_build_object('success', false, 'error', 'Email does not match invitation');
  END IF;

  -- Link employee to user
  UPDATE public.employees e
  SET user_id = v_user_id
  WHERE e.id = v_invite.employee_id
    AND e.company_id = v_invite.company_id
    AND e.user_id IS NULL;

  -- Create or update membership
  INSERT INTO public.memberships (
    company_id,
    user_id,
    role,
    status,
    member_type,
    employee_id
  ) VALUES (
    v_invite.company_id,
    v_user_id,
    v_invite.role::membership_role,
    'active',
    'internal',
    v_invite.employee_id
  )
  ON CONFLICT (company_id, user_id) DO UPDATE SET
    role = v_invite.role::membership_role,
    employee_id = v_invite.employee_id,
    status = 'active';

  -- Mark invite as accepted
  UPDATE public.employee_invites
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by = v_user_id
  WHERE id = v_invite.id;

  RETURN json_build_object(
    'success', true,
    'company_id', v_invite.company_id,
    'employee_id', v_invite.employee_id
  );
END;
$$;
-- 5) Grant execute permissions on public functions
GRANT EXECUTE ON FUNCTION public.get_employee_invite_public(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_employee_invite_public(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_employee_invite(text) TO authenticated;
