-- =============================================
-- Sales & Marketing Module v1
-- =============================================

-- Register the sales module
INSERT INTO modules (slug, name, description, category, is_public, version)
VALUES ('sales', 'Sales & Marketing', 'Pipelines, opportunities, and campaign tracking', 'premium', true, 1)
ON CONFLICT (slug) DO NOTHING;
-- =============================================
-- SALES PIPELINES
-- =============================================
CREATE TABLE IF NOT EXISTS public.sales_pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Ensure only one default pipeline per company
CREATE UNIQUE INDEX IF NOT EXISTS sales_pipelines_default_idx ON public.sales_pipelines (company_id) WHERE is_default = true AND archived_at IS NULL;
ALTER TABLE public.sales_pipelines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_pipelines_select" ON public.sales_pipelines;
CREATE POLICY "sales_pipelines_select" ON public.sales_pipelines
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = sales_pipelines.company_id AND m.slug = 'sales' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "sales_pipelines_insert" ON public.sales_pipelines;
CREATE POLICY "sales_pipelines_insert" ON public.sales_pipelines
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = sales_pipelines.company_id AND m.slug = 'sales' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "sales_pipelines_update" ON public.sales_pipelines;
CREATE POLICY "sales_pipelines_update" ON public.sales_pipelines
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid() AND role = 'company_admin')
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = sales_pipelines.company_id AND m.slug = 'sales' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "sales_pipelines_delete" ON public.sales_pipelines;
CREATE POLICY "sales_pipelines_delete" ON public.sales_pipelines
  FOR DELETE USING (false);
-- =============================================
-- SALES PIPELINE STAGES
-- =============================================
CREATE TABLE IF NOT EXISTS public.sales_pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.sales_pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  probability_percent INTEGER CHECK (probability_percent >= 0 AND probability_percent <= 100),
  is_closed_won BOOLEAN NOT NULL DEFAULT false,
  is_closed_lost BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_pipeline_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_pipeline_stages_select" ON public.sales_pipeline_stages;
CREATE POLICY "sales_pipeline_stages_select" ON public.sales_pipeline_stages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sales_pipelines sp WHERE sp.id = pipeline_id AND sp.company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid()))
  );
DROP POLICY IF EXISTS "sales_pipeline_stages_insert" ON public.sales_pipeline_stages;
CREATE POLICY "sales_pipeline_stages_insert" ON public.sales_pipeline_stages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sales_pipelines sp WHERE sp.id = pipeline_id AND sp.company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid() AND role = 'company_admin'))
  );
DROP POLICY IF EXISTS "sales_pipeline_stages_update" ON public.sales_pipeline_stages;
CREATE POLICY "sales_pipeline_stages_update" ON public.sales_pipeline_stages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM sales_pipelines sp WHERE sp.id = pipeline_id AND sp.company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid() AND role = 'company_admin'))
  );
DROP POLICY IF EXISTS "sales_pipeline_stages_delete" ON public.sales_pipeline_stages;
CREATE POLICY "sales_pipeline_stages_delete" ON public.sales_pipeline_stages
  FOR DELETE USING (false);
-- =============================================
-- SALES CAMPAIGNS
-- =============================================
DO $$ BEGIN
  CREATE TYPE public.campaign_type AS ENUM ('email', 'event', 'referral', 'content', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS public.sales_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.campaign_type NOT NULL DEFAULT 'other',
  start_date DATE,
  end_date DATE,
  description TEXT,
  archived_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_campaigns_select" ON public.sales_campaigns;
CREATE POLICY "sales_campaigns_select" ON public.sales_campaigns
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = sales_campaigns.company_id AND m.slug = 'sales' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "sales_campaigns_insert" ON public.sales_campaigns;
CREATE POLICY "sales_campaigns_insert" ON public.sales_campaigns
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = sales_campaigns.company_id AND m.slug = 'sales' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "sales_campaigns_update" ON public.sales_campaigns;
CREATE POLICY "sales_campaigns_update" ON public.sales_campaigns
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid() AND role = 'company_admin')
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = sales_campaigns.company_id AND m.slug = 'sales' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "sales_campaigns_delete" ON public.sales_campaigns;
CREATE POLICY "sales_campaigns_delete" ON public.sales_campaigns
  FOR DELETE USING (false);
