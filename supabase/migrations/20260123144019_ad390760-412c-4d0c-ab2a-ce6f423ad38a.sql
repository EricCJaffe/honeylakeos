
-- Add milestone step type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'milestone' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'coaching_step_type')) THEN
    ALTER TYPE public.coaching_step_type ADD VALUE 'milestone';
  END IF;
END $$;
