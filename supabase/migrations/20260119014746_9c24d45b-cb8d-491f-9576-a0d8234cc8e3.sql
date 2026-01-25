-- Fix create_employee_invite function to use schema-qualified gen_random_bytes
CREATE OR REPLACE FUNCTION public.create_employee_invite(
  p_employee_id uuid,
  p_invited_by uuid,
  p_role text DEFAULT 'member'
)
RETURNS TABLE(invite_id uuid, token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_record RECORD;
  v_company_id uuid;
  v_new_invite_id uuid;
  v_new_token text;
  v_expires_at timestamptz;
BEGIN
  -- Get the employee record and verify it exists
  SELECT e.id, e.company_id, e.work_email, e.full_name
  INTO v_employee_record
  FROM employees e
  WHERE e.id = p_employee_id;

  IF v_employee_record IS NULL THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;

  v_company_id := v_employee_record.company_id;

  -- Check if inviter has permission (must be admin/owner of the company)
  IF NOT EXISTS (
    SELECT 1 FROM company_members cm
    WHERE cm.company_id = v_company_id
      AND cm.user_id = p_invited_by
      AND cm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'You do not have permission to invite employees';
  END IF;

  -- Check if employee already has a user_id (already linked to a user)
  IF v_employee_record.id IN (SELECT id FROM employees WHERE user_id IS NOT NULL AND id = p_employee_id) THEN
    -- Check if there's an existing employee with user_id
    IF EXISTS (SELECT 1 FROM employees WHERE id = p_employee_id AND user_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Employee is already linked to a user account';
    END IF;
  END IF;

  -- Expire any existing pending invites for this employee
  UPDATE employee_invites
  SET status = 'expired'
  WHERE employee_id = p_employee_id
    AND status = 'pending';

  -- Generate new token and expiration using schema-qualified function
  v_new_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '7 days';
  v_new_invite_id := gen_random_uuid();

  -- Create the new invite
  INSERT INTO employee_invites (
    id,
    employee_id,
    company_id,
    token,
    invited_by,
    role,
    status,
    expires_at
  ) VALUES (
    v_new_invite_id,
    p_employee_id,
    v_company_id,
    v_new_token,
    p_invited_by,
    p_role,
    'pending',
    v_expires_at
  );

  RETURN QUERY SELECT v_new_invite_id, v_new_token, v_expires_at;
END;
$$;