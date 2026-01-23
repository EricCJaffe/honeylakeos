
-- Add missing workflow_default_assignee values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'org_admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'workflow_default_assignee')) THEN
    ALTER TYPE public.workflow_default_assignee ADD VALUE 'org_admin';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'member' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'workflow_default_assignee')) THEN
    ALTER TYPE public.workflow_default_assignee ADD VALUE 'member';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'manager' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'workflow_default_assignee')) THEN
    ALTER TYPE public.workflow_default_assignee ADD VALUE 'manager';
  END IF;
END $$;
