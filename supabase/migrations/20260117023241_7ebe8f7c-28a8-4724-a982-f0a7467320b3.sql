-- Create company_onboarding_state table
CREATE TABLE public.company_onboarding_state (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  framework_id UUID REFERENCES public.frameworks(id) ON DELETE SET NULL,
  current_step TEXT NOT NULL DEFAULT 'select_framework',
  completed_steps TEXT[] NOT NULL DEFAULT '{}',
  coach_engagement_id UUID REFERENCES public.coaching_engagements(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_onboarding_state ENABLE ROW LEVEL SECURITY;

-- RLS: Company admins can manage their own onboarding state
CREATE POLICY "company_onboarding_state_select"
ON public.company_onboarding_state
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = company_onboarding_state.company_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  )
);

CREATE POLICY "company_onboarding_state_insert"
ON public.company_onboarding_state
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = company_onboarding_state.company_id
      AND m.user_id = auth.uid()
      AND m.role = 'company_admin'
      AND m.status = 'active'
  )
);

CREATE POLICY "company_onboarding_state_update"
ON public.company_onboarding_state
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = company_onboarding_state.company_id
      AND m.user_id = auth.uid()
      AND m.role = 'company_admin'
      AND m.status = 'active'
  )
);

-- Coaches can view onboarding state for their assigned clients
CREATE POLICY "company_onboarding_state_coach_select"
ON public.company_onboarding_state
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coaching_engagements ce
    JOIN public.coach_assignments ca ON ca.engagement_id = ce.id
    WHERE ce.client_company_id = company_onboarding_state.company_id
      AND ca.coach_user_id = auth.uid()
      AND ca.archived_at IS NULL
      AND ce.archived_at IS NULL
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_company_onboarding_state_updated_at
BEFORE UPDATE ON public.company_onboarding_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();