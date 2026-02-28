-- ============================================================
-- COACHES MODULE RETROFIT: Schema + Relationships + Hierarchy
-- ============================================================

-- ------------------------------------------------------------
-- I) ENUMS / CONSTANTS
-- ------------------------------------------------------------

-- Company type enum
DO $$ BEGIN
  CREATE TYPE company_type_enum AS ENUM ('standard', 'coaching_org');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Coaching org status
DO $$ BEGIN
  CREATE TYPE coaching_org_status AS ENUM ('active', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Coaching membership role
DO $$ BEGIN
  CREATE TYPE coaching_membership_role AS ENUM ('org_admin', 'org_ops', 'org_staff');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Manager assignment status
DO $$ BEGIN
  CREATE TYPE manager_assignment_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Engagement status (drop if exists to recreate with correct values)
DO $$ BEGIN
  CREATE TYPE coaching_engagement_status AS ENUM ('active', 'suspended', 'ended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Engagement linkage type
DO $$ BEGIN
  CREATE TYPE engagement_linkage_type AS ENUM ('provisioned_by_coaching_org', 'invited', 'self_linked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Engagement end reason
DO $$ BEGIN
  CREATE TYPE engagement_end_reason AS ENUM ('member_requested', 'coaching_org_requested', 'nonpayment', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Coaching group status
DO $$ BEGIN
  CREATE TYPE coaching_group_status AS ENUM ('active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Grant source type
DO $$ BEGIN
  CREATE TYPE grant_source_type AS ENUM ('coaching_engagement', 'external_advisor', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Grant module enum
DO $$ BEGIN
  CREATE TYPE grant_module AS ENUM ('coaching', 'tasks', 'projects', 'notes', 'docs', 'lms', 'calendar', 'finance', 'crm', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Grant role enum
DO $$ BEGIN
  CREATE TYPE grant_role AS ENUM ('none', 'read', 'comment', 'write', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Grant status
DO $$ BEGIN
  CREATE TYPE grant_status AS ENUM ('active', 'suspended', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Onboarding status
DO $$ BEGIN
  CREATE TYPE coaching_onboarding_status AS ENUM ('pending', 'completed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Template status
DO $$ BEGIN
  CREATE TYPE template_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Company onboarding source
DO $$ BEGIN
  CREATE TYPE company_onboarding_source AS ENUM ('self_signup', 'invited_by_company', 'invited_by_coaching_org', 'created_by_coaching_org');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Coaching engagement assignment role
DO $$ BEGIN
  CREATE TYPE coaching_assignment_role AS ENUM ('primary', 'secondary');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- ------------------------------------------------------------
-- A) COMPANY TYPE TOGGLE + DELEGATED PROVISIONING METADATA
-- ------------------------------------------------------------

-- Add columns to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS company_type company_type_enum NOT NULL DEFAULT 'standard';
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS created_by_coaching_org_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS onboarding_source company_onboarding_source;
-- Indexes for companies
CREATE INDEX IF NOT EXISTS idx_companies_company_type ON public.companies(company_type);
CREATE INDEX IF NOT EXISTS idx_companies_created_by_coaching_org ON public.companies(created_by_coaching_org_id) WHERE created_by_coaching_org_id IS NOT NULL;
-- ------------------------------------------------------------
-- B) COACHING ORG CORE TABLES
-- ------------------------------------------------------------

-- 2) coaching_orgs (bound to a Company tenant)
CREATE TABLE IF NOT EXISTS public.coaching_orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text UNIQUE,
  status coaching_org_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coaching_orgs_status ON public.coaching_orgs(status);
-- 3) coaching_org_memberships
CREATE TABLE IF NOT EXISTS public.coaching_org_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_org_id uuid NOT NULL REFERENCES public.coaching_orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role coaching_membership_role NOT NULL DEFAULT 'org_staff',
  status coaching_org_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_coaching_org_memberships_user UNIQUE (coaching_org_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_coaching_org_memberships_user ON public.coaching_org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_org_memberships_org_status ON public.coaching_org_memberships(coaching_org_id, status);
-- 4) coaching_managers
CREATE TABLE IF NOT EXISTS public.coaching_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_org_id uuid NOT NULL REFERENCES public.coaching_orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status coaching_org_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_coaching_managers_user UNIQUE (coaching_org_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_coaching_managers_user ON public.coaching_managers(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_managers_org_status ON public.coaching_managers(coaching_org_id, status);
-- 5) coaching_coaches
CREATE TABLE IF NOT EXISTS public.coaching_coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_org_id uuid NOT NULL REFERENCES public.coaching_orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status coaching_org_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_coaching_coaches_user UNIQUE (coaching_org_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_coaching_coaches_user ON public.coaching_coaches(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_coaches_org_status ON public.coaching_coaches(coaching_org_id, status);
-- 6) coaching_manager_assignments
CREATE TABLE IF NOT EXISTS public.coaching_manager_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_org_id uuid NOT NULL REFERENCES public.coaching_orgs(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES public.coaching_managers(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES public.coaching_coaches(id) ON DELETE CASCADE,
  status manager_assignment_status NOT NULL DEFAULT 'active',
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Only one active manager per coach
CREATE UNIQUE INDEX IF NOT EXISTS uq_coaching_manager_assignments_active_coach 
ON public.coaching_manager_assignments(coaching_org_id, coach_id) 
WHERE status = 'active';
-- Unique active assignment per manager-coach pair
CREATE UNIQUE INDEX IF NOT EXISTS uq_coaching_manager_assignments_active_pair 
ON public.coaching_manager_assignments(coaching_org_id, manager_id, coach_id) 
WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_coaching_manager_assignments_manager ON public.coaching_manager_assignments(manager_id);
CREATE INDEX IF NOT EXISTS idx_coaching_manager_assignments_coach ON public.coaching_manager_assignments(coach_id);
-- ------------------------------------------------------------
-- C) ENGAGEMENTS (Auto-linked when coaching org provisions company)
-- ------------------------------------------------------------

-- 7) coaching_org_engagements (renamed to avoid conflict with existing coaching_engagements)
CREATE TABLE IF NOT EXISTS public.coaching_org_engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_org_id uuid NOT NULL REFERENCES public.coaching_orgs(id) ON DELETE CASCADE,
  member_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status coaching_engagement_status NOT NULL DEFAULT 'active',
  linkage_type engagement_linkage_type NOT NULL DEFAULT 'provisioned_by_coaching_org',
  linked_by_user_id uuid NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  -- Unlink support fields
  ended_reason engagement_end_reason,
  ended_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Prevent duplicate live engagements
CREATE UNIQUE INDEX IF NOT EXISTS uq_coaching_org_engagements_live 
ON public.coaching_org_engagements(coaching_org_id, member_company_id) 
WHERE status IN ('active', 'suspended');
CREATE INDEX IF NOT EXISTS idx_coaching_org_engagements_org_status ON public.coaching_org_engagements(coaching_org_id, status);
CREATE INDEX IF NOT EXISTS idx_coaching_org_engagements_member_status ON public.coaching_org_engagements(member_company_id, status);
-- 8) coaching_org_engagement_assignments
CREATE TABLE IF NOT EXISTS public.coaching_org_engagement_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_engagement_id uuid NOT NULL REFERENCES public.coaching_org_engagements(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES public.coaching_coaches(id) ON DELETE CASCADE,
  role coaching_assignment_role NOT NULL DEFAULT 'primary',
  status manager_assignment_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_coaching_org_engagement_assignments_coach UNIQUE (coaching_engagement_id, coach_id)
);
CREATE INDEX IF NOT EXISTS idx_coaching_org_engagement_assignments_coach ON public.coaching_org_engagement_assignments(coach_id);
-- ------------------------------------------------------------
-- D) GROUPS (Roster + Rollups)
-- ------------------------------------------------------------

-- 9) coaching_org_groups
CREATE TABLE IF NOT EXISTS public.coaching_org_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_org_id uuid NOT NULL REFERENCES public.coaching_orgs(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES public.coaching_coaches(id) ON DELETE SET NULL,
  name text NOT NULL,
  status coaching_group_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coaching_org_groups_org ON public.coaching_org_groups(coaching_org_id);
CREATE INDEX IF NOT EXISTS idx_coaching_org_groups_coach ON public.coaching_org_groups(coach_id) WHERE coach_id IS NOT NULL;
-- 10) coaching_org_group_members
CREATE TABLE IF NOT EXISTS public.coaching_org_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_group_id uuid NOT NULL REFERENCES public.coaching_org_groups(id) ON DELETE CASCADE,
  coaching_engagement_id uuid NOT NULL REFERENCES public.coaching_org_engagements(id) ON DELETE CASCADE,
  member_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  member_user_id uuid,
  status manager_assignment_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Unique constraint handling null member_user_id
CREATE UNIQUE INDEX IF NOT EXISTS uq_coaching_org_group_members 
ON public.coaching_org_group_members(coaching_group_id, coaching_engagement_id, member_company_id, COALESCE(member_user_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS idx_coaching_org_group_members_engagement ON public.coaching_org_group_members(coaching_engagement_id);
CREATE INDEX IF NOT EXISTS idx_coaching_org_group_members_company ON public.coaching_org_group_members(member_company_id);
-- ------------------------------------------------------------
-- E) CROSS-TENANT GRANTS
-- ------------------------------------------------------------

-- 11) access_grants
CREATE TABLE IF NOT EXISTS public.access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grantor_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  grantee_user_id uuid NOT NULL,
  source_type grant_source_type NOT NULL DEFAULT 'other',
  source_id uuid, -- coaching_org_engagement_id when source_type=coaching_engagement
  module grant_module NOT NULL,
  role grant_role NOT NULL,
  constraints jsonb DEFAULT '{"coaching_scoped_only": true}'::jsonb,
  status grant_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Unique constraint handling null source_id
CREATE UNIQUE INDEX IF NOT EXISTS uq_access_grants 
ON public.access_grants(grantor_company_id, grantee_user_id, module, source_type, COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS idx_access_grants_grantor_grantee ON public.access_grants(grantor_company_id, grantee_user_id, module, status);
CREATE INDEX IF NOT EXISTS idx_access_grants_grantee ON public.access_grants(grantee_user_id, status);
-- ------------------------------------------------------------
-- F) COACHING-SCOPED COLLABORATION HOOK
-- ------------------------------------------------------------

-- Add coaching_engagement_id to tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS coaching_engagement_id uuid REFERENCES public.coaching_org_engagements(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_coaching_engagement ON public.tasks(company_id, coaching_engagement_id) WHERE coaching_engagement_id IS NOT NULL;
-- Add coaching_engagement_id to projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS coaching_engagement_id uuid REFERENCES public.coaching_org_engagements(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_coaching_engagement ON public.projects(company_id, coaching_engagement_id) WHERE coaching_engagement_id IS NOT NULL;
-- Add coaching_engagement_id to notes
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS coaching_engagement_id uuid REFERENCES public.coaching_org_engagements(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_notes_coaching_engagement ON public.notes(company_id, coaching_engagement_id) WHERE coaching_engagement_id IS NOT NULL;
-- ------------------------------------------------------------
-- G) PERMISSION ONBOARDING HOOKS
-- ------------------------------------------------------------

-- 12) coaching_permission_templates
CREATE TABLE IF NOT EXISTS public.coaching_permission_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_org_id uuid NOT NULL REFERENCES public.coaching_orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  template jsonb NOT NULL DEFAULT '{
    "defaults": [
      {"module":"coaching","role":"admin","constraints":{"coaching_scoped_only":true}},
      {"module":"tasks","role":"write","constraints":{"coaching_scoped_only":true}},
      {"module":"projects","role":"write","constraints":{"coaching_scoped_only":true}},
      {"module":"notes","role":"write","constraints":{"coaching_scoped_only":true}}
    ],
    "optional": [
      {"module":"docs","role":"read","constraints":{"coaching_scoped_only":true}},
      {"module":"calendar","role":"read","constraints":{"coaching_scoped_only":true}},
      {"module":"crm","role":"read","constraints":{"coaching_scoped_only":false}}
    ]
  }'::jsonb,
  status template_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_coaching_permission_templates_name UNIQUE (coaching_org_id, name)
);
CREATE INDEX IF NOT EXISTS idx_coaching_permission_templates_org ON public.coaching_permission_templates(coaching_org_id, status);
-- 13) coaching_engagement_onboarding
CREATE TABLE IF NOT EXISTS public.coaching_engagement_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_engagement_id uuid NOT NULL UNIQUE REFERENCES public.coaching_org_engagements(id) ON DELETE CASCADE,
  member_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status coaching_onboarding_status NOT NULL DEFAULT 'pending',
  applied_template_id uuid REFERENCES public.coaching_permission_templates(id) ON DELETE SET NULL,
  completed_by_user_id uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coaching_engagement_onboarding_company ON public.coaching_engagement_onboarding(member_company_id, status);
-- ------------------------------------------------------------
-- H) MODULE SCAFFOLDING
-- ------------------------------------------------------------

-- Seed 'coaches' module if not exists
INSERT INTO public.modules (slug, name, description, category, is_public)
VALUES ('coaches', 'Coaches', 'Coaching organization management and client engagement', 'premium', true)
ON CONFLICT (slug) DO NOTHING;
-- ------------------------------------------------------------
-- TRIGGERS FOR updated_at
-- ------------------------------------------------------------

-- Create or replace the update trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
-- Apply triggers to new tables
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'coaching_orgs',
    'coaching_org_memberships',
    'coaching_managers',
    'coaching_coaches',
    'coaching_manager_assignments',
    'coaching_org_engagements',
    'coaching_org_engagement_assignments',
    'coaching_org_groups',
    'coaching_org_group_members',
    'access_grants',
    'coaching_permission_templates',
    'coaching_engagement_onboarding'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I;
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;
-- ------------------------------------------------------------
-- FUNCTION: Auto-create coaching_org when company_type is set
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_coaching_org_company()
RETURNS TRIGGER AS $$
BEGIN
  -- If company is being set to coaching_org type, ensure coaching_orgs row exists
  IF NEW.company_type = 'coaching_org' THEN
    INSERT INTO public.coaching_orgs (company_id, name)
    VALUES (NEW.id, NEW.name)
    ON CONFLICT (company_id) DO NOTHING;
    
    -- Enable coaches module for this company
    INSERT INTO public.company_modules (company_id, module_id, status)
    SELECT NEW.id, m.id, 'active'
    FROM public.modules m
    WHERE m.slug = 'coaches'
    ON CONFLICT (company_id, module_id) DO UPDATE SET status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS handle_coaching_org_company_trigger ON public.companies;
CREATE TRIGGER handle_coaching_org_company_trigger
  AFTER INSERT OR UPDATE OF company_type ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_coaching_org_company();
-- ------------------------------------------------------------
-- FUNCTION: Auto-create engagement onboarding record
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_coaching_engagement_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  -- Create onboarding record for new engagements
  INSERT INTO public.coaching_engagement_onboarding (
    coaching_engagement_id,
    member_company_id,
    status
  )
  VALUES (
    NEW.id,
    NEW.member_company_id,
    'pending'
  )
  ON CONFLICT (coaching_engagement_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS handle_coaching_engagement_onboarding_trigger ON public.coaching_org_engagements;
CREATE TRIGGER handle_coaching_engagement_onboarding_trigger
  AFTER INSERT ON public.coaching_org_engagements
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_coaching_engagement_onboarding();
