-- Create coach_profiles table that references external_contacts
CREATE TABLE public.coach_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  external_contact_id UUID NOT NULL REFERENCES public.external_contacts(id) ON DELETE CASCADE,
  profile_type TEXT NOT NULL DEFAULT 'coach' CHECK (profile_type IN ('coach', 'partner', 'vendor')),
  specialties JSONB DEFAULT '[]'::jsonb,
  bio TEXT,
  archived_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_coach_profile_per_contact UNIQUE (company_id, external_contact_id)
);

-- Create indexes
CREATE INDEX idx_coach_profiles_company_id ON public.coach_profiles(company_id);
CREATE INDEX idx_coach_profiles_external_contact_id ON public.coach_profiles(external_contact_id);
CREATE INDEX idx_coach_profiles_profile_type ON public.coach_profiles(profile_type);
CREATE INDEX idx_coach_profiles_archived_at ON public.coach_profiles(archived_at);

-- Enable RLS
ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for coach_profiles
CREATE POLICY "Company members can view coach profiles"
  ON public.coach_profiles FOR SELECT
  USING (is_company_member(company_id));

CREATE POLICY "Company members can create coach profiles"
  ON public.coach_profiles FOR INSERT
  WITH CHECK (is_company_member(company_id));

CREATE POLICY "Company members can update coach profiles"
  ON public.coach_profiles FOR UPDATE
  USING (is_company_member(company_id));

CREATE POLICY "Company admins can delete coach profiles"
  ON public.coach_profiles FOR DELETE
  USING (is_company_admin(company_id));

-- Add updated_at trigger
CREATE TRIGGER update_coach_profiles_updated_at
  BEFORE UPDATE ON public.coach_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the coaches module
INSERT INTO public.modules (id, slug, name, description, category, is_public)
VALUES (
  gen_random_uuid(),
  'coaches',
  'Coaches & Partners',
  'Manage coaches, partners, and vendors associated with your company',
  'people',
  true
)
ON CONFLICT (slug) DO NOTHING;