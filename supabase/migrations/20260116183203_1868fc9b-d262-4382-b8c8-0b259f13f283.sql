-- Create company capability settings table
CREATE TABLE public.company_capability_settings (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- CRM capabilities
  crm_member_manage_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- External Contacts capabilities  
  contacts_member_manage_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Coaches/Partners capabilities
  coaches_member_manage_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Forms capabilities
  forms_member_manage_enabled BOOLEAN NOT NULL DEFAULT true,
  forms_member_publish_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- LMS capabilities
  lms_member_manage_enabled BOOLEAN NOT NULL DEFAULT true,
  lms_member_publish_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.company_capability_settings ENABLE ROW LEVEL SECURITY;

-- All company members can read capability settings (needed for UI gating)
CREATE POLICY "company_capability_settings_select_members"
ON public.company_capability_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.company_id = company_capability_settings.company_id
    AND memberships.user_id = auth.uid()
    AND memberships.status = 'active'
  )
);

-- Only company admins can update capability settings
CREATE POLICY "company_capability_settings_update_admin"
ON public.company_capability_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.company_id = company_capability_settings.company_id
    AND memberships.user_id = auth.uid()
    AND memberships.status = 'active'
    AND memberships.role = 'company_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.company_id = company_capability_settings.company_id
    AND memberships.user_id = auth.uid()
    AND memberships.status = 'active'
    AND memberships.role = 'company_admin'
  )
);

-- Only company admins can insert capability settings
CREATE POLICY "company_capability_settings_insert_admin"
ON public.company_capability_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memberships
    WHERE memberships.company_id = company_capability_settings.company_id
    AND memberships.user_id = auth.uid()
    AND memberships.status = 'active'
    AND memberships.role = 'company_admin'
  )
);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_company_capability_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_company_capability_settings_updated_at
BEFORE UPDATE ON public.company_capability_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_company_capability_settings_timestamp();

-- Add comment for documentation
COMMENT ON TABLE public.company_capability_settings IS 'Company-scoped capability flags that control what actions regular members can perform. All flags default to true (permissive). When false, only admins can perform those actions.';