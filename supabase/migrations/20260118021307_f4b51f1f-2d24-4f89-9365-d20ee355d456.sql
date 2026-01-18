-- Coach plans (coaches can create custom plans wrapping base plans)
CREATE TABLE public.coach_plans (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    base_plan_id UUID NOT NULL REFERENCES public.plans(id),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coach_plans ENABLE ROW LEVEL SECURITY;

-- Coach company members can read their coach plans
CREATE POLICY "Coach company members can read coach plans"
ON public.coach_plans
FOR SELECT
TO authenticated
USING (public.is_company_member(coach_company_id));

-- Coach company admins can manage coach plans
CREATE POLICY "Coach company admins can manage coach plans"
ON public.coach_plans
FOR ALL
TO authenticated
USING (public.is_company_admin(coach_company_id))
WITH CHECK (public.is_company_admin(coach_company_id));

-- Coach plan overrides (customize entitlements within bounds)
CREATE TABLE public.coach_plan_overrides (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_plan_id UUID NOT NULL REFERENCES public.coach_plans(id) ON DELETE CASCADE,
    entitlement_key TEXT NOT NULL,
    entitlement_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (coach_plan_id, entitlement_key)
);

-- Enable RLS
ALTER TABLE public.coach_plan_overrides ENABLE ROW LEVEL SECURITY;

-- Read via coach plan access
CREATE POLICY "Can read coach plan overrides via coach plan"
ON public.coach_plan_overrides
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.coach_plans cp
        WHERE cp.id = coach_plan_id
        AND public.is_company_member(cp.coach_company_id)
    )
);

-- Manage via coach plan admin access
CREATE POLICY "Coach admins can manage plan overrides"
ON public.coach_plan_overrides
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.coach_plans cp
        WHERE cp.id = coach_plan_id
        AND public.is_company_admin(cp.coach_company_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.coach_plans cp
        WHERE cp.id = coach_plan_id
        AND public.is_company_admin(cp.coach_company_id)
    )
);

-- Company coach attribution (track who brought in the customer)
CREATE TABLE public.company_coach_attribution (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    coach_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    coach_plan_id UUID REFERENCES public.coach_plans(id),
    attributed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    attribution_type TEXT NOT NULL DEFAULT 'referral' CHECK (attribution_type IN ('referral', 'managed')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    referral_code TEXT,
    notes TEXT,
    created_by UUID,
    UNIQUE (company_id)
);

-- Enable RLS
ALTER TABLE public.company_coach_attribution ENABLE ROW LEVEL SECURITY;

-- Company members can read their own attribution
CREATE POLICY "Company members can read own attribution"
ON public.company_coach_attribution
FOR SELECT
TO authenticated
USING (public.is_company_member(company_id));

-- Coach company members can read attributions to them
CREATE POLICY "Coach members can read attributed companies"
ON public.company_coach_attribution
FOR SELECT
TO authenticated
USING (public.is_company_member(coach_company_id));

-- Site admins can manage attributions
CREATE POLICY "Site admins can manage attributions"
ON public.company_coach_attribution
FOR ALL
TO authenticated
USING (public.is_site_admin(auth.uid()))
WITH CHECK (public.is_site_admin(auth.uid()));

-- Revenue events (tracking only, no money)
CREATE TABLE public.revenue_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    coach_company_id UUID REFERENCES public.companies(id),
    event_type TEXT NOT NULL CHECK (event_type IN ('plan_started', 'plan_upgraded', 'plan_renewed', 'plan_cancelled')),
    plan_tier TEXT NOT NULL,
    coach_plan_id UUID REFERENCES public.coach_plans(id),
    metadata JSONB DEFAULT '{}',
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.revenue_events ENABLE ROW LEVEL SECURITY;

-- Site admins can read all revenue events
CREATE POLICY "Site admins can read revenue events"
ON public.revenue_events
FOR SELECT
TO authenticated
USING (public.is_site_admin(auth.uid()));

-- Coach company can read revenue events attributed to them
CREATE POLICY "Coach can read attributed revenue events"
ON public.revenue_events
FOR SELECT
TO authenticated
USING (
    coach_company_id IS NOT NULL
    AND public.is_company_member(coach_company_id)
);

-- Coach referral links table
CREATE TABLE public.coach_referral_links (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    coach_plan_id UUID REFERENCES public.coach_plans(id),
    code TEXT NOT NULL UNIQUE,
    name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    uses_count INTEGER NOT NULL DEFAULT 0,
    max_uses INTEGER,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coach_referral_links ENABLE ROW LEVEL SECURITY;

-- Coach company members can read their referral links
CREATE POLICY "Coach members can read referral links"
ON public.coach_referral_links
FOR SELECT
TO authenticated
USING (public.is_company_member(coach_company_id));

-- Coach company admins can manage referral links
CREATE POLICY "Coach admins can manage referral links"
ON public.coach_referral_links
FOR ALL
TO authenticated
USING (public.is_company_admin(coach_company_id))
WITH CHECK (public.is_company_admin(coach_company_id));

-- Indexes for performance
CREATE INDEX idx_coach_plans_coach_company_id ON public.coach_plans(coach_company_id);
CREATE INDEX idx_company_coach_attribution_coach_company_id ON public.company_coach_attribution(coach_company_id);
CREATE INDEX idx_revenue_events_company_id ON public.revenue_events(company_id);
CREATE INDEX idx_revenue_events_coach_company_id ON public.revenue_events(coach_company_id);
CREATE INDEX idx_coach_referral_links_code ON public.coach_referral_links(code);

-- Triggers for updated_at
CREATE TRIGGER update_coach_plans_updated_at
BEFORE UPDATE ON public.coach_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();