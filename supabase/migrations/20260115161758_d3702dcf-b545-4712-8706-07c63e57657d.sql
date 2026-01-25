-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_user_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS: Company admins, site admins, and super admins can read audit logs
CREATE POLICY "audit_logs_select_admins"
ON public.audit_logs FOR SELECT
USING (
  is_company_admin(company_id) OR
  is_site_admin((SELECT c.site_id FROM public.companies c WHERE c.id = audit_logs.company_id)) OR
  is_super_admin()
);

-- RLS: Insert is allowed via SECURITY DEFINER function only (no direct inserts)
CREATE POLICY "audit_logs_insert_internal"
ON public.audit_logs FOR INSERT
WITH CHECK (false);

-- Helper function to log audit events (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_company_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_actor_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id uuid;
  v_actor uuid;
BEGIN
  -- Use provided actor or current user
  v_actor := COALESCE(p_actor_user_id, auth.uid());
  
  INSERT INTO public.audit_logs (
    company_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    p_company_id,
    v_actor,
    p_action,
    p_entity_type,
    p_entity_id,
    p_metadata
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- Trigger function for employees table
CREATE OR REPLACE FUNCTION public.audit_employees_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_metadata jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'employee.created';
    v_metadata := jsonb_build_object(
      'full_name', NEW.full_name,
      'email', NEW.email,
      'title', NEW.title,
      'status', NEW.status
    );
    PERFORM log_audit_event(NEW.company_id, v_action, 'employee', NEW.id, v_metadata);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Detect specific action
    IF OLD.status = 'active' AND NEW.status = 'archived' THEN
      v_action := 'employee.archived';
    ELSIF OLD.status = 'archived' AND NEW.status = 'active' THEN
      v_action := 'employee.restored';
    ELSIF OLD.user_id IS NULL AND NEW.user_id IS NOT NULL THEN
      v_action := 'employee.linked';
    ELSE
      v_action := 'employee.updated';
    END IF;
    
    v_metadata := jsonb_build_object(
      'full_name', NEW.full_name,
      'changes', jsonb_build_object(
        'status', CASE WHEN OLD.status != NEW.status THEN jsonb_build_object('from', OLD.status, 'to', NEW.status) ELSE NULL END,
        'email', CASE WHEN OLD.email IS DISTINCT FROM NEW.email THEN jsonb_build_object('from', OLD.email, 'to', NEW.email) ELSE NULL END,
        'title', CASE WHEN OLD.title IS DISTINCT FROM NEW.title THEN jsonb_build_object('from', OLD.title, 'to', NEW.title) ELSE NULL END,
        'user_id', CASE WHEN OLD.user_id IS DISTINCT FROM NEW.user_id THEN jsonb_build_object('from', OLD.user_id, 'to', NEW.user_id) ELSE NULL END
      )
    );
    PERFORM log_audit_event(NEW.company_id, v_action, 'employee', NEW.id, v_metadata);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'employee.deleted';
    v_metadata := jsonb_build_object(
      'full_name', OLD.full_name,
      'email', OLD.email
    );
    PERFORM log_audit_event(OLD.company_id, v_action, 'employee', OLD.id, v_metadata);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger function for group_members table
CREATE OR REPLACE FUNCTION public.audit_group_member_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_group_name text;
  v_action text;
  v_metadata jsonb;
BEGIN
  -- Get company_id from group
  IF TG_OP = 'DELETE' THEN
    SELECT g.company_id, g.name INTO v_company_id, v_group_name
    FROM public.groups g WHERE g.id = OLD.group_id;
  ELSE
    SELECT g.company_id, g.name INTO v_company_id, v_group_name
    FROM public.groups g WHERE g.id = NEW.group_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'group_member.added';
    v_metadata := jsonb_build_object(
      'group_id', NEW.group_id,
      'group_name', v_group_name,
      'user_id', NEW.user_id,
      'role', NEW.role
    );
    PERFORM log_audit_event(v_company_id, v_action, 'group_member', NEW.group_id, v_metadata);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role != NEW.role THEN
      v_action := 'group_member.role_changed';
      v_metadata := jsonb_build_object(
        'group_id', NEW.group_id,
        'group_name', v_group_name,
        'user_id', NEW.user_id,
        'from_role', OLD.role,
        'to_role', NEW.role
      );
      PERFORM log_audit_event(v_company_id, v_action, 'group_member', NEW.group_id, v_metadata);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'group_member.removed';
    v_metadata := jsonb_build_object(
      'group_id', OLD.group_id,
      'group_name', v_group_name,
      'user_id', OLD.user_id,
      'role', OLD.role
    );
    PERFORM log_audit_event(v_company_id, v_action, 'group_member', OLD.group_id, v_metadata);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger function for location_members table
CREATE OR REPLACE FUNCTION public.audit_location_member_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_location_name text;
  v_action text;
  v_metadata jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT l.company_id, l.name INTO v_company_id, v_location_name
    FROM public.locations l WHERE l.id = OLD.location_id;
  ELSE
    SELECT l.company_id, l.name INTO v_company_id, v_location_name
    FROM public.locations l WHERE l.id = NEW.location_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'location_member.added';
    v_metadata := jsonb_build_object(
      'location_id', NEW.location_id,
      'location_name', v_location_name,
      'user_id', NEW.user_id,
      'role', NEW.role
    );
    PERFORM log_audit_event(v_company_id, v_action, 'location_member', NEW.location_id, v_metadata);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role != NEW.role THEN
      v_action := 'location_member.role_changed';
      v_metadata := jsonb_build_object(
        'location_id', NEW.location_id,
        'location_name', v_location_name,
        'user_id', NEW.user_id,
        'from_role', OLD.role,
        'to_role', NEW.role
      );
      PERFORM log_audit_event(v_company_id, v_action, 'location_member', NEW.location_id, v_metadata);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'location_member.removed';
    v_metadata := jsonb_build_object(
      'location_id', OLD.location_id,
      'location_name', v_location_name,
      'user_id', OLD.user_id,
      'role', OLD.role
    );
    PERFORM log_audit_event(v_company_id, v_action, 'location_member', OLD.location_id, v_metadata);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger function for memberships (role changes)
CREATE OR REPLACE FUNCTION public.audit_membership_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_metadata jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'membership.created';
    v_metadata := jsonb_build_object(
      'user_id', NEW.user_id,
      'role', NEW.role,
      'status', NEW.status,
      'member_type', NEW.member_type
    );
    PERFORM log_audit_event(NEW.company_id, v_action, 'membership', NEW.id, v_metadata);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role != NEW.role THEN
      v_action := 'membership.role_changed';
      v_metadata := jsonb_build_object(
        'user_id', NEW.user_id,
        'from_role', OLD.role,
        'to_role', NEW.role
      );
      PERFORM log_audit_event(NEW.company_id, v_action, 'membership', NEW.id, v_metadata);
    ELSIF OLD.status != NEW.status THEN
      v_action := 'membership.status_changed';
      v_metadata := jsonb_build_object(
        'user_id', NEW.user_id,
        'from_status', OLD.status,
        'to_status', NEW.status
      );
      PERFORM log_audit_event(NEW.company_id, v_action, 'membership', NEW.id, v_metadata);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'membership.deleted';
    v_metadata := jsonb_build_object(
      'user_id', OLD.user_id,
      'role', OLD.role
    );
    PERFORM log_audit_event(OLD.company_id, v_action, 'membership', OLD.id, v_metadata);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger function for employee_invites
CREATE OR REPLACE FUNCTION public.audit_invite_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_metadata jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'invite.sent';
    v_metadata := jsonb_build_object(
      'email', NEW.email,
      'role', NEW.role,
      'employee_id', NEW.employee_id,
      'expires_at', NEW.expires_at
    );
    PERFORM log_audit_event(NEW.company_id, v_action, 'invite', NEW.id, v_metadata, NEW.created_by);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
      v_action := 'invite.accepted';
      v_metadata := jsonb_build_object(
        'email', NEW.email,
        'role', NEW.role,
        'employee_id', NEW.employee_id,
        'accepted_by', NEW.accepted_by
      );
      PERFORM log_audit_event(NEW.company_id, v_action, 'invite', NEW.id, v_metadata, NEW.accepted_by);
    ELSIF OLD.status = 'pending' AND NEW.status = 'revoked' THEN
      v_action := 'invite.revoked';
      v_metadata := jsonb_build_object(
        'email', NEW.email,
        'employee_id', NEW.employee_id
      );
      PERFORM log_audit_event(NEW.company_id, v_action, 'invite', NEW.id, v_metadata);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers
CREATE TRIGGER audit_employees_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.employees
FOR EACH ROW EXECUTE FUNCTION audit_employees_changes();

CREATE TRIGGER audit_group_members_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.group_members
FOR EACH ROW EXECUTE FUNCTION audit_group_member_changes();

CREATE TRIGGER audit_location_members_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.location_members
FOR EACH ROW EXECUTE FUNCTION audit_location_member_changes();

CREATE TRIGGER audit_memberships_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.memberships
FOR EACH ROW EXECUTE FUNCTION audit_membership_changes();

CREATE TRIGGER audit_invites_trigger
AFTER INSERT OR UPDATE ON public.employee_invites
FOR EACH ROW EXECUTE FUNCTION audit_invite_changes();