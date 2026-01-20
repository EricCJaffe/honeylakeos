-- 1) Add description field to sales_opportunities
ALTER TABLE public.sales_opportunities 
ADD COLUMN IF NOT EXISTS description_rich_text TEXT;

-- 2) Create sales_opportunity_comments table
CREATE TABLE public.sales_opportunity_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.sales_opportunities(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL,
  body_rich_text TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_opportunity_comments_opportunity_id ON public.sales_opportunity_comments(opportunity_id);
CREATE INDEX idx_opportunity_comments_company_id ON public.sales_opportunity_comments(company_id);
CREATE INDEX idx_opportunity_comments_created_at ON public.sales_opportunity_comments(created_at);

-- Enable RLS
ALTER TABLE public.sales_opportunity_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales_opportunity_comments
-- View: Company members can view comments
CREATE POLICY "Company members can view opportunity comments"
ON public.sales_opportunity_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = sales_opportunity_comments.company_id
    AND m.user_id = auth.uid()
  )
);

-- Insert: Company members can add comments
CREATE POLICY "Company members can add opportunity comments"
ON public.sales_opportunity_comments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.company_id = sales_opportunity_comments.company_id
    AND m.user_id = auth.uid()
  )
  AND author_user_id = auth.uid()
);

-- Add audit trigger for comments
CREATE OR REPLACE FUNCTION public.audit_opportunity_comment_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    company_id,
    entity_type,
    entity_id,
    action,
    actor_user_id,
    metadata
  ) VALUES (
    NEW.company_id,
    'sales_opportunity_comment',
    NEW.id,
    'created',
    NEW.author_user_id,
    jsonb_build_object('opportunity_id', NEW.opportunity_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_opportunity_comment_created
AFTER INSERT ON public.sales_opportunity_comments
FOR EACH ROW
EXECUTE FUNCTION public.audit_opportunity_comment_created();

-- Add audit trigger for opportunity description updates
CREATE OR REPLACE FUNCTION public.audit_opportunity_description_updated()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.description_rich_text IS DISTINCT FROM NEW.description_rich_text THEN
    INSERT INTO public.audit_logs (
      company_id,
      entity_type,
      entity_id,
      action,
      actor_user_id,
      metadata
    ) VALUES (
      NEW.company_id,
      'sales_opportunity',
      NEW.id,
      'description_updated',
      auth.uid(),
      jsonb_build_object(
        'had_previous', OLD.description_rich_text IS NOT NULL
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_opportunity_description_updated
AFTER UPDATE ON public.sales_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.audit_opportunity_description_updated();