
-- =====================================================
-- STEP 1: ADD MISSING WORKFLOW TYPES TO ENUM
-- =====================================================
-- These must be committed before they can be used in data inserts

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'engagement_lifecycle' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'coaching_workflow_type')) THEN
    ALTER TYPE public.coaching_workflow_type ADD VALUE 'engagement_lifecycle';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'member_onboarding' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'coaching_workflow_type')) THEN
    ALTER TYPE public.coaching_workflow_type ADD VALUE 'member_onboarding';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'coach_assignment' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'coaching_workflow_type')) THEN
    ALTER TYPE public.coaching_workflow_type ADD VALUE 'coach_assignment';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'periodic_review' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'coaching_workflow_type')) THEN
    ALTER TYPE public.coaching_workflow_type ADD VALUE 'periodic_review';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'coaching_cadence' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'coaching_workflow_type')) THEN
    ALTER TYPE public.coaching_workflow_type ADD VALUE 'coaching_cadence';
  END IF;
END $$;
