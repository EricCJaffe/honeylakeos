-- ============================================================
-- PROMPT 11 PART 2: Add source column and extend plans table
-- ============================================================

-- Add source enum type if not exists
DO $$ BEGIN
  CREATE TYPE public.subscription_source AS ENUM ('self', 'provisioned_by_coaching_org', 'imported', 'site_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Add requires_action and trial to plan_status enum if not exists
DO $$ BEGIN
  ALTER TYPE public.plan_status ADD VALUE IF NOT EXISTS 'requires_action';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.plan_status ADD VALUE IF NOT EXISTS 'trial';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Add columns to company_plans
ALTER TABLE public.company_plans 
ADD COLUMN IF NOT EXISTS source public.subscription_source DEFAULT 'self',
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
ADD COLUMN IF NOT EXISTS grace_ends_at timestamptz,
ADD COLUMN IF NOT EXISTS provisioned_by_coaching_org_id uuid;
-- Add entitlements column to plans table
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS entitlements jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
-- Update existing plans with default entitlements
UPDATE public.plans SET entitlements = jsonb_build_object(
  'modules', jsonb_build_object(
    'tasks', true,
    'projects', true,
    'calendar', true,
    'notes', true,
    'documents', true,
    'crm', CASE WHEN slug IN ('growth', 'scale', 'coaching_team', 'coaching_firm') THEN true ELSE false END,
    'donors', CASE WHEN slug IN ('scale', 'coaching_firm') THEN true ELSE false END,
    'finance', CASE WHEN slug IN ('growth', 'scale', 'coaching_team', 'coaching_firm') THEN true ELSE false END,
    'lms', CASE WHEN slug IN ('growth', 'scale', 'solo_coach', 'coaching_team', 'coaching_firm') THEN true ELSE false END,
    'coaches', CASE WHEN slug IN ('solo_coach', 'coaching_team', 'coaching_firm') THEN true ELSE false END,
    'reports', true
  ),
  'limits', jsonb_build_object(
    'users', CASE 
      WHEN slug = 'starter' THEN 5
      WHEN slug = 'growth' THEN 25
      WHEN slug = 'scale' THEN 999999
      WHEN slug = 'solo_coach' THEN 1
      WHEN slug = 'coaching_team' THEN 10
      WHEN slug = 'coaching_firm' THEN 999999
      ELSE 5
    END,
    'storage_gb', CASE 
      WHEN slug = 'starter' THEN 5
      WHEN slug = 'growth' THEN 50
      WHEN slug = 'scale' THEN 500
      WHEN slug = 'solo_coach' THEN 5
      WHEN slug = 'coaching_team' THEN 50
      WHEN slug = 'coaching_firm' THEN 500
      ELSE 5
    END
  ),
  'features', jsonb_build_object(
    'multi_company', CASE WHEN slug IN ('scale', 'coaching_firm') THEN true ELSE false END,
    'advanced_reporting', CASE WHEN slug IN ('growth', 'scale', 'coaching_team', 'coaching_firm') THEN true ELSE false END,
    'framework_marketplace_publish', CASE WHEN slug IN ('coaching_team', 'coaching_firm') THEN true ELSE false END
  )
) WHERE entitlements = '{}'::jsonb OR entitlements IS NULL;
-- Add free_minimal plan if not exists
INSERT INTO public.plans (name, slug, description, plan_type, is_default, sort_order, entitlements, status)
VALUES (
  'Free Minimal',
  'free_minimal',
  'Limited access after coaching ends - requires subscription decision',
  'company',
  false,
  0,
  jsonb_build_object(
    'modules', jsonb_build_object(
      'tasks', true,
      'projects', false,
      'calendar', true,
      'notes', true,
      'documents', false,
      'crm', false,
      'donors', false,
      'finance', false,
      'lms', false,
      'coaches', false,
      'reports', false
    ),
    'limits', jsonb_build_object('users', 3, 'storage_gb', 1),
    'features', jsonb_build_object('multi_company', false, 'advanced_reporting', false)
  ),
  'active'
)
ON CONFLICT (slug) DO NOTHING;
