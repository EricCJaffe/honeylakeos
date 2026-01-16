-- Create external_contacts table
CREATE TABLE public.external_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  organization_name TEXT,
  website TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint on company_id + email (prevents duplicate emails within company)
-- Only applies when email is not null
CREATE UNIQUE INDEX external_contacts_company_email_unique 
  ON public.external_contacts (company_id, email) 
  WHERE email IS NOT NULL;

-- Index for common queries
CREATE INDEX external_contacts_company_id_idx ON public.external_contacts(company_id);
CREATE INDEX external_contacts_archived_at_idx ON public.external_contacts(archived_at);
CREATE INDEX external_contacts_email_idx ON public.external_contacts(email);

-- Enable RLS
ALTER TABLE public.external_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies - company members can manage external contacts
CREATE POLICY "Company members can view external contacts"
  ON public.external_contacts FOR SELECT
  USING (is_company_member(company_id));

CREATE POLICY "Company members can create external contacts"
  ON public.external_contacts FOR INSERT
  WITH CHECK (is_company_member(company_id));

CREATE POLICY "Company members can update external contacts"
  ON public.external_contacts FOR UPDATE
  USING (is_company_member(company_id));

CREATE POLICY "Company members can delete external contacts"
  ON public.external_contacts FOR DELETE
  USING (is_company_member(company_id));

-- Add trigger for updated_at
CREATE TRIGGER update_external_contacts_updated_at
  BEFORE UPDATE ON public.external_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add external_contact_id to crm_clients (optional FK)
ALTER TABLE public.crm_clients 
  ADD COLUMN external_contact_id UUID REFERENCES public.external_contacts(id) ON DELETE SET NULL;

-- Index for the FK
CREATE INDEX crm_clients_external_contact_id_idx ON public.crm_clients(external_contact_id);