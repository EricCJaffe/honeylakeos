-- Pilot flags (mark companies as pilot participants)
CREATE TABLE public.pilot_flags (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
    is_pilot BOOLEAN NOT NULL DEFAULT true,
    cohort_name TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_by UUID
);

-- Enable RLS
ALTER TABLE public.pilot_flags ENABLE ROW LEVEL SECURITY;

-- Company members can read their pilot status
CREATE POLICY "Company members can read own pilot flag"
ON public.pilot_flags
FOR SELECT
TO authenticated
USING (public.is_company_member(company_id));

-- Site admins can manage pilot flags
CREATE POLICY "Site admins can manage pilot flags"
ON public.pilot_flags
FOR ALL
TO authenticated
USING (public.is_site_admin(auth.uid()))
WITH CHECK (public.is_site_admin(auth.uid()));

-- Activation events (track key user actions for measuring success)
CREATE TABLE public.activation_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    event_key TEXT NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    metadata_json JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.activation_events ENABLE ROW LEVEL SECURITY;

-- Site admins can read all activation events
CREATE POLICY "Site admins can read activation events"
ON public.activation_events
FOR SELECT
TO authenticated
USING (public.is_site_admin(auth.uid()));

-- Company admins can read their activation events
CREATE POLICY "Company admins can read own activation events"
ON public.activation_events
FOR SELECT
TO authenticated
USING (public.is_company_admin(company_id));

-- Users can create activation events (insert only)
CREATE POLICY "Users can create activation events"
ON public.activation_events
FOR INSERT
TO authenticated
WITH CHECK (public.is_company_member(company_id) AND auth.uid() = user_id);

-- Feedback items (capture in-context feedback)
CREATE TABLE public.feedback_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    module_key TEXT,
    page_path TEXT,
    feedback_type TEXT NOT NULL DEFAULT 'idea' CHECK (feedback_type IN ('bug', 'idea', 'confusion')),
    message TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'triaged', 'done', 'dismissed')),
    triage_notes TEXT,
    triaged_by UUID,
    triaged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback_items ENABLE ROW LEVEL SECURITY;

-- Users can read their own feedback
CREATE POLICY "Users can read own feedback"
ON public.feedback_items
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Company admins can read company feedback
CREATE POLICY "Company admins can read company feedback"
ON public.feedback_items
FOR SELECT
TO authenticated
USING (public.is_company_admin(company_id));

-- Site admins can read all feedback
CREATE POLICY "Site admins can read all feedback"
ON public.feedback_items
FOR SELECT
TO authenticated
USING (public.is_site_admin(auth.uid()));

-- Users can create feedback (insert only)
CREATE POLICY "Users can create feedback"
ON public.feedback_items
FOR INSERT
TO authenticated
WITH CHECK (public.is_company_member(company_id) AND auth.uid() = user_id);

-- Site admins can update feedback (triage)
CREATE POLICY "Site admins can update feedback"
ON public.feedback_items
FOR UPDATE
TO authenticated
USING (public.is_site_admin(auth.uid()))
WITH CHECK (public.is_site_admin(auth.uid()));

-- Coaches can read feedback for attributed companies
CREATE POLICY "Coaches can read attributed company feedback"
ON public.feedback_items
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.company_coach_attribution cca
        WHERE cca.company_id = feedback_items.company_id
        AND cca.is_active = true
        AND public.is_company_member(cca.coach_company_id)
    )
);

-- Indexes for performance
CREATE INDEX idx_pilot_flags_company_id ON public.pilot_flags(company_id);
CREATE INDEX idx_activation_events_company_id ON public.activation_events(company_id);
CREATE INDEX idx_activation_events_user_id ON public.activation_events(user_id);
CREATE INDEX idx_activation_events_event_key ON public.activation_events(event_key);
CREATE INDEX idx_feedback_items_company_id ON public.feedback_items(company_id);
CREATE INDEX idx_feedback_items_status ON public.feedback_items(status);

-- Function to get activation score for a company
CREATE OR REPLACE FUNCTION public.get_company_activation_score(p_company_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    score INTEGER := 0;
    events_count INTEGER;
BEGIN
    -- Count distinct activation event types
    SELECT COUNT(DISTINCT event_key) INTO events_count
    FROM activation_events
    WHERE company_id = p_company_id;
    
    -- Base score from milestone count (max 9 milestones = 90 points)
    score := LEAST(events_count * 10, 90);
    
    -- Bonus for recent activity
    IF EXISTS (
        SELECT 1 FROM activation_events
        WHERE company_id = p_company_id
        AND occurred_at > now() - INTERVAL '7 days'
    ) THEN
        score := score + 10;
    END IF;
    
    RETURN LEAST(score, 100);
END;
$$;

-- Function to get pilot company stats
CREATE OR REPLACE FUNCTION public.get_pilot_company_stats(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'activation_score', public.get_company_activation_score(p_company_id),
        'active_users_7d', (
            SELECT COUNT(DISTINCT user_id)
            FROM activation_events
            WHERE company_id = p_company_id
            AND occurred_at > now() - INTERVAL '7 days'
        ),
        'last_activity', (
            SELECT MAX(occurred_at)
            FROM activation_events
            WHERE company_id = p_company_id
        ),
        'milestones_achieved', (
            SELECT json_agg(DISTINCT event_key)
            FROM activation_events
            WHERE company_id = p_company_id
        ),
        'feedback_count', (
            SELECT COUNT(*)
            FROM feedback_items
            WHERE company_id = p_company_id
        ),
        'open_feedback_count', (
            SELECT COUNT(*)
            FROM feedback_items
            WHERE company_id = p_company_id
            AND status = 'open'
        )
    ) INTO result;
    
    RETURN result;
END;
$$;