-- =============================================
-- SALES OPPORTUNITIES
-- =============================================
DO $$ BEGIN
  CREATE TYPE public.opportunity_status AS ENUM ('open', 'won', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS public.sales_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES public.sales_pipelines(id),
  stage_id UUID NOT NULL REFERENCES public.sales_pipeline_stages(id),
  name TEXT NOT NULL,
  crm_client_id UUID REFERENCES public.crm_clients(id),
  owner_user_id UUID,
  value_amount DECIMAL(15, 2),
  expected_close_date DATE,
  source_campaign_id UUID REFERENCES public.sales_campaigns(id),
  status public.opportunity_status NOT NULL DEFAULT 'open',
  lost_reason TEXT,
  closed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_opportunities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_opportunities_select" ON public.sales_opportunities;
CREATE POLICY "sales_opportunities_select" ON public.sales_opportunities
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = sales_opportunities.company_id AND m.slug = 'sales' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "sales_opportunities_insert" ON public.sales_opportunities;
CREATE POLICY "sales_opportunities_insert" ON public.sales_opportunities
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = sales_opportunities.company_id AND m.slug = 'sales' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "sales_opportunities_update" ON public.sales_opportunities;
CREATE POLICY "sales_opportunities_update" ON public.sales_opportunities
  FOR UPDATE USING (
    (owner_user_id = auth.uid() OR company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid() AND role = 'company_admin'))
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = sales_opportunities.company_id AND m.slug = 'sales' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "sales_opportunities_delete" ON public.sales_opportunities;
CREATE POLICY "sales_opportunities_delete" ON public.sales_opportunities
  FOR DELETE USING (false);
-- =============================================
-- OPPORTUNITY STAGE HISTORY
-- =============================================
CREATE TABLE IF NOT EXISTS public.sales_opportunity_stage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.sales_opportunities(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES public.sales_pipeline_stages(id),
  to_stage_id UUID NOT NULL REFERENCES public.sales_pipeline_stages(id),
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_opportunity_stage_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_opportunity_stage_history_select" ON public.sales_opportunity_stage_history;
CREATE POLICY "sales_opportunity_stage_history_select" ON public.sales_opportunity_stage_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sales_opportunities so WHERE so.id = opportunity_id AND so.company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid()))
  );
DROP POLICY IF EXISTS "sales_opportunity_stage_history_insert" ON public.sales_opportunity_stage_history;
CREATE POLICY "sales_opportunity_stage_history_insert" ON public.sales_opportunity_stage_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sales_opportunities so WHERE so.id = opportunity_id AND so.company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid()))
  );
-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS sales_pipelines_company_idx ON public.sales_pipelines(company_id);
CREATE INDEX IF NOT EXISTS sales_pipeline_stages_pipeline_idx ON public.sales_pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS sales_campaigns_company_idx ON public.sales_campaigns(company_id);
CREATE INDEX IF NOT EXISTS sales_opportunities_company_idx ON public.sales_opportunities(company_id);
CREATE INDEX IF NOT EXISTS sales_opportunities_pipeline_idx ON public.sales_opportunities(pipeline_id);
CREATE INDEX IF NOT EXISTS sales_opportunities_stage_idx ON public.sales_opportunities(stage_id);
CREATE INDEX IF NOT EXISTS sales_opportunities_owner_idx ON public.sales_opportunities(owner_user_id);
CREATE INDEX IF NOT EXISTS sales_opportunities_crm_client_idx ON public.sales_opportunities(crm_client_id);
CREATE INDEX IF NOT EXISTS sales_opportunity_stage_history_opp_idx ON public.sales_opportunity_stage_history(opportunity_id);
-- =============================================
-- UPDATE TRIGGERS
-- =============================================
DROP TRIGGER IF EXISTS update_sales_pipelines_updated_at ON public.sales_pipelines;
CREATE TRIGGER update_sales_pipelines_updated_at
  BEFORE UPDATE ON public.sales_pipelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_sales_pipeline_stages_updated_at ON public.sales_pipeline_stages;
CREATE TRIGGER update_sales_pipeline_stages_updated_at
  BEFORE UPDATE ON public.sales_pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_sales_campaigns_updated_at ON public.sales_campaigns;
CREATE TRIGGER update_sales_campaigns_updated_at
  BEFORE UPDATE ON public.sales_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_sales_opportunities_updated_at ON public.sales_opportunities;
CREATE TRIGGER update_sales_opportunities_updated_at
  BEFORE UPDATE ON public.sales_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- =============================================
-- AUTO-UPDATE OPPORTUNITY STATUS ON STAGE CHANGE
-- =============================================
CREATE OR REPLACE FUNCTION public.sales_opportunity_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Record stage history
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    INSERT INTO public.sales_opportunity_stage_history (opportunity_id, from_stage_id, to_stage_id, changed_by)
    VALUES (NEW.id, OLD.stage_id, NEW.stage_id, auth.uid());
    
    -- Check if new stage is closed won/lost
    SELECT 
      CASE 
        WHEN is_closed_won THEN 'won'::opportunity_status
        WHEN is_closed_lost THEN 'lost'::opportunity_status
        ELSE 'open'::opportunity_status
      END INTO NEW.status
    FROM public.sales_pipeline_stages WHERE id = NEW.stage_id;
    
    -- Set closed_at if status changed to won/lost
    IF NEW.status IN ('won', 'lost') AND OLD.status = 'open' THEN
      NEW.closed_at = now();
    ELSIF NEW.status = 'open' AND OLD.status IN ('won', 'lost') THEN
      NEW.closed_at = NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS sales_opportunity_stage_change_trigger ON public.sales_opportunities;
CREATE TRIGGER sales_opportunity_stage_change_trigger
  BEFORE UPDATE ON public.sales_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.sales_opportunity_stage_change();
