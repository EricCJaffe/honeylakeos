-- Create COA templates table (site-scoped or global)
CREATE TABLE IF NOT EXISTS public.coa_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_json JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for lookup
CREATE INDEX idx_coa_templates_site ON public.coa_templates(site_id);

-- Enable RLS
ALTER TABLE public.coa_templates ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can read templates (they're reference data)
CREATE POLICY "coa_templates_select" ON public.coa_templates
  FOR SELECT USING (true);

-- RLS: Only site admins can manage templates
CREATE POLICY "coa_templates_insert" ON public.coa_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.site_memberships sm
      WHERE sm.user_id = auth.uid()
      AND sm.role IN ('site_admin', 'super_admin')
    )
  );

CREATE POLICY "coa_templates_update" ON public.coa_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.site_memberships sm
      WHERE sm.user_id = auth.uid()
      AND sm.role IN ('site_admin', 'super_admin')
    )
  );

CREATE POLICY "coa_templates_delete" ON public.coa_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.site_memberships sm
      WHERE sm.user_id = auth.uid()
      AND sm.role IN ('site_admin', 'super_admin')
    )
  );

-- Create COA import jobs table
CREATE TABLE IF NOT EXISTS public.coa_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  source_filename TEXT,
  mapping_json JSONB,
  row_count INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

-- Index for company lookup
CREATE INDEX idx_coa_import_jobs_company ON public.coa_import_jobs(company_id);

-- Enable RLS
ALTER TABLE public.coa_import_jobs ENABLE ROW LEVEL SECURITY;

-- RLS: Finance admins can manage import jobs
CREATE POLICY "coa_import_jobs_all" ON public.coa_import_jobs
  FOR ALL USING (public.is_finance_admin(company_id));

-- Add indexes to finance_accounts for better COA queries
CREATE INDEX IF NOT EXISTS idx_finance_accounts_company_type 
  ON public.finance_accounts(company_id, account_type);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_company_name 
  ON public.finance_accounts(company_id, name);
CREATE INDEX IF NOT EXISTS idx_finance_accounts_active 
  ON public.finance_accounts(company_id, is_active) WHERE is_active = true;