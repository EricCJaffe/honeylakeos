-- Workflow Governance v1 - Add ownership & versioning metadata

-- Add published_by to wf_workflows to track who published
ALTER TABLE public.wf_workflows ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES auth.users(id);
-- Add published_by to wf_forms to track who published
ALTER TABLE public.wf_forms ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES auth.users(id);
-- Add definition_published_at to wf_workflow_runs for lightweight versioning
-- This captures which version of the workflow definition was used when the run started
ALTER TABLE public.wf_workflow_runs ADD COLUMN IF NOT EXISTS definition_published_at TIMESTAMP WITH TIME ZONE;
-- Add cancellation_reason to wf_workflow_runs for admin cancellation tracking
ALTER TABLE public.wf_workflow_runs ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.wf_workflow_runs ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);
-- Add reassigned_by to wf_workflow_step_runs for tracking step reassignment
ALTER TABLE public.wf_workflow_step_runs ADD COLUMN IF NOT EXISTS reassigned_by UUID REFERENCES auth.users(id);
ALTER TABLE public.wf_workflow_step_runs ADD COLUMN IF NOT EXISTS reassigned_from_user_id UUID REFERENCES auth.users(id);
-- Add skip_reason to wf_workflow_step_runs for admin skip tracking
ALTER TABLE public.wf_workflow_step_runs ADD COLUMN IF NOT EXISTS skip_reason TEXT;
