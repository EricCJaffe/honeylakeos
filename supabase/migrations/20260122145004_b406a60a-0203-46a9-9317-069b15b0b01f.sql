-- ============================================================
-- PROMPT 11: BILLING/ENTITLEMENTS PLACEHOLDER + SUBSCRIPTION TRANSITION
-- ============================================================

-- C) Create subscription_events audit table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'created', 'plan_changed', 'status_changed', 'trial_started', 
    'grace_started', 'ended', 'coaching_engagement_ended'
  )),
  from_value text,
  to_value text,
  reason text,
  metadata jsonb DEFAULT '{}',
  created_by_user_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_company 
ON public.subscription_events(company_id, created_at DESC);

-- RLS for subscription_events
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_events_select_own" ON public.subscription_events
FOR SELECT USING (
  company_id IN (
    SELECT company_id FROM public.memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM public.site_memberships sm
    WHERE sm.user_id = auth.uid() 
    AND sm.role IN ('site_admin', 'super_admin')
  )
);

CREATE POLICY "subscription_events_insert_admin" ON public.subscription_events
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid() 
    AND m.company_id = subscription_events.company_id
    AND m.status = 'active'
    AND m.role = 'company_admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.site_memberships sm
    WHERE sm.user_id = auth.uid() 
    AND sm.role IN ('site_admin', 'super_admin')
  )
);