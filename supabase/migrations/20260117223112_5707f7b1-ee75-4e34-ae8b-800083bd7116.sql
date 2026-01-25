-- Create report type enum
CREATE TYPE public.report_type AS ENUM (
  'tasks_by_status',
  'tasks_by_assignee',
  'tasks_due_soon',
  'tasks_overdue',
  'projects_by_phase',
  'projects_active_completed',
  'crm_pipeline_totals',
  'crm_opportunities_won_lost',
  'donors_by_campaign',
  'donor_retention',
  'invoices_by_status',
  'receipts_by_tag'
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_personal BOOLEAN NOT NULL DEFAULT false,
  report_type public.report_type NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report_runs table for caching expensive queries
CREATE TABLE public.report_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  result_json JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 hour'),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies for reports
-- Users can view personal reports they own
CREATE POLICY "Users can view their own personal reports"
ON public.reports
FOR SELECT
USING (
  is_personal = true 
  AND owner_user_id = auth.uid()
);

-- Users can view company reports if they're a member
CREATE POLICY "Company members can view company reports"
ON public.reports
FOR SELECT
USING (
  is_personal = false 
  AND EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE memberships.company_id = reports.company_id 
    AND memberships.user_id = auth.uid()
  )
);

-- Users can create reports in their company
CREATE POLICY "Company members can create reports"
ON public.reports
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE memberships.company_id = reports.company_id 
    AND memberships.user_id = auth.uid()
  )
);

-- Users can update their own personal reports
CREATE POLICY "Users can update their own personal reports"
ON public.reports
FOR UPDATE
USING (
  is_personal = true 
  AND owner_user_id = auth.uid()
);

-- Admins can update company reports (using correct enum value)
CREATE POLICY "Admins can update company reports"
ON public.reports
FOR UPDATE
USING (
  is_personal = false 
  AND EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE memberships.company_id = reports.company_id 
    AND memberships.user_id = auth.uid()
    AND memberships.role = 'company_admin'
  )
);

-- Users can delete their own personal reports
CREATE POLICY "Users can delete their own personal reports"
ON public.reports
FOR DELETE
USING (
  is_personal = true 
  AND owner_user_id = auth.uid()
);

-- Admins can delete company reports (using correct enum value)
CREATE POLICY "Admins can delete company reports"
ON public.reports
FOR DELETE
USING (
  is_personal = false 
  AND EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE memberships.company_id = reports.company_id 
    AND memberships.user_id = auth.uid()
    AND memberships.role = 'company_admin'
  )
);

-- RLS policies for report_runs
CREATE POLICY "Users can view report runs for accessible reports"
ON public.report_runs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.reports 
    WHERE reports.id = report_runs.report_id
    AND (
      (reports.is_personal = true AND reports.owner_user_id = auth.uid())
      OR (reports.is_personal = false AND EXISTS (
        SELECT 1 FROM public.memberships 
        WHERE memberships.company_id = reports.company_id 
        AND memberships.user_id = auth.uid()
      ))
    )
  )
);

CREATE POLICY "Users can create report runs for accessible reports"
ON public.report_runs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.reports 
    WHERE reports.id = report_runs.report_id
    AND (
      (reports.is_personal = true AND reports.owner_user_id = auth.uid())
      OR (reports.is_personal = false AND EXISTS (
        SELECT 1 FROM public.memberships 
        WHERE memberships.company_id = reports.company_id 
        AND memberships.user_id = auth.uid()
      ))
    )
  )
);

-- Indexes
CREATE INDEX idx_reports_company_id ON public.reports(company_id);
CREATE INDEX idx_reports_owner_user_id ON public.reports(owner_user_id);
CREATE INDEX idx_reports_report_type ON public.reports(report_type);
CREATE INDEX idx_report_runs_report_id ON public.report_runs(report_id);
CREATE INDEX idx_report_runs_expires_at ON public.report_runs(expires_at);

-- Trigger for updated_at
CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();