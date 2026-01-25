-- =============================================================================
-- Saved Views for Documents and Notes
-- =============================================================================

-- Create saved_views table
CREATE TABLE IF NOT EXISTS public.saved_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL CHECK (module IN ('documents', 'notes')),
  name TEXT NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  is_personal BOOLEAN NOT NULL DEFAULT true,
  config_json JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure personal views have owner, company views have company
  CONSTRAINT saved_views_scope_check CHECK (
    (is_personal = true AND owner_user_id IS NOT NULL) OR
    (is_personal = false AND company_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_views_owner ON public.saved_views(owner_user_id) WHERE is_personal = true;
CREATE INDEX IF NOT EXISTS idx_saved_views_company ON public.saved_views(company_id) WHERE is_personal = false;
CREATE INDEX IF NOT EXISTS idx_saved_views_module ON public.saved_views(module);

-- Enable RLS
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Personal views: owner only
CREATE POLICY "Users can view their own saved views"
  ON public.saved_views FOR SELECT
  USING (
    (is_personal = true AND owner_user_id = auth.uid())
    OR
    (is_personal = false AND company_id IN (
      SELECT m.company_id FROM public.memberships m WHERE m.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create personal saved views"
  ON public.saved_views FOR INSERT
  WITH CHECK (
    (is_personal = true AND owner_user_id = auth.uid())
    OR
    (is_personal = false AND company_id IN (
      SELECT m.company_id FROM public.memberships m WHERE m.user_id = auth.uid() AND m.role = 'company_admin'
    ))
  );

CREATE POLICY "Users can update their saved views"
  ON public.saved_views FOR UPDATE
  USING (
    (is_personal = true AND owner_user_id = auth.uid())
    OR
    (is_personal = false AND company_id IN (
      SELECT m.company_id FROM public.memberships m WHERE m.user_id = auth.uid() AND m.role = 'company_admin'
    ))
  );

CREATE POLICY "Users can delete their saved views"
  ON public.saved_views FOR DELETE
  USING (
    (is_personal = true AND owner_user_id = auth.uid())
    OR
    (is_personal = false AND company_id IN (
      SELECT m.company_id FROM public.memberships m WHERE m.user_id = auth.uid() AND m.role = 'company_admin'
    ))
  );

-- Audit trigger for saved views
CREATE OR REPLACE FUNCTION public.audit_saved_view_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_action TEXT;
BEGIN
  -- Determine company_id
  IF TG_OP = 'DELETE' THEN
    v_company_id := COALESCE(OLD.company_id, (
      SELECT m.company_id FROM memberships m WHERE m.user_id = OLD.owner_user_id LIMIT 1
    ));
  ELSE
    v_company_id := COALESCE(NEW.company_id, (
      SELECT m.company_id FROM memberships m WHERE m.user_id = NEW.owner_user_id LIMIT 1
    ));
  END IF;

  IF v_company_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'saved_view.created';
    INSERT INTO audit_logs (company_id, entity_type, entity_id, action, actor_user_id, metadata)
    VALUES (v_company_id, 'saved_view', NEW.id, v_action, auth.uid(), jsonb_build_object(
      'name', NEW.name,
      'module', NEW.module,
      'is_personal', NEW.is_personal
    ));
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'saved_view.updated';
    INSERT INTO audit_logs (company_id, entity_type, entity_id, action, actor_user_id, metadata)
    VALUES (v_company_id, 'saved_view', NEW.id, v_action, auth.uid(), jsonb_build_object(
      'name', NEW.name,
      'module', NEW.module
    ));
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'saved_view.deleted';
    INSERT INTO audit_logs (company_id, entity_type, entity_id, action, actor_user_id, metadata)
    VALUES (v_company_id, 'saved_view', OLD.id, v_action, auth.uid(), jsonb_build_object(
      'name', OLD.name,
      'module', OLD.module
    ));
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_saved_view_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.saved_views
  FOR EACH ROW EXECUTE FUNCTION public.audit_saved_view_changes();

-- Update timestamp trigger
CREATE TRIGGER update_saved_views_updated_at
  BEFORE UPDATE ON public.saved_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();