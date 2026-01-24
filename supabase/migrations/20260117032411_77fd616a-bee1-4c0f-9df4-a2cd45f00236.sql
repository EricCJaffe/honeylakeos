-- Support Center Module: KB Categories, Articles, Tickets, Messages, Events

-- =============================================
-- KB CATEGORIES (Site-Level)
-- =============================================
CREATE TABLE public.kb_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.kb_categories ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_kb_categories_site_id ON public.kb_categories(site_id);
CREATE INDEX idx_kb_categories_sort_order ON public.kb_categories(site_id, sort_order);

-- RLS Policies
CREATE POLICY "kb_categories_select_authenticated"
  ON public.kb_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "kb_categories_insert_site_admin"
  ON public.kb_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.site_memberships sm
      WHERE sm.site_id = kb_categories.site_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('super_admin', 'site_admin')
    )
  );

CREATE POLICY "kb_categories_update_site_admin"
  ON public.kb_categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.site_memberships sm
      WHERE sm.site_id = kb_categories.site_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('super_admin', 'site_admin')
    )
  );

CREATE POLICY "kb_categories_delete_site_admin"
  ON public.kb_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.site_memberships sm
      WHERE sm.site_id = kb_categories.site_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('super_admin', 'site_admin')
    )
  );

-- =============================================
-- KB ARTICLES (Site-Level)
-- =============================================
CREATE TYPE public.kb_article_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE public.kb_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.kb_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body_rich_text TEXT,
  tags TEXT[] DEFAULT '{}',
  status public.kb_article_status NOT NULL DEFAULT 'draft',
  helpful_yes_count INTEGER NOT NULL DEFAULT 0,
  helpful_no_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_kb_articles_site_id ON public.kb_articles(site_id);
CREATE INDEX idx_kb_articles_category_id ON public.kb_articles(category_id);
CREATE INDEX idx_kb_articles_status ON public.kb_articles(site_id, status);
CREATE INDEX idx_kb_articles_tags ON public.kb_articles USING GIN(tags);

-- RLS Policies: Anyone authenticated can read published, admins can read all
CREATE POLICY "kb_articles_select_published"
  ON public.kb_articles FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      status = 'published' OR
      EXISTS (
        SELECT 1 FROM public.site_memberships sm
        WHERE sm.site_id = kb_articles.site_id
          AND sm.user_id = auth.uid()
          AND sm.role IN ('super_admin', 'site_admin')
      )
    )
  );

CREATE POLICY "kb_articles_insert_site_admin"
  ON public.kb_articles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.site_memberships sm
      WHERE sm.site_id = kb_articles.site_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('super_admin', 'site_admin')
    )
  );

CREATE POLICY "kb_articles_update_site_admin"
  ON public.kb_articles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.site_memberships sm
      WHERE sm.site_id = kb_articles.site_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('super_admin', 'site_admin')
    )
  );

CREATE POLICY "kb_articles_delete_site_admin"
  ON public.kb_articles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.site_memberships sm
      WHERE sm.site_id = kb_articles.site_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('super_admin', 'site_admin')
    )
  );

-- =============================================
-- SUPPORT TICKETS (Site-Level, linked to company/user)
-- =============================================
CREATE TYPE public.ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE public.ticket_status AS ENUM ('new', 'triage', 'in_progress', 'waiting_on_requester', 'resolved', 'closed');

CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  ticket_number SERIAL,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority public.ticket_priority NOT NULL DEFAULT 'normal',
  status public.ticket_status NOT NULL DEFAULT 'new',
  assigned_to_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_support_tickets_site_id ON public.support_tickets(site_id);
CREATE INDEX idx_support_tickets_created_by ON public.support_tickets(created_by_user_id);
CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets(assigned_to_user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(site_id, status);
CREATE INDEX idx_support_tickets_priority ON public.support_tickets(site_id, priority);
CREATE INDEX idx_support_tickets_created_at ON public.support_tickets(site_id, created_at DESC);
CREATE INDEX idx_support_tickets_number ON public.support_tickets(site_id, ticket_number DESC);

-- RLS Policies: Requesters see own, Agents/Admins see all
CREATE POLICY "support_tickets_select_own_or_admin"
  ON public.support_tickets FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      created_by_user_id = auth.uid() OR
      assigned_to_user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.site_memberships sm
        WHERE sm.site_id = support_tickets.site_id
          AND sm.user_id = auth.uid()
          AND sm.role IN ('super_admin', 'site_admin')
      )
    )
  );

CREATE POLICY "support_tickets_insert_authenticated"
  ON public.support_tickets FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND created_by_user_id = auth.uid()
  );

CREATE POLICY "support_tickets_update_own_or_admin"
  ON public.support_tickets FOR UPDATE
  USING (
    created_by_user_id = auth.uid() OR
    assigned_to_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.site_memberships sm
      WHERE sm.site_id = support_tickets.site_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('super_admin', 'site_admin')
    )
  );

-- =============================================
-- SUPPORT TICKET MESSAGES (Threaded Conversation)
-- =============================================
CREATE TYPE public.ticket_author_type AS ENUM ('requester', 'agent');

CREATE TABLE public.support_ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id),
  author_type public.ticket_author_type NOT NULL DEFAULT 'requester',
  body_rich_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_support_ticket_messages_ticket_id ON public.support_ticket_messages(ticket_id);
CREATE INDEX idx_support_ticket_messages_created_at ON public.support_ticket_messages(ticket_id, created_at);

-- RLS Policies: Same visibility as parent ticket
CREATE POLICY "support_ticket_messages_select"
  ON public.support_ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_messages.ticket_id
        AND (
          t.created_by_user_id = auth.uid() OR
          t.assigned_to_user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.site_memberships sm
            WHERE sm.site_id = t.site_id
              AND sm.user_id = auth.uid()
              AND sm.role IN ('super_admin', 'site_admin')
          )
        )
    )
  );

CREATE POLICY "support_ticket_messages_insert"
  ON public.support_ticket_messages FOR INSERT
  WITH CHECK (
    author_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_messages.ticket_id
        AND (
          t.created_by_user_id = auth.uid() OR
          t.assigned_to_user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.site_memberships sm
            WHERE sm.site_id = t.site_id
              AND sm.user_id = auth.uid()
              AND sm.role IN ('super_admin', 'site_admin')
          )
        )
    )
  );

-- =============================================
-- SUPPORT TICKET EVENTS (Audit Timeline)
-- =============================================
CREATE TABLE public.support_ticket_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_ticket_events ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_support_ticket_events_ticket_id ON public.support_ticket_events(ticket_id);
CREATE INDEX idx_support_ticket_events_created_at ON public.support_ticket_events(ticket_id, created_at);

-- RLS Policies: Same visibility as parent ticket
CREATE POLICY "support_ticket_events_select"
  ON public.support_ticket_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_events.ticket_id
        AND (
          t.created_by_user_id = auth.uid() OR
          t.assigned_to_user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.site_memberships sm
            WHERE sm.site_id = t.site_id
              AND sm.user_id = auth.uid()
              AND sm.role IN ('super_admin', 'site_admin')
          )
        )
    )
  );

CREATE POLICY "support_ticket_events_insert"
  ON public.support_ticket_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_events.ticket_id
        AND (
          t.created_by_user_id = auth.uid() OR
          t.assigned_to_user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.site_memberships sm
            WHERE sm.site_id = t.site_id
              AND sm.user_id = auth.uid()
              AND sm.role IN ('super_admin', 'site_admin')
          )
        )
    )
  );

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================
CREATE TRIGGER update_kb_categories_updated_at
  BEFORE UPDATE ON public.kb_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kb_articles_updated_at
  BEFORE UPDATE ON public.kb_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FUNCTION: Get site_id for current user (helper)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_site_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_site_id UUID;
BEGIN
  -- Get site_id from any company the user is a member of
  SELECT c.site_id INTO v_site_id
  FROM public.memberships m
  JOIN public.companies c ON c.id = m.company_id
  WHERE m.user_id = auth.uid()
  LIMIT 1;
  
  RETURN v_site_id;
END;
$$;