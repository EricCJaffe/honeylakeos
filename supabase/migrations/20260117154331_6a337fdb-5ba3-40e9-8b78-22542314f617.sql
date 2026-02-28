-- =============================================
-- Donor Management Module v1
-- =============================================

-- Register the donors module
INSERT INTO modules (slug, name, description, category, is_public, version)
VALUES ('donors', 'Donor Management', 'Donor profiles, donations, pledges, and giving campaigns', 'premium', true, 1)
ON CONFLICT (slug) DO NOTHING;
-- =============================================
-- DONOR PROFILES (CRM Extension)
-- =============================================
DO $$ BEGIN
  CREATE TYPE public.donor_status AS ENUM ('prospect', 'active', 'lapsed', 'major');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS public.donor_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  crm_client_id UUID NOT NULL REFERENCES public.crm_clients(id) ON DELETE CASCADE,
  donor_status public.donor_status NOT NULL DEFAULT 'prospect',
  first_donation_date DATE,
  last_donation_date DATE,
  lifetime_giving_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, crm_client_id)
);
ALTER TABLE public.donor_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "donor_profiles_select" ON public.donor_profiles;
CREATE POLICY "donor_profiles_select" ON public.donor_profiles
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = donor_profiles.company_id AND m.slug = 'donors' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "donor_profiles_insert" ON public.donor_profiles;
CREATE POLICY "donor_profiles_insert" ON public.donor_profiles
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = donor_profiles.company_id AND m.slug = 'donors' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "donor_profiles_update" ON public.donor_profiles;
CREATE POLICY "donor_profiles_update" ON public.donor_profiles
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid() AND role = 'company_admin')
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = donor_profiles.company_id AND m.slug = 'donors' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "donor_profiles_delete" ON public.donor_profiles;
CREATE POLICY "donor_profiles_delete" ON public.donor_profiles
  FOR DELETE USING (false);
-- =============================================
-- DONOR CAMPAIGNS
-- =============================================
CREATE TABLE IF NOT EXISTS public.donor_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  goal_amount DECIMAL(15, 2),
  description TEXT,
  archived_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.donor_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "donor_campaigns_select" ON public.donor_campaigns;
CREATE POLICY "donor_campaigns_select" ON public.donor_campaigns
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = donor_campaigns.company_id AND m.slug = 'donors' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "donor_campaigns_insert" ON public.donor_campaigns;
CREATE POLICY "donor_campaigns_insert" ON public.donor_campaigns
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = donor_campaigns.company_id AND m.slug = 'donors' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "donor_campaigns_update" ON public.donor_campaigns;
CREATE POLICY "donor_campaigns_update" ON public.donor_campaigns
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid() AND role = 'company_admin')
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = donor_campaigns.company_id AND m.slug = 'donors' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "donor_campaigns_delete" ON public.donor_campaigns;
CREATE POLICY "donor_campaigns_delete" ON public.donor_campaigns
  FOR DELETE USING (false);
-- =============================================
-- DONATIONS
-- =============================================
DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('cash', 'check', 'credit_card', 'online', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE public.donation_status AS ENUM ('recorded', 'receipted', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  donor_profile_id UUID NOT NULL REFERENCES public.donor_profiles(id),
  campaign_id UUID REFERENCES public.donor_campaigns(id),
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  donation_date DATE NOT NULL,
  payment_method public.payment_method NOT NULL DEFAULT 'other',
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  receipt_required BOOLEAN NOT NULL DEFAULT false,
  status public.donation_status NOT NULL DEFAULT 'recorded',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "donations_select" ON public.donations;
CREATE POLICY "donations_select" ON public.donations
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = donations.company_id AND m.slug = 'donors' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "donations_insert" ON public.donations;
CREATE POLICY "donations_insert" ON public.donations
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid() AND role = 'company_admin')
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = donations.company_id AND m.slug = 'donors' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "donations_update" ON public.donations;
CREATE POLICY "donations_update" ON public.donations
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid() AND role = 'company_admin')
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = donations.company_id AND m.slug = 'donors' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "donations_delete" ON public.donations;
CREATE POLICY "donations_delete" ON public.donations
  FOR DELETE USING (false);
-- =============================================
-- DONOR PLEDGES
-- =============================================
DO $$ BEGIN
  CREATE TYPE public.pledge_frequency AS ENUM ('one_time', 'monthly', 'quarterly', 'annual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE public.pledge_status AS ENUM ('active', 'fulfilled', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS public.donor_pledges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  donor_profile_id UUID NOT NULL REFERENCES public.donor_profiles(id),
  campaign_id UUID REFERENCES public.donor_campaigns(id),
  total_amount DECIMAL(15, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  frequency public.pledge_frequency NOT NULL DEFAULT 'one_time',
  status public.pledge_status NOT NULL DEFAULT 'active',
  fulfilled_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.donor_pledges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "donor_pledges_select" ON public.donor_pledges;
CREATE POLICY "donor_pledges_select" ON public.donor_pledges
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = donor_pledges.company_id AND m.slug = 'donors' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "donor_pledges_insert" ON public.donor_pledges;
CREATE POLICY "donor_pledges_insert" ON public.donor_pledges
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid() AND role = 'company_admin')
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = donor_pledges.company_id AND m.slug = 'donors' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "donor_pledges_update" ON public.donor_pledges;
CREATE POLICY "donor_pledges_update" ON public.donor_pledges
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid() AND role = 'company_admin')
    AND EXISTS (SELECT 1 FROM company_modules cm JOIN modules m ON m.id = cm.module_id WHERE cm.company_id = donor_pledges.company_id AND m.slug = 'donors' AND cm.status = 'active')
  );
DROP POLICY IF EXISTS "donor_pledges_delete" ON public.donor_pledges;
CREATE POLICY "donor_pledges_delete" ON public.donor_pledges
  FOR DELETE USING (false);
-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS donor_profiles_company_idx ON public.donor_profiles(company_id);
CREATE INDEX IF NOT EXISTS donor_profiles_crm_client_idx ON public.donor_profiles(crm_client_id);
CREATE INDEX IF NOT EXISTS donor_campaigns_company_idx ON public.donor_campaigns(company_id);
CREATE INDEX IF NOT EXISTS donations_company_idx ON public.donations(company_id);
CREATE INDEX IF NOT EXISTS donations_donor_profile_idx ON public.donations(donor_profile_id);
CREATE INDEX IF NOT EXISTS donations_campaign_idx ON public.donations(campaign_id);
CREATE INDEX IF NOT EXISTS donations_date_idx ON public.donations(donation_date);
CREATE INDEX IF NOT EXISTS donor_pledges_company_idx ON public.donor_pledges(company_id);
CREATE INDEX IF NOT EXISTS donor_pledges_donor_profile_idx ON public.donor_pledges(donor_profile_id);
-- =============================================
-- UPDATE TRIGGERS
-- =============================================
DROP TRIGGER IF EXISTS update_donor_profiles_updated_at ON public.donor_profiles;
CREATE TRIGGER update_donor_profiles_updated_at
  BEFORE UPDATE ON public.donor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_donor_campaigns_updated_at ON public.donor_campaigns;
CREATE TRIGGER update_donor_campaigns_updated_at
  BEFORE UPDATE ON public.donor_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_donations_updated_at ON public.donations;
CREATE TRIGGER update_donations_updated_at
  BEFORE UPDATE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_donor_pledges_updated_at ON public.donor_pledges;
CREATE TRIGGER update_donor_pledges_updated_at
  BEFORE UPDATE ON public.donor_pledges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- =============================================
-- DONATION -> DONOR PROFILE SYNC TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.sync_donor_profile_on_donation()
RETURNS TRIGGER AS $$
BEGIN
  -- Update donor profile stats
  UPDATE public.donor_profiles
  SET 
    first_donation_date = COALESCE(first_donation_date, NEW.donation_date),
    last_donation_date = GREATEST(COALESCE(last_donation_date, NEW.donation_date), NEW.donation_date),
    lifetime_giving_amount = lifetime_giving_amount + NEW.amount,
    donor_status = CASE 
      WHEN (lifetime_giving_amount + NEW.amount) >= 10000 THEN 'major'::donor_status
      ELSE 'active'::donor_status
    END,
    updated_at = now()
  WHERE id = NEW.donor_profile_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS sync_donor_profile_on_donation_trigger ON public.donations;
CREATE TRIGGER sync_donor_profile_on_donation_trigger
  AFTER INSERT ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.sync_donor_profile_on_donation();
