-- Fix: Drop the partially created table and policies if they exist
DROP TABLE IF EXISTS public.wf_form_logic_rules CASCADE;

-- Recreate logic rules table
CREATE TABLE public.wf_form_logic_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id uuid NOT NULL REFERENCES public.wf_forms(id) ON DELETE CASCADE,
  source_field_id uuid NOT NULL REFERENCES public.wf_form_fields(id) ON DELETE CASCADE,
  operator text NOT NULL CHECK (operator IN ('equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty')),
  value jsonb,
  action text NOT NULL CHECK (action IN ('skip_to', 'hide_block', 'end_form')),
  target_field_id uuid REFERENCES public.wf_form_fields(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on logic rules
ALTER TABLE public.wf_form_logic_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for logic rules - using correct role enum value 'company_admin'
CREATE POLICY "Users can view logic rules for accessible forms"
ON public.wf_form_logic_rules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.wf_forms f
    WHERE f.id = form_id
    AND (
      f.company_id IN (SELECT company_id FROM public.memberships WHERE user_id = auth.uid())
      OR f.site_id IN (SELECT site_id FROM public.site_memberships WHERE user_id = auth.uid())
    )
  )
);

CREATE POLICY "Company admins can manage logic rules"
ON public.wf_form_logic_rules
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.wf_forms f
    JOIN public.memberships m ON m.company_id = f.company_id
    WHERE f.id = form_id
    AND m.user_id = auth.uid()
    AND m.role = 'company_admin'
  )
);

-- Create index for logic rules lookup
CREATE INDEX idx_wf_form_logic_rules_form 
ON public.wf_form_logic_rules(form_id, sort_order);

-- Add trigger for updated_at
CREATE TRIGGER update_wf_form_logic_rules_updated_at
BEFORE UPDATE ON public.wf_form_logic_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();