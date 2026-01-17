-- Update task_lists table for personal list support
-- Add owner_user_id and is_personal columns
ALTER TABLE public.task_lists 
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT false;

-- Update existing lists to be company lists (not personal)
UPDATE public.task_lists SET is_personal = false WHERE is_personal IS NULL;

-- Allow company_id to be nullable for personal lists
ALTER TABLE public.task_lists ALTER COLUMN company_id DROP NOT NULL;

-- Add check constraint to ensure valid list type
ALTER TABLE public.task_lists DROP CONSTRAINT IF EXISTS task_lists_valid_scope;
ALTER TABLE public.task_lists ADD CONSTRAINT task_lists_valid_scope CHECK (
  (is_personal = true AND owner_user_id IS NOT NULL AND company_id IS NULL) OR
  (is_personal = false AND company_id IS NOT NULL)
);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "task_lists_select" ON public.task_lists;
DROP POLICY IF EXISTS "task_lists_insert" ON public.task_lists;
DROP POLICY IF EXISTS "task_lists_update" ON public.task_lists;
DROP POLICY IF EXISTS "task_lists_delete" ON public.task_lists;
DROP POLICY IF EXISTS "Allow members to view company task lists" ON public.task_lists;
DROP POLICY IF EXISTS "Allow admins to manage company task lists" ON public.task_lists;

-- Enable RLS
ALTER TABLE public.task_lists ENABLE ROW LEVEL SECURITY;

-- RLS: Personal lists - owner only
-- RLS: Company lists - company members can view, admins can manage
CREATE POLICY "task_lists_select" ON public.task_lists FOR SELECT USING (
  (is_personal = true AND owner_user_id = auth.uid()) OR
  (is_personal = false AND company_id IS NOT NULL AND public.is_company_member(company_id))
);

CREATE POLICY "task_lists_insert" ON public.task_lists FOR INSERT WITH CHECK (
  (is_personal = true AND owner_user_id = auth.uid()) OR
  (is_personal = false AND company_id IS NOT NULL AND public.is_company_admin(company_id))
);

CREATE POLICY "task_lists_update" ON public.task_lists FOR UPDATE USING (
  (is_personal = true AND owner_user_id = auth.uid()) OR
  (is_personal = false AND company_id IS NOT NULL AND public.is_company_admin(company_id))
);

CREATE POLICY "task_lists_delete" ON public.task_lists FOR DELETE USING (
  (is_personal = true AND owner_user_id = auth.uid()) OR
  (is_personal = false AND company_id IS NOT NULL AND public.is_company_admin(company_id))
);

-- Create audit trigger for task lists
CREATE OR REPLACE FUNCTION public.audit_task_list_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      company_id,
      entity_type,
      entity_id,
      action,
      actor_user_id,
      metadata
    ) VALUES (
      COALESCE(NEW.company_id, (SELECT id FROM companies LIMIT 1)),
      'task_list',
      NEW.id,
      'task_list.created',
      auth.uid(),
      jsonb_build_object('name', NEW.name, 'is_personal', NEW.is_personal)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      company_id,
      entity_type,
      entity_id,
      action,
      actor_user_id,
      metadata
    ) VALUES (
      COALESCE(NEW.company_id, (SELECT id FROM companies LIMIT 1)),
      'task_list',
      NEW.id,
      'task_list.updated',
      auth.uid(),
      jsonb_build_object('name', NEW.name, 'is_personal', NEW.is_personal)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      company_id,
      entity_type,
      entity_id,
      action,
      actor_user_id,
      metadata
    ) VALUES (
      COALESCE(OLD.company_id, (SELECT id FROM companies LIMIT 1)),
      'task_list',
      OLD.id,
      'task_list.deleted',
      auth.uid(),
      jsonb_build_object('name', OLD.name, 'is_personal', OLD.is_personal)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS task_list_audit_trigger ON public.task_lists;
CREATE TRIGGER task_list_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.task_lists
FOR EACH ROW EXECUTE FUNCTION public.audit_task_list_changes();