-- ==========================================
-- COACHING MODULE v1 - Database Schema
-- ==========================================

-- Create coaching role enum
CREATE TYPE public.coaching_role AS ENUM ('coach', 'coach_manager', 'org_admin');

-- Create engagement status enum
CREATE TYPE public.engagement_status AS ENUM ('active', 'paused', 'ended');

-- Create coach assignment role enum
CREATE TYPE public.coach_assignment_role AS ENUM ('primary_coach', 'support_coach');

-- Create recommendation type enum
CREATE TYPE public.recommendation_type AS ENUM ('task', 'project', 'calendar_event', 'note_prompt', 'document_prompt', 'framework_change_suggestion');

-- Create recommendation status enum
CREATE TYPE public.recommendation_status AS ENUM ('proposed', 'accepted', 'rejected', 'expired');

-- ==========================================
-- COACHING ORG SETTINGS
-- ==========================================
CREATE TABLE public.coaching_org_settings (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  branding_name TEXT,
  default_client_access_level TEXT NOT NULL DEFAULT 'read_only' CHECK (default_client_access_level IN ('read_only', 'custom')),
  coach_manager_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- COACH PROFILES (Internal coaching org users)
-- ==========================================
CREATE TABLE public.coaching_coach_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  coach_role public.coaching_role NOT NULL DEFAULT 'coach',
  specialties JSONB DEFAULT '[]',
  bio TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- ==========================================
-- COACHING ENGAGEMENTS
-- ==========================================
CREATE TABLE public.coaching_engagements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coaching_org_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  engagement_status public.engagement_status NOT NULL DEFAULT 'active',
  primary_framework_id UUID REFERENCES public.frameworks(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- Partial unique index for active engagements
CREATE UNIQUE INDEX idx_unique_active_engagement 
  ON public.coaching_engagements(coaching_org_company_id, client_company_id) 
  WHERE archived_at IS NULL AND engagement_status = 'active';

-- ==========================================
-- COACH ASSIGNMENTS
-- ==========================================
CREATE TABLE public.coach_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.coaching_engagements(id) ON DELETE CASCADE,
  coach_user_id UUID NOT NULL,
  assignment_role public.coach_assignment_role NOT NULL DEFAULT 'support_coach',
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial unique index for active assignments
CREATE UNIQUE INDEX idx_unique_active_assignment 
  ON public.coach_assignments(engagement_id, coach_user_id) 
  WHERE archived_at IS NULL;

-- ==========================================
-- COACH RECOMMENDATIONS
-- ==========================================
CREATE TABLE public.coach_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES public.coaching_engagements(id) ON DELETE CASCADE,
  recommended_by UUID NOT NULL,
  target_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recommendation_type public.recommendation_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  payload JSONB DEFAULT '{}',
  status public.recommendation_status NOT NULL DEFAULT 'proposed',
  rejection_reason TEXT,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID,
  converted_entity_type TEXT,
  converted_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX idx_coaching_org_settings_company ON public.coaching_org_settings(company_id);
CREATE INDEX idx_coaching_coach_profiles_company ON public.coaching_coach_profiles(company_id);
CREATE INDEX idx_coaching_coach_profiles_user ON public.coaching_coach_profiles(user_id);
CREATE INDEX idx_coaching_engagements_org ON public.coaching_engagements(coaching_org_company_id);
CREATE INDEX idx_coaching_engagements_client ON public.coaching_engagements(client_company_id);
CREATE INDEX idx_coaching_engagements_status ON public.coaching_engagements(engagement_status);
CREATE INDEX idx_coach_assignments_engagement ON public.coach_assignments(engagement_id);
CREATE INDEX idx_coach_assignments_coach ON public.coach_assignments(coach_user_id);
CREATE INDEX idx_coach_recommendations_engagement ON public.coach_recommendations(engagement_id);
CREATE INDEX idx_coach_recommendations_target ON public.coach_recommendations(target_company_id);
CREATE INDEX idx_coach_recommendations_status ON public.coach_recommendations(status);

-- ==========================================
-- TRIGGERS
-- ==========================================
CREATE TRIGGER update_coaching_org_settings_updated_at
  BEFORE UPDATE ON public.coaching_org_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coaching_coach_profiles_updated_at
  BEFORE UPDATE ON public.coaching_coach_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coaching_engagements_updated_at
  BEFORE UPDATE ON public.coaching_engagements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coach_assignments_updated_at
  BEFORE UPDATE ON public.coach_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coach_recommendations_updated_at
  BEFORE UPDATE ON public.coach_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Check if user is a coach in a coaching org
CREATE OR REPLACE FUNCTION public.is_coaching_org_member(p_company_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.coaching_coach_profiles
    WHERE company_id = p_company_id
    AND user_id = p_user_id
    AND archived_at IS NULL
  )
$$;

-- Check if user is a coach manager or org admin
CREATE OR REPLACE FUNCTION public.is_coach_manager_or_admin(p_company_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.coaching_coach_profiles
    WHERE company_id = p_company_id
    AND user_id = p_user_id
    AND coach_role IN ('coach_manager', 'org_admin')
    AND archived_at IS NULL
  )
$$;

-- Check if user is assigned to an engagement
CREATE OR REPLACE FUNCTION public.is_assigned_to_engagement(p_engagement_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.coach_assignments
    WHERE engagement_id = p_engagement_id
    AND coach_user_id = p_user_id
    AND archived_at IS NULL
  )
$$;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- COACHING ORG SETTINGS
ALTER TABLE public.coaching_org_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view coaching org settings"
  ON public.coaching_org_settings FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY "Company admins can manage coaching org settings"
  ON public.coaching_org_settings FOR ALL
  USING (public.is_company_admin(company_id));

-- COACH PROFILES
ALTER TABLE public.coaching_coach_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaching org members can view coach profiles"
  ON public.coaching_coach_profiles FOR SELECT
  USING (public.is_company_member(company_id));

CREATE POLICY "Org admins can manage coach profiles"
  ON public.coaching_coach_profiles FOR ALL
  USING (
    public.is_company_admin(company_id) OR
    public.is_coach_manager_or_admin(company_id)
  );

-- COACHING ENGAGEMENTS
ALTER TABLE public.coaching_engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaching org members can view their engagements"
  ON public.coaching_engagements FOR SELECT
  USING (
    public.is_company_member(coaching_org_company_id) OR
    public.is_company_member(client_company_id)
  );

CREATE POLICY "Coaching org admins can create engagements"
  ON public.coaching_engagements FOR INSERT
  WITH CHECK (
    public.is_company_admin(coaching_org_company_id) OR
    public.is_coach_manager_or_admin(coaching_org_company_id)
  );

CREATE POLICY "Coaching org admins can update engagements"
  ON public.coaching_engagements FOR UPDATE
  USING (
    public.is_company_admin(coaching_org_company_id) OR
    public.is_coach_manager_or_admin(coaching_org_company_id)
  );

CREATE POLICY "Coaching org admins can delete engagements"
  ON public.coaching_engagements FOR DELETE
  USING (public.is_company_admin(coaching_org_company_id));

-- COACH ASSIGNMENTS
ALTER TABLE public.coach_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaching org members can view assignments"
  ON public.coach_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_engagements e
      WHERE e.id = engagement_id
      AND (
        public.is_company_member(e.coaching_org_company_id) OR
        public.is_company_member(e.client_company_id)
      )
    )
  );

