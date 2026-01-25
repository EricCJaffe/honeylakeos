-- Create plans table for plan metadata
CREATE TABLE public.plans (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    plan_type TEXT NOT NULL DEFAULT 'company' CHECK (plan_type IN ('company', 'coach_org')),
    is_default BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Plans are readable by all authenticated users
CREATE POLICY "Plans are viewable by authenticated users" 
ON public.plans 
FOR SELECT 
TO authenticated 
USING (true);

-- Only site admins can manage plans
CREATE POLICY "Site admins can manage plans" 
ON public.plans 
FOR ALL 
TO authenticated 
USING (public.is_site_admin(auth.uid()))
WITH CHECK (public.is_site_admin(auth.uid()));

-- Seed default plans
INSERT INTO public.plans (name, slug, description, plan_type, is_default, sort_order) VALUES
('Starter', 'starter', 'For small teams getting started', 'company', true, 1),
('Growth', 'growth', 'For growing organizations', 'company', false, 2),
('Scale', 'scale', 'For large organizations', 'company', false, 3),
('Solo Coach', 'solo_coach', 'For independent coaches', 'coach_org', false, 4),
('Coaching Team', 'coaching_team', 'For small coaching teams', 'coach_org', false, 5),
('Coaching Firm', 'coaching_firm', 'For large coaching organizations', 'coach_org', false, 6);

-- Add module-based entitlement keys for v1
INSERT INTO public.plan_entitlements (plan_tier, entitlement_key, entitlement_value) VALUES
-- Starter plan - basic modules only
('starter', 'modules.tasks', 'true'),
('starter', 'modules.projects', 'true'),
('starter', 'modules.crm', 'false'),
('starter', 'modules.donors', 'false'),
('starter', 'modules.finance', 'false'),
('starter', 'modules.lms', 'false'),
('starter', 'modules.reports', 'false'),
('starter', 'limits.users', '5'),
('starter', 'limits.projects', '10'),
('starter', 'limits.storage_mb', '500'),
('starter', 'coach.enabled', 'false'),
-- Growth plan - most modules
('growth', 'modules.tasks', 'true'),
('growth', 'modules.projects', 'true'),
('growth', 'modules.crm', 'true'),
('growth', 'modules.donors', 'true'),
('growth', 'modules.finance', 'true'),
('growth', 'modules.lms', 'false'),
('growth', 'modules.reports', 'true'),
('growth', 'limits.users', '25'),
('growth', 'limits.projects', '50'),
('growth', 'limits.storage_mb', '5000'),
('growth', 'coach.enabled', 'false'),
-- Scale plan - everything
('scale', 'modules.tasks', 'true'),
('scale', 'modules.projects', 'true'),
('scale', 'modules.crm', 'true'),
('scale', 'modules.donors', 'true'),
('scale', 'modules.finance', 'true'),
('scale', 'modules.lms', 'true'),
('scale', 'modules.reports', 'true'),
('scale', 'limits.users', '999999'),
('scale', 'limits.projects', '999999'),
('scale', 'limits.storage_mb', '999999'),
('scale', 'coach.enabled', 'true'),
-- Solo Coach plan
('solo_coach', 'modules.tasks', 'true'),
('solo_coach', 'modules.projects', 'true'),
('solo_coach', 'modules.crm', 'true'),
('solo_coach', 'modules.donors', 'false'),
('solo_coach', 'modules.finance', 'false'),
('solo_coach', 'modules.lms', 'false'),
('solo_coach', 'modules.reports', 'false'),
('solo_coach', 'limits.users', '1'),
('solo_coach', 'limits.projects', '25'),
('solo_coach', 'limits.storage_mb', '1000'),
('solo_coach', 'coach.enabled', 'true'),
-- Coaching Team plan
('coaching_team', 'modules.tasks', 'true'),
('coaching_team', 'modules.projects', 'true'),
('coaching_team', 'modules.crm', 'true'),
('coaching_team', 'modules.donors', 'false'),
('coaching_team', 'modules.finance', 'true'),
('coaching_team', 'modules.lms', 'true'),
('coaching_team', 'modules.reports', 'true'),
('coaching_team', 'limits.users', '10'),
('coaching_team', 'limits.projects', '100'),
('coaching_team', 'limits.storage_mb', '10000'),
('coaching_team', 'coach.enabled', 'true'),
-- Coaching Firm plan - everything
('coaching_firm', 'modules.tasks', 'true'),
('coaching_firm', 'modules.projects', 'true'),
('coaching_firm', 'modules.crm', 'true'),
('coaching_firm', 'modules.donors', 'true'),
('coaching_firm', 'modules.finance', 'true'),
('coaching_firm', 'modules.lms', 'true'),
('coaching_firm', 'modules.reports', 'true'),
('coaching_firm', 'limits.users', '999999'),
('coaching_firm', 'limits.projects', '999999'),
('coaching_firm', 'limits.storage_mb', '999999'),
('coaching_firm', 'coach.enabled', 'true')
ON CONFLICT (plan_tier, entitlement_key) DO UPDATE SET entitlement_value = EXCLUDED.entitlement_value;