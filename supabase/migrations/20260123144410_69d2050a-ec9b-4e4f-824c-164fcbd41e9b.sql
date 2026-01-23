
-- =====================================================
-- CONVENE PROGRAM PACK - SCHEMA ADDITIONS
-- =====================================================
-- Add Convene-specific workflow types

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'chair_recruitment' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'coaching_workflow_type')) THEN
    ALTER TYPE public.coaching_workflow_type ADD VALUE 'chair_recruitment';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'chair_onboarding' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'coaching_workflow_type')) THEN
    ALTER TYPE public.coaching_workflow_type ADD VALUE 'chair_onboarding';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'forum_launch' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'coaching_workflow_type')) THEN
    ALTER TYPE public.coaching_workflow_type ADD VALUE 'forum_launch';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'forum_cadence' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'coaching_workflow_type')) THEN
    ALTER TYPE public.coaching_workflow_type ADD VALUE 'forum_cadence';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'quarterly_review' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'coaching_workflow_type')) THEN
    ALTER TYPE public.coaching_workflow_type ADD VALUE 'quarterly_review';
  END IF;
END $$;
