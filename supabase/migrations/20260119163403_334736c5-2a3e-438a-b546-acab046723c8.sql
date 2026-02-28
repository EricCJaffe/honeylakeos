-- Create SOP Ingestions table for AI Import mode
CREATE TABLE public.sop_ingestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'paste', 'interview')),
  source_text TEXT,
  source_file_path TEXT,
  source_file_name TEXT,
  source_file_size INTEGER,
  ai_output_json JSONB,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'needs_review', 'draft_created', 'in_approval', 'published', 'rejected')),
  rejection_reason TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);
-- Add indexes
CREATE INDEX idx_sop_ingestions_company_id ON public.sop_ingestions(company_id);
CREATE INDEX idx_sop_ingestions_department_id ON public.sop_ingestions(department_id);
CREATE INDEX idx_sop_ingestions_status ON public.sop_ingestions(status);
CREATE INDEX idx_sop_ingestions_created_by ON public.sop_ingestions(created_by);
-- Enable RLS
ALTER TABLE public.sop_ingestions ENABLE ROW LEVEL SECURITY;
-- RLS Policy: Users can view ingestions they created
CREATE POLICY "Users can view own ingestions"
ON public.sop_ingestions
FOR SELECT
USING (auth.uid() = created_by);
-- RLS Policy: Department managers can view all ingestions in their department
CREATE POLICY "Department managers can view department ingestions"
ON public.sop_ingestions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.department_members dm
    WHERE dm.department_id = sop_ingestions.department_id
    AND dm.user_id = auth.uid()
    AND dm.role = 'manager'
  )
);
-- RLS Policy: Company admins can view all ingestions
CREATE POLICY "Company admins can view all ingestions"
ON public.sop_ingestions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = sop_ingestions.company_id
    AND m.user_id = auth.uid()
    AND m.role = 'company_admin'
  )
);
-- RLS Policy: Users can create ingestions
CREATE POLICY "Users can create ingestions"
ON public.sop_ingestions
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = sop_ingestions.company_id
    AND m.user_id = auth.uid()
  )
);
-- RLS Policy: Users can update their own ingestions or department managers can update
CREATE POLICY "Users can update own ingestions"
ON public.sop_ingestions
FOR UPDATE
USING (
  auth.uid() = created_by
  OR EXISTS (
    SELECT 1 FROM public.department_members dm
    WHERE dm.department_id = sop_ingestions.department_id
    AND dm.user_id = auth.uid()
    AND dm.role = 'manager'
  )
  OR EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = sop_ingestions.company_id
    AND m.user_id = auth.uid()
    AND m.role = 'company_admin'
  )
);
-- Add AI-related fields to SOPs table
ALTER TABLE public.sops 
ADD COLUMN IF NOT EXISTS created_from_ingestion_id UUID REFERENCES public.sop_ingestions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_confidence_overall NUMERIC(3,2) CHECK (ai_confidence_overall >= 0 AND ai_confidence_overall <= 1),
ADD COLUMN IF NOT EXISTS ai_confidence_by_field JSONB;
-- Create index for ingestion lookup
CREATE INDEX idx_sops_ingestion_id ON public.sops(created_from_ingestion_id);
-- Create trigger for updated_at
CREATE TRIGGER update_sop_ingestions_updated_at
BEFORE UPDATE ON public.sop_ingestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create SOP Ingestion Audit Log table
CREATE TABLE public.sop_ingestion_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ingestion_id UUID NOT NULL REFERENCES public.sop_ingestions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_user_id UUID NOT NULL,
  old_status TEXT,
  new_status TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
-- Enable RLS on audit logs
ALTER TABLE public.sop_ingestion_audit_logs ENABLE ROW LEVEL SECURITY;
-- RLS Policy: Same visibility as ingestion
CREATE POLICY "Users can view audit logs for accessible ingestions"
ON public.sop_ingestion_audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sop_ingestions si
    WHERE si.id = sop_ingestion_audit_logs.ingestion_id
    AND (
      si.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.department_members dm
        WHERE dm.department_id = si.department_id
        AND dm.user_id = auth.uid()
        AND dm.role = 'manager'
      )
      OR EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.company_id = si.company_id
        AND m.user_id = auth.uid()
        AND m.role = 'company_admin'
      )
    )
  )
);
-- RLS Policy: Insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.sop_ingestion_audit_logs
FOR INSERT
WITH CHECK (auth.uid() = actor_user_id);
