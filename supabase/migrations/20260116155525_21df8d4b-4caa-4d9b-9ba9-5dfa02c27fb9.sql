-- Create CRM clients table
CREATE TABLE public.crm_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Type and lifecycle
  type TEXT NOT NULL DEFAULT 'mixed' CHECK (type IN ('b2c', 'b2b', 'mixed')),
  lifecycle_status TEXT NOT NULL DEFAULT 'prospect' CHECK (lifecycle_status IN ('prospect', 'client')),
  
  -- Primary person (B2C or contact for B2B)
  person_full_name TEXT,
  person_email TEXT,
  person_phone TEXT,
  
  -- Organization (B2B)
  org_name TEXT,
  org_email TEXT,
  org_phone TEXT,
  org_website TEXT,
  
  -- Additional info
  notes TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  archived_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure at least person or org is provided
  CONSTRAINT crm_clients_has_identity CHECK (
    person_full_name IS NOT NULL OR org_name IS NOT NULL
  )
);
-- Enable RLS
ALTER TABLE public.crm_clients ENABLE ROW LEVEL SECURITY;
-- RLS Policies: Company members can CRUD their own company's CRM records
CREATE POLICY "Company members can view CRM clients"
ON public.crm_clients
FOR SELECT
USING (is_company_member(company_id));
CREATE POLICY "Company members can create CRM clients"
ON public.crm_clients
FOR INSERT
WITH CHECK (is_company_member(company_id));
CREATE POLICY "Company members can update CRM clients"
ON public.crm_clients
FOR UPDATE
USING (is_company_member(company_id));
CREATE POLICY "Company members can delete CRM clients"
ON public.crm_clients
FOR DELETE
USING (is_company_member(company_id));
-- Indexes for common queries
CREATE INDEX idx_crm_clients_company_id ON public.crm_clients(company_id);
CREATE INDEX idx_crm_clients_lifecycle_status ON public.crm_clients(lifecycle_status);
CREATE INDEX idx_crm_clients_type ON public.crm_clients(type);
CREATE INDEX idx_crm_clients_archived_at ON public.crm_clients(archived_at);
CREATE INDEX idx_crm_clients_person_email ON public.crm_clients(person_email);
CREATE INDEX idx_crm_clients_org_name ON public.crm_clients(org_name);
-- Add trigger for updated_at
CREATE TRIGGER update_crm_clients_updated_at
BEFORE UPDATE ON public.crm_clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Insert CRM module if it doesn't exist
INSERT INTO public.modules (id, name, slug, description, category, is_public)
VALUES (
  gen_random_uuid(),
  'CRM',
  'crm',
  'Manage prospects and clients with contact information and lifecycle tracking',
  'core',
  true
)
ON CONFLICT (slug) DO NOTHING;
