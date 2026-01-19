-- Create in_app_notifications table for SOP review reminders and other notifications
CREATE TABLE public.in_app_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_notifications_user_unread ON public.in_app_notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_company ON public.in_app_notifications(company_id);
CREATE INDEX idx_notifications_entity ON public.in_app_notifications(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.in_app_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.in_app_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
ON public.in_app_notifications
FOR INSERT
WITH CHECK (true);

-- Add sop_status column to track lifecycle state
ALTER TABLE public.sops ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';

-- Add review_reminder_sent_at to track when reminders were sent
ALTER TABLE public.sops ADD COLUMN IF NOT EXISTS review_reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Add overdue_reminder_sent_at to track escalation
ALTER TABLE public.sops ADD COLUMN IF NOT EXISTS overdue_reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Create index for review date queries
CREATE INDEX IF NOT EXISTS idx_sops_next_review ON public.sops(next_review_at) WHERE is_archived = false AND status = 'active';

-- Add review_action column to sop_revisions to track review outcomes
ALTER TABLE public.sop_revisions ADD COLUMN IF NOT EXISTS review_action TEXT;