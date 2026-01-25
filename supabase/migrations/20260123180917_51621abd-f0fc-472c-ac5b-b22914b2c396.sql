-- ============================================
-- Feature Flags Table for Module Control
-- ============================================

-- Create the feature_flags table
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_id text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  CONSTRAINT feature_flags_company_module_unique UNIQUE (company_id, module_id)
);

-- Create index for efficient lookups
CREATE INDEX idx_feature_flags_company_module ON public.feature_flags(company_id, module_id);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies using existing is_company_member function
CREATE POLICY "feature_flags_select" ON public.feature_flags
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM memberships 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
);

CREATE POLICY "feature_flags_insert" ON public.feature_flags
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id FROM memberships 
    WHERE user_id = auth.uid() 
    AND status = 'active' 
    AND role = 'company_admin'
  )
);

CREATE POLICY "feature_flags_update" ON public.feature_flags
FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM memberships 
    WHERE user_id = auth.uid() 
    AND status = 'active' 
    AND role = 'company_admin'
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM memberships 
    WHERE user_id = auth.uid() 
    AND status = 'active' 
    AND role = 'company_admin'
  )
);

CREATE POLICY "feature_flags_delete" ON public.feature_flags
FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM memberships 
    WHERE user_id = auth.uid() 
    AND status = 'active' 
    AND role = 'company_admin'
  )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_feature_flags_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_feature_flags_updated_at();

-- Add comment
COMMENT ON TABLE public.feature_flags IS 'Per-company feature flags for module enablement. Allows disabling modules without affecting data.';