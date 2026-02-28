-- ============================================================
-- PROMPT 5: Templates System for Tasks/Projects/Notes/Documents/Events
-- ============================================================

-- 1) Create templates table
CREATE TABLE IF NOT EXISTS public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_type text NOT NULL CHECK (template_type IN ('task', 'project', 'note', 'document', 'event')),
  name text NOT NULL,
  description text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_template_name UNIQUE (company_id, template_type, name)
);
-- Indexes for templates
CREATE INDEX idx_templates_company ON public.templates(company_id);
CREATE INDEX idx_templates_type ON public.templates(company_id, template_type);
CREATE INDEX idx_templates_active ON public.templates(company_id, is_active) WHERE is_active = true;
-- Enable RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
-- RLS Policies for templates
-- SELECT: company members can view active templates
CREATE POLICY "templates_select_company_member"
  ON public.templates FOR SELECT
  USING (is_company_member(company_id) AND (is_active = true OR is_company_admin(company_id)));
-- INSERT: only admins can create templates
CREATE POLICY "templates_insert_admin"
  ON public.templates FOR INSERT
  WITH CHECK (
    is_company_admin(company_id) OR 
    is_site_admin((SELECT site_id FROM public.companies WHERE id = templates.company_id)) OR
    is_super_admin()
  );
-- UPDATE: only admins can update templates
CREATE POLICY "templates_update_admin"
  ON public.templates FOR UPDATE
  USING (
    is_company_admin(company_id) OR 
    is_site_admin((SELECT site_id FROM public.companies WHERE id = templates.company_id)) OR
    is_super_admin()
  );
-- DELETE: only admins can delete templates
CREATE POLICY "templates_delete_admin"
  ON public.templates FOR DELETE
  USING (
    is_company_admin(company_id) OR 
    is_site_admin((SELECT site_id FROM public.companies WHERE id = templates.company_id)) OR
    is_super_admin()
  );
-- Create trigger for updated_at
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
