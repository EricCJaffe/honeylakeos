
-- Fix 1: Set status to 'active' for all memberships that have null status
UPDATE public.memberships 
SET status = 'active' 
WHERE status IS NULL;

-- Fix 2: Set a default value for status column going forward
ALTER TABLE public.memberships 
ALTER COLUMN status SET DEFAULT 'active';
