-- Fix 1: Update notifications INSERT policy to require proper ownership
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only insert notifications for themselves or for companies they're admin of
  user_id = auth.uid() 
  OR 
  company_id IN (
    SELECT company_id FROM memberships 
    WHERE user_id = auth.uid() 
    AND status = 'active' 
    AND role = 'company_admin'
  )
);
-- Fix 2: Set search_path on fn_validate_workflow_run_engagement
CREATE OR REPLACE FUNCTION public.fn_validate_workflow_run_engagement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate engagement_id references exist if provided
  IF NEW.coaching_engagement_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM coaching_org_engagements 
      WHERE id = NEW.coaching_engagement_id
    ) THEN
      RAISE EXCEPTION 'Invalid coaching_engagement_id: %', NEW.coaching_engagement_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