CREATE POLICY "Coach managers can manage assignments"
  ON public.coach_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_engagements e
      WHERE e.id = engagement_id
      AND (
        public.is_company_admin(e.coaching_org_company_id) OR
        public.is_coach_manager_or_admin(e.coaching_org_company_id)
      )
    )
  );

-- COACH RECOMMENDATIONS
ALTER TABLE public.coach_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view recommendations they created"
  ON public.coach_recommendations FOR SELECT
  USING (
    recommended_by = auth.uid() OR
    public.is_company_member(target_company_id) OR
    EXISTS (
      SELECT 1 FROM public.coaching_engagements e
      WHERE e.id = engagement_id
      AND public.is_company_member(e.coaching_org_company_id)
    )
  );

CREATE POLICY "Assigned coaches can create recommendations"
  ON public.coach_recommendations FOR INSERT
  WITH CHECK (
    recommended_by = auth.uid() AND
    public.is_assigned_to_engagement(engagement_id)
  );

CREATE POLICY "Coaches can update their pending recommendations"
  ON public.coach_recommendations FOR UPDATE
  USING (
    (recommended_by = auth.uid() AND status = 'proposed') OR
    (public.is_company_member(target_company_id) AND status = 'proposed')
  );

CREATE POLICY "Only coaching org admins can delete recommendations"
  ON public.coach_recommendations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_engagements e
      WHERE e.id = engagement_id
      AND public.is_company_admin(e.coaching_org_company_id)
    )
  );