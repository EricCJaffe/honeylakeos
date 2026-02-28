-- 1) Create table public.employee_invites
CREATE TABLE public.employee_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'company_admin', 'location_admin', 'module_admin', 'external')),
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz NULL,
  accepted_by uuid NULL
);
-- Create index for token lookups
CREATE INDEX idx_employee_invites_token ON public.employee_invites(token);
CREATE INDEX idx_employee_invites_email ON public.employee_invites(email);
CREATE INDEX idx_employee_invites_employee_id ON public.employee_invites(employee_id);
-- 2) Enable RLS
ALTER TABLE public.employee_invites ENABLE ROW LEVEL SECURITY;
-- SELECT: company/site/super admins can view invites for their company
CREATE POLICY "employee_invites_select_admin"
ON public.employee_invites
FOR SELECT
TO authenticated
USING (
  is_company_admin(company_id) OR
  is_site_admin((SELECT site_id FROM public.companies WHERE id = company_id)) OR
  is_super_admin()
);
-- INSERT: company/site/super admins can create invites
CREATE POLICY "employee_invites_insert_admin"
ON public.employee_invites
FOR INSERT
TO authenticated
WITH CHECK (
  is_company_admin(company_id) OR
  is_site_admin((SELECT site_id FROM public.companies WHERE id = company_id)) OR
  is_super_admin()
);
-- UPDATE: company/site/super admins can revoke invites
CREATE POLICY "employee_invites_update_admin"
ON public.employee_invites
FOR UPDATE
TO authenticated
USING (
  is_company_admin(company_id) OR
  is_site_admin((SELECT site_id FROM public.companies WHERE id = company_id)) OR
  is_super_admin()
);
-- 3) Helper RPC: create_employee_invite
CREATE OR REPLACE FUNCTION public.create_employee_invite(
  p_employee_id uuid,
  p_role text DEFAULT 'user'
)
RETURNS TABLE(invite_id uuid, email text, token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Generate new token and create invite
  v_new_token := encode(gen_random_bytes(32), 'hex');
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
$$;
-- 4) Acceptance hook: accept_employee_invites_on_profile_upsert
CREATE OR REPLACE FUNCTION public.accept_employee_invites_on_profile_upsert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
BEGIN
  -- Only proceed if we have an email
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find all pending, non-expired invites for this email
  FOR v_invite IN
    SELECT i.id, i.company_id, i.employee_id, i.email, i.role
    FROM public.employee_invites i
    WHERE i.email = NEW.email
      AND i.status = 'pending'
      AND i.expires_at > now()
  LOOP
    -- Link the employee to this user (only if user_id is null and company matches)
    UPDATE public.employees e
    SET user_id = NEW.user_id
    WHERE e.id = v_invite.employee_id
      AND e.company_id = v_invite.company_id
      AND e.user_id IS NULL;

    -- Ensure membership exists
    INSERT INTO public.memberships (
      company_id,
      user_id,
      role,
      status,
      member_type,
      employee_id
    ) VALUES (
      v_invite.company_id,
      NEW.user_id,
      v_invite.role::membership_role,
      'active',
      'internal',
      v_invite.employee_id
    )
    ON CONFLICT (company_id, user_id) 
    WHERE (SELECT 1 FROM public.memberships WHERE company_id = v_invite.company_id AND user_id = NEW.user_id) IS NOT NULL
    DO NOTHING;

    -- Mark invite as accepted
    UPDATE public.employee_invites
    SET status = 'accepted',
        accepted_at = now(),
        accepted_by = NEW.user_id
    WHERE id = v_invite.id;
  END LOOP;

  RETURN NEW;
END;
$$;
-- Add unique constraint on memberships for upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_company_user 
ON public.memberships(company_id, user_id);
-- Create the trigger (drop existing one first if it exists, to update logic)
DROP TRIGGER IF EXISTS trigger_accept_employee_invites ON public.profiles;
CREATE TRIGGER trigger_accept_employee_invites
AFTER INSERT OR UPDATE OF email ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.accept_employee_invites_on_profile_upsert();
