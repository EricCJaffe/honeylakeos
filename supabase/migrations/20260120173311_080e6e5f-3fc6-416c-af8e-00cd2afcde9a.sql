-- Fix the accept_employee_invites_on_profile_upsert function
-- The issue was using a subquery in ON CONFLICT WHERE clause which is not allowed in PostgreSQL
CREATE OR REPLACE FUNCTION public.accept_employee_invites_on_profile_upsert()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_invite record;
  v_membership_exists boolean;
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

    -- Check if membership already exists
    SELECT EXISTS(
      SELECT 1 FROM public.memberships 
      WHERE company_id = v_invite.company_id AND user_id = NEW.user_id
    ) INTO v_membership_exists;

    -- Only insert membership if it doesn't exist
    IF NOT v_membership_exists THEN
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
      );
    END IF;

    -- Mark invite as accepted
    UPDATE public.employee_invites
    SET status = 'accepted',
        accepted_at = now(),
        accepted_by = NEW.user_id
    WHERE id = v_invite.id;
  END LOOP;

  RETURN NEW;
END;
$function$;
