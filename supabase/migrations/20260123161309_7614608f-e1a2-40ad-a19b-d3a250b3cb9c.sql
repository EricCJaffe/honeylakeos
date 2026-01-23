-- Add pack metadata columns to workflow templates
ALTER TABLE public.coaching_program_pack_workflow_templates 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS editable_fields JSONB NOT NULL DEFAULT '["name", "description", "is_active", "steps"]'::jsonb;

-- Add comments
COMMENT ON COLUMN public.coaching_program_pack_workflow_templates.is_locked IS 'If true, org admins cannot modify step structure';
COMMENT ON COLUMN public.coaching_program_pack_workflow_templates.editable_fields IS 'List of fields org admins can edit';

-- Set locked workflows for core lifecycle workflows
UPDATE public.coaching_program_pack_workflow_templates
SET is_locked = true, editable_fields = '["name", "description"]'::jsonb
WHERE workflow_type IN ('engagement_lifecycle');