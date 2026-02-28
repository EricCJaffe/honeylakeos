-- Monetization & Packaging v1 - Plans and Entitlements

-- Plan type enum
CREATE TYPE public.plan_type AS ENUM ('company', 'coach_org');
-- Plan tier enum  
CREATE TYPE public.plan_tier AS ENUM ('starter', 'growth', 'scale', 'solo_coach', 'coaching_team', 'coaching_firm');
-- Plan status enum
CREATE TYPE public.plan_status AS ENUM ('active', 'grace', 'expired', 'cancelled');
-- Company plans table
CREATE TABLE public.company_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_type public.plan_type NOT NULL,
  plan_tier public.plan_tier NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  grace_period_days integer DEFAULT 30,
  status public.plan_status NOT NULL DEFAULT 'active',
  stripe_subscription_id text,
  stripe_customer_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_active_company_plan UNIQUE (company_id)
);
-- Plan entitlements configuration (defines what each tier grants)
CREATE TABLE public.plan_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_tier public.plan_tier NOT NULL,
  entitlement_key text NOT NULL,
  entitlement_value jsonb NOT NULL, -- can be boolean, number, or object
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_tier_entitlement UNIQUE (plan_tier, entitlement_key)
);
-- Company entitlement overrides (for custom deals, legacy access, etc.)
CREATE TABLE public.company_entitlement_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entitlement_key text NOT NULL,
  entitlement_value jsonb NOT NULL,
  reason text,
  granted_by uuid,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_company_entitlement UNIQUE (company_id, entitlement_key)
);
-- Enable RLS
ALTER TABLE public.company_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_entitlement_overrides ENABLE ROW LEVEL SECURITY;
-- RLS Policies for company_plans
CREATE POLICY "Company admins can view their plan"
ON public.company_plans FOR SELECT
USING (company_id = ((auth.jwt()->>'active_company_id')::uuid));
CREATE POLICY "Site admins can manage all plans"
ON public.company_plans FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.site_memberships sm
    WHERE sm.user_id = auth.uid()
    AND sm.role IN ('super_admin', 'site_admin')
  )
);
-- RLS for plan_entitlements (read-only for all authenticated)
CREATE POLICY "Anyone can read plan entitlements"
ON public.plan_entitlements FOR SELECT
USING (true);
CREATE POLICY "Site admins can manage entitlements"
ON public.plan_entitlements FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.site_memberships sm
    WHERE sm.user_id = auth.uid()
    AND sm.role IN ('super_admin', 'site_admin')
  )
);
-- RLS for company_entitlement_overrides
CREATE POLICY "Company admins can view their overrides"
ON public.company_entitlement_overrides FOR SELECT
USING (company_id = ((auth.jwt()->>'active_company_id')::uuid));
CREATE POLICY "Site admins can manage overrides"
ON public.company_entitlement_overrides FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.site_memberships sm
    WHERE sm.user_id = auth.uid()
    AND sm.role IN ('super_admin', 'site_admin')
  )
);
-- Indexes
CREATE INDEX idx_company_plans_company ON public.company_plans(company_id);
CREATE INDEX idx_company_plans_status ON public.company_plans(status) WHERE status = 'active';
CREATE INDEX idx_plan_entitlements_tier ON public.plan_entitlements(plan_tier);
CREATE INDEX idx_company_overrides_company ON public.company_entitlement_overrides(company_id);
-- Trigger for updated_at
CREATE TRIGGER update_company_plans_updated_at
  BEFORE UPDATE ON public.company_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Insert default entitlements for each tier
-- Company Plans
INSERT INTO public.plan_entitlements (plan_tier, entitlement_key, entitlement_value) VALUES
-- Starter tier
('starter', 'max_users', '5'),
('starter', 'max_active_frameworks', '1'),
('starter', 'crm_enabled', 'true'),
('starter', 'lms_enabled', 'false'),
('starter', 'coaching_module_enabled', 'false'),
('starter', 'framework_engine_enabled', 'true'),
('starter', 'reporting_enabled', 'false'),
('starter', 'framework_marketplace_publish', 'false'),
('starter', 'weighted_health_metrics', 'false'),
('starter', 'advanced_reporting', 'false'),

-- Growth tier
('growth', 'max_users', '25'),
('growth', 'max_active_frameworks', '3'),
('growth', 'crm_enabled', 'true'),
('growth', 'lms_enabled', 'true'),
('growth', 'coaching_module_enabled', 'false'),
('growth', 'framework_engine_enabled', 'true'),
('growth', 'reporting_enabled', 'true'),
('growth', 'framework_marketplace_publish', 'false'),
('growth', 'weighted_health_metrics', 'true'),
('growth', 'advanced_reporting', 'false'),

-- Scale tier
('scale', 'max_users', '999999'),
('scale', 'max_active_frameworks', '999999'),
('scale', 'crm_enabled', 'true'),
('scale', 'lms_enabled', 'true'),
('scale', 'coaching_module_enabled', 'true'),
('scale', 'framework_engine_enabled', 'true'),
('scale', 'reporting_enabled', 'true'),
('scale', 'framework_marketplace_publish', 'false'),
('scale', 'weighted_health_metrics', 'true'),
('scale', 'advanced_reporting', 'true'),

-- Coach Org Plans
-- Solo Coach
('solo_coach', 'max_users', '1'),
('solo_coach', 'max_active_clients', '5'),
('solo_coach', 'max_published_frameworks', '1'),
('solo_coach', 'crm_enabled', 'true'),
('solo_coach', 'lms_enabled', 'false'),
('solo_coach', 'coaching_module_enabled', 'true'),
('solo_coach', 'framework_engine_enabled', 'true'),
('solo_coach', 'reporting_enabled', 'false'),
('solo_coach', 'framework_marketplace_publish', 'true'),
('solo_coach', 'weighted_health_metrics', 'true'),
('solo_coach', 'coach_manager_views', 'false'),
('solo_coach', 'private_coach_notes', 'true'),

-- Coaching Team
('coaching_team', 'max_users', '10'),
('coaching_team', 'max_active_clients', '25'),
('coaching_team', 'max_published_frameworks', '5'),
('coaching_team', 'crm_enabled', 'true'),
('coaching_team', 'lms_enabled', 'true'),
('coaching_team', 'coaching_module_enabled', 'true'),
('coaching_team', 'framework_engine_enabled', 'true'),
('coaching_team', 'reporting_enabled', 'true'),
('coaching_team', 'framework_marketplace_publish', 'true'),
('coaching_team', 'weighted_health_metrics', 'true'),
('coaching_team', 'coach_manager_views', 'true'),
('coaching_team', 'private_coach_notes', 'true'),

-- Coaching Firm
('coaching_firm', 'max_users', '999999'),
('coaching_firm', 'max_active_clients', '999999'),
('coaching_firm', 'max_published_frameworks', '999999'),
('coaching_firm', 'crm_enabled', 'true'),
('coaching_firm', 'lms_enabled', 'true'),
('coaching_firm', 'coaching_module_enabled', 'true'),
('coaching_firm', 'framework_engine_enabled', 'true'),
('coaching_firm', 'reporting_enabled', 'true'),
('coaching_firm', 'framework_marketplace_publish', 'true'),
('coaching_firm', 'weighted_health_metrics', 'true'),
('coaching_firm', 'coach_manager_views', 'true'),
('coaching_firm', 'private_coach_notes', 'true'),
('coaching_firm', 'advanced_reporting', 'true');
-- Comments
COMMENT ON TABLE public.company_plans IS 'Tracks the active subscription/plan for each company';
COMMENT ON TABLE public.plan_entitlements IS 'Defines what each plan tier grants';
COMMENT ON TABLE public.company_entitlement_overrides IS 'Per-company overrides for entitlements (custom deals, legacy access)';
