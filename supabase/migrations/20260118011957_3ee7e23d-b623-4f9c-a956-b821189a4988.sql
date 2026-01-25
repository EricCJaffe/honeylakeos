-- Add visibility column to reports table
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'personal';

-- Add check constraint for visibility values (drop if exists first)
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_visibility_check;
ALTER TABLE public.reports 
ADD CONSTRAINT reports_visibility_check 
CHECK (visibility IN ('personal', 'company_shared', 'company_restricted'));

-- Create report_recent_runs table for tracking recently run reports
CREATE TABLE IF NOT EXISTS public.report_recent_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  config_hash text NOT NULL,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_run_at timestamptz NOT NULL DEFAULT now(),
  run_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id, config_hash)
);

-- Create report_visibility_roles for restricted visibility
CREATE TABLE IF NOT EXISTS public.report_visibility_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(report_id, role_id)
);

-- Create report_user_defaults for persisting user filter preferences
CREATE TABLE IF NOT EXISTS public.report_user_defaults (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  defaults_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id, report_type)
);

-- Enable RLS on new tables
ALTER TABLE public.report_recent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_visibility_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_user_defaults ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_report_recent_runs_user_company ON public.report_recent_runs(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_report_recent_runs_last_run ON public.report_recent_runs(last_run_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_visibility_roles_report ON public.report_visibility_roles(report_id);
CREATE INDEX IF NOT EXISTS idx_report_user_defaults_user_company ON public.report_user_defaults(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_reports_visibility ON public.reports(visibility);

-- RLS policies for report_recent_runs
DROP POLICY IF EXISTS "Users can view their own recent runs" ON public.report_recent_runs;
CREATE POLICY "Users can view their own recent runs"
ON public.report_recent_runs FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own recent runs" ON public.report_recent_runs;
CREATE POLICY "Users can insert their own recent runs"
ON public.report_recent_runs FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own recent runs" ON public.report_recent_runs;
CREATE POLICY "Users can update their own recent runs"
ON public.report_recent_runs FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own recent runs" ON public.report_recent_runs;
CREATE POLICY "Users can delete their own recent runs"
ON public.report_recent_runs FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for report_visibility_roles (company members can view, report owners and company_admin can modify)
DROP POLICY IF EXISTS "Company members can view report visibility roles" ON public.report_visibility_roles;
CREATE POLICY "Company members can view report visibility roles"
ON public.report_visibility_roles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.reports r
    JOIN public.memberships m ON m.company_id = r.company_id
    WHERE r.id = report_visibility_roles.report_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
  )
);

DROP POLICY IF EXISTS "Report owners and admins can manage visibility roles" ON public.report_visibility_roles;
CREATE POLICY "Report owners and admins can manage visibility roles"
ON public.report_visibility_roles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.reports r
    JOIN public.memberships m ON m.company_id = r.company_id
    WHERE r.id = report_visibility_roles.report_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND (m.role = 'company_admin' OR r.owner_user_id = auth.uid())
  )
);

-- RLS policies for report_user_defaults
DROP POLICY IF EXISTS "Users can view their own defaults" ON public.report_user_defaults;
CREATE POLICY "Users can view their own defaults"
ON public.report_user_defaults FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own defaults" ON public.report_user_defaults;
CREATE POLICY "Users can insert their own defaults"
ON public.report_user_defaults FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own defaults" ON public.report_user_defaults;
CREATE POLICY "Users can update their own defaults"
ON public.report_user_defaults FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own defaults" ON public.report_user_defaults;
CREATE POLICY "Users can delete their own defaults"
ON public.report_user_defaults FOR DELETE
USING (auth.uid() = user_id);

-- Update function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_report_user_defaults_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_report_user_defaults_updated_at ON public.report_user_defaults;
CREATE TRIGGER update_report_user_defaults_updated_at
BEFORE UPDATE ON public.report_user_defaults
FOR EACH ROW
EXECUTE FUNCTION public.update_report_user_defaults_updated_at();