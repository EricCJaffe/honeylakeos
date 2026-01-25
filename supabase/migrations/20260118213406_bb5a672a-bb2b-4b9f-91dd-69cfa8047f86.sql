-- Create status enum for announcements
CREATE TYPE public.announcement_status AS ENUM ('draft', 'published', 'archived');

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body_rte TEXT NOT NULL,
  status public.announcement_status NOT NULL DEFAULT 'draft',
  publish_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create announcement_reads table
CREATE TABLE public.announcement_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Create indexes
CREATE INDEX idx_announcements_company_id ON public.announcements(company_id);
CREATE INDEX idx_announcements_status ON public.announcements(status);
CREATE INDEX idx_announcements_publish_at ON public.announcements(publish_at);
CREATE INDEX idx_announcement_reads_announcement_id ON public.announcement_reads(announcement_id);
CREATE INDEX idx_announcement_reads_user_id ON public.announcement_reads(user_id);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- RLS for announcements: SELECT - any company member
CREATE POLICY "Company members can view announcements"
ON public.announcements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = announcements.company_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
  )
);

-- RLS for announcements: INSERT - company admin only
CREATE POLICY "Company admins can create announcements"
ON public.announcements
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = announcements.company_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND m.role = 'company_admin'
  )
);

-- RLS for announcements: UPDATE - company admin only
CREATE POLICY "Company admins can update announcements"
ON public.announcements
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = announcements.company_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND m.role = 'company_admin'
  )
);

-- RLS for announcements: DELETE - company admin only
CREATE POLICY "Company admins can delete announcements"
ON public.announcements
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = announcements.company_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND m.role = 'company_admin'
  )
);

-- RLS for announcement_reads: SELECT - users can see their own reads
CREATE POLICY "Users can view their own announcement reads"
ON public.announcement_reads
FOR SELECT
USING (user_id = auth.uid());

-- RLS for announcement_reads: INSERT - users can acknowledge announcements
CREATE POLICY "Users can acknowledge announcements"
ON public.announcement_reads
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = announcement_reads.company_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();