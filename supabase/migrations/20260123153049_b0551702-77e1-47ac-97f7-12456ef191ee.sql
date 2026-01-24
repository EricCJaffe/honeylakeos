-- Add base_key and program_key to wf_forms for resolution
ALTER TABLE public.wf_forms 
ADD COLUMN IF NOT EXISTS base_key TEXT,
ADD COLUMN IF NOT EXISTS program_key TEXT DEFAULT 'generic',
ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add attached_form_base_key to workflow steps (stores base key, not full key)
ALTER TABLE public.coaching_org_workflow_steps
ADD COLUMN IF NOT EXISTS attached_form_base_key TEXT;

-- Add attached_form_base_key to pack workflow steps
ALTER TABLE public.coaching_program_pack_workflow_steps
ADD COLUMN IF NOT EXISTS attached_form_base_key TEXT;

-- Create index for form resolution lookups
CREATE INDEX IF NOT EXISTS idx_wf_forms_base_key ON public.wf_forms(base_key);
CREATE INDEX IF NOT EXISTS idx_wf_forms_program_key ON public.wf_forms(program_key);
CREATE INDEX IF NOT EXISTS idx_wf_forms_resolution ON public.wf_forms(base_key, program_key, is_active);

-- Backfill base_key from existing template_key (extract after first underscore)
UPDATE public.wf_forms 
SET base_key = CASE 
  WHEN template_key LIKE 'generic_%' THEN SUBSTRING(template_key FROM 9)
  WHEN template_key LIKE 'convene_%' THEN SUBSTRING(template_key FROM 9)
  WHEN template_key LIKE 'c12_%' THEN SUBSTRING(template_key FROM 5)
  WHEN template_key LIKE 'eos_%' THEN SUBSTRING(template_key FROM 5)
  ELSE template_key
END,
program_key = CASE
  WHEN template_key LIKE 'generic_%' THEN 'generic'
  WHEN template_key LIKE 'convene_%' THEN 'convene'
  WHEN template_key LIKE 'c12_%' THEN 'c12'
  WHEN template_key LIKE 'eos_%' THEN 'eos'
  ELSE 'generic'
END
WHERE template_key IS NOT NULL AND base_key IS NULL;

-- Backfill attached_form_base_key from attached_form_template_key
UPDATE public.coaching_org_workflow_steps
SET attached_form_base_key = CASE 
  WHEN attached_form_template_key LIKE 'generic_%' THEN SUBSTRING(attached_form_template_key FROM 9)
  WHEN attached_form_template_key LIKE 'convene_%' THEN SUBSTRING(attached_form_template_key FROM 9)
  WHEN attached_form_template_key LIKE 'c12_%' THEN SUBSTRING(attached_form_template_key FROM 5)
  WHEN attached_form_template_key LIKE 'eos_%' THEN SUBSTRING(attached_form_template_key FROM 5)
  ELSE attached_form_template_key
END
WHERE attached_form_template_key IS NOT NULL AND attached_form_base_key IS NULL;

-- Comment on new columns
COMMENT ON COLUMN public.wf_forms.base_key IS 'Base form identifier without program prefix (e.g. member_covenant)';
COMMENT ON COLUMN public.wf_forms.program_key IS 'Program pack this form belongs to (generic, convene, etc.)';
COMMENT ON COLUMN public.wf_forms.version IS 'Form version for tracking changes';
COMMENT ON COLUMN public.wf_forms.is_active IS 'Whether this form version is active for resolution';
COMMENT ON COLUMN public.coaching_org_workflow_steps.attached_form_base_key IS 'Base key for form resolution (without program prefix)';