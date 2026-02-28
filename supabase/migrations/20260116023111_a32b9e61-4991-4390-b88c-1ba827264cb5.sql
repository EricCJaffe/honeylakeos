-- Add role and response_status columns to event_attendees
ALTER TABLE public.event_attendees
ADD COLUMN role text NOT NULL DEFAULT 'required',
ADD COLUMN response_status text NOT NULL DEFAULT 'needs_action';
-- Add check constraints for valid values
ALTER TABLE public.event_attendees
ADD CONSTRAINT event_attendees_role_check 
CHECK (role IN ('required', 'optional'));
ALTER TABLE public.event_attendees
ADD CONSTRAINT event_attendees_response_status_check 
CHECK (response_status IN ('needs_action', 'accepted', 'declined', 'tentative'));
-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_event 
ON public.event_attendees(user_id, event_id);
-- Add policy for attendees to update their own response status
CREATE POLICY "event_attendees_update_own_response"
ON public.event_attendees
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
