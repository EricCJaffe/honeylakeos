-- Create company terminology table
CREATE TABLE public.company_terminology (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  term_key TEXT NOT NULL,
  singular_label TEXT NOT NULL,
  plural_label TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(company_id, term_key)
);

-- Enable RLS
ALTER TABLE public.company_terminology ENABLE ROW LEVEL SECURITY;

-- Read: all company members
CREATE POLICY "Company members can view terminology"
ON public.company_terminology
FOR SELECT
USING (is_company_member(company_id));

-- Write: Company Admin only
CREATE POLICY "Company admins can insert terminology"
ON public.company_terminology
FOR INSERT
WITH CHECK (is_company_admin(company_id));

CREATE POLICY "Company admins can update terminology"
ON public.company_terminology
FOR UPDATE
USING (is_company_admin(company_id));

CREATE POLICY "Company admins can delete terminology"
ON public.company_terminology
FOR DELETE
USING (is_company_admin(company_id));

-- Create index for fast lookups
CREATE INDEX idx_company_terminology_company_id ON public.company_terminology(company_id);

-- Add trigger for updated_at
CREATE TRIGGER update_company_terminology_updated_at
BEFORE UPDATE ON public.company_terminology
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();