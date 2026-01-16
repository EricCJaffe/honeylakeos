-- Create forms table
CREATE TABLE public.forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  settings JSONB DEFAULT '{}'::jsonb,
  -- Workflow action settings
  action_create_contact BOOLEAN DEFAULT false,
  action_create_crm BOOLEAN DEFAULT false,
  action_crm_lifecycle_status TEXT DEFAULT 'prospect',
  action_create_task BOOLEAN DEFAULT false,
  action_task_title_template TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create form_fields table (normalized)
CREATE TABLE public.form_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  field_type TEXT NOT NULL CHECK (field_type IN ('short_text', 'long_text', 'email', 'phone', 'dropdown', 'checkbox', 'date')),
  label TEXT NOT NULL,
  placeholder TEXT,
  helper_text TEXT,
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  options JSONB DEFAULT '[]'::jsonb, -- For dropdown options
  validation_rules JSONB DEFAULT '{}'::jsonb,
  -- Field mapping for workflow actions
  maps_to TEXT CHECK (maps_to IN ('contact_name', 'contact_email', 'contact_phone', 'contact_organization', 'crm_notes', NULL)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create form_submissions table
CREATE TABLE public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  submitted_by UUID, -- NULL for public submissions
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Captured submitter info (from mapped fields)
  submitter_name TEXT,
  submitter_email TEXT,
  submitter_phone TEXT,
  -- Linked records created by workflow
  created_external_contact_id UUID REFERENCES public.external_contacts(id) ON DELETE SET NULL,
  created_crm_client_id UUID REFERENCES public.crm_clients(id) ON DELETE SET NULL,
  created_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create form_submission_values table (normalized)
CREATE TABLE public.form_submission_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.form_fields(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_submission_field UNIQUE (submission_id, field_id)
);

-- Create indexes
CREATE INDEX idx_forms_company_id ON public.forms(company_id);
CREATE INDEX idx_forms_status ON public.forms(status);
CREATE INDEX idx_form_fields_form_id ON public.form_fields(form_id);
CREATE INDEX idx_form_fields_sort_order ON public.form_fields(form_id, sort_order);
CREATE INDEX idx_form_submissions_form_id ON public.form_submissions(form_id);
CREATE INDEX idx_form_submissions_company_id ON public.form_submissions(company_id);
CREATE INDEX idx_form_submissions_submitted_at ON public.form_submissions(submitted_at);
CREATE INDEX idx_form_submission_values_submission_id ON public.form_submission_values(submission_id);

-- Enable RLS on all tables
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submission_values ENABLE ROW LEVEL SECURITY;

-- RLS policies for forms
CREATE POLICY "Company members can view forms"
  ON public.forms FOR SELECT
  USING (is_company_member(company_id));

CREATE POLICY "Company members can create forms"
  ON public.forms FOR INSERT
  WITH CHECK (is_company_member(company_id));

CREATE POLICY "Company members can update forms"
  ON public.forms FOR UPDATE
  USING (is_company_member(company_id));

CREATE POLICY "Company admins can delete forms"
  ON public.forms FOR DELETE
  USING (is_company_admin(company_id));

-- RLS policies for form_fields (inherit from form)
CREATE POLICY "Company members can view form fields"
  ON public.form_fields FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.forms f 
    WHERE f.id = form_id AND is_company_member(f.company_id)
  ));

CREATE POLICY "Company members can create form fields"
  ON public.form_fields FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.forms f 
    WHERE f.id = form_id AND is_company_member(f.company_id)
  ));

CREATE POLICY "Company members can update form fields"
  ON public.form_fields FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.forms f 
    WHERE f.id = form_id AND is_company_member(f.company_id)
  ));

CREATE POLICY "Company members can delete form fields"
  ON public.form_fields FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.forms f 
    WHERE f.id = form_id AND is_company_member(f.company_id)
  ));

-- RLS policies for form_submissions
CREATE POLICY "Company members can view submissions"
  ON public.form_submissions FOR SELECT
  USING (is_company_member(company_id));

CREATE POLICY "Company members can create submissions"
  ON public.form_submissions FOR INSERT
  WITH CHECK (is_company_member(company_id));

CREATE POLICY "Company admins can delete submissions"
  ON public.form_submissions FOR DELETE
  USING (is_company_admin(company_id));

-- RLS policies for form_submission_values
CREATE POLICY "Company members can view submission values"
  ON public.form_submission_values FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.form_submissions s 
    WHERE s.id = submission_id AND is_company_member(s.company_id)
  ));

CREATE POLICY "Company members can create submission values"
  ON public.form_submission_values FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.form_submissions s 
    WHERE s.id = submission_id AND is_company_member(s.company_id)
  ));

-- Add updated_at triggers
CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_form_fields_updated_at
  BEFORE UPDATE ON public.form_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the forms module
INSERT INTO public.modules (id, slug, name, description, category, is_public)
VALUES (
  gen_random_uuid(),
  'forms',
  'Forms & Workflows',
  'Create forms to collect data and automate record creation',
  'automation',
  true
)
ON CONFLICT (slug) DO NOTHING;