-- Drop the overly permissive insert policy
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.in_app_notifications;

-- Create a proper insert policy - only company members can have notifications created for them
-- This works because edge functions with service role key bypass RLS
-- For frontend, we prevent direct inserts entirely
CREATE POLICY "Prevent direct notification inserts"
ON public.in_app_notifications
FOR INSERT
WITH CHECK (false);