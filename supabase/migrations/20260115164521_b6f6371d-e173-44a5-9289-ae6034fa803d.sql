-- Update the audit_invite_changes trigger to use new action format
CREATE OR REPLACE FUNCTION public.audit_invite_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_action text;
  v_metadata jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'employee.invite.created';
    v_metadata := jsonb_build_object(
      'email', NEW.email,
      'role', NEW.role,
      'employee_id', NEW.employee_id,
      'expires_at', NEW.expires_at
    );
    PERFORM log_audit_event(NEW.company_id, v_action, 'employee_invite', NEW.id, v_metadata, NEW.created_by);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
      v_action := 'employee.invite.accepted';
      v_metadata := jsonb_build_object(
        'email', NEW.email,
        'role', NEW.role,
        'employee_id', NEW.employee_id,
        'accepted_by', NEW.accepted_by
      );
      PERFORM log_audit_event(NEW.company_id, v_action, 'employee_invite', NEW.id, v_metadata, NEW.accepted_by);
    ELSIF OLD.status = 'pending' AND NEW.status = 'revoked' THEN
      v_action := 'employee.invite.revoked';
      v_metadata := jsonb_build_object(
        'email', NEW.email,
        'employee_id', NEW.employee_id
      );
      PERFORM log_audit_event(NEW.company_id, v_action, 'employee_invite', NEW.id, v_metadata);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$;