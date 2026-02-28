-- Create enum for entity types that can have contacts
CREATE TYPE public.entity_contact_type AS ENUM ('client', 'donor', 'vendor');
-- Create entity_contacts link table (polymorphic)
CREATE TABLE IF NOT EXISTS public.entity_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type public.entity_contact_type NOT NULL,
  entity_id UUID NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.external_contacts(id) ON DELETE CASCADE,
  role_title TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
-- Create indexes for efficient querying
CREATE INDEX idx_entity_contacts_company ON public.entity_contacts(company_id);
CREATE INDEX idx_entity_contacts_entity ON public.entity_contacts(entity_type, entity_id);
CREATE INDEX idx_entity_contacts_contact ON public.entity_contacts(contact_id);
-- Create unique partial index to enforce only one primary per entity
CREATE UNIQUE INDEX idx_entity_contacts_single_primary 
  ON public.entity_contacts(company_id, entity_type, entity_id) 
  WHERE is_primary = true;
-- Enable RLS
ALTER TABLE public.entity_contacts ENABLE ROW LEVEL SECURITY;
-- RLS policies for entity_contacts
CREATE POLICY "entity_contacts_select" 
  ON public.entity_contacts 
  FOR SELECT 
  USING (
    company_id IN (
      SELECT m.company_id FROM public.memberships m 
      WHERE m.user_id = auth.uid() 
      AND m.status = 'active'
    )
  );
CREATE POLICY "entity_contacts_insert" 
  ON public.entity_contacts 
  FOR INSERT 
  WITH CHECK (
    company_id IN (
      SELECT m.company_id FROM public.memberships m 
      WHERE m.user_id = auth.uid() 
      AND m.status = 'active'
    )
  );
CREATE POLICY "entity_contacts_update" 
  ON public.entity_contacts 
  FOR UPDATE 
  USING (
    company_id IN (
      SELECT m.company_id FROM public.memberships m 
      WHERE m.user_id = auth.uid() 
      AND m.status = 'active'
    )
  );
CREATE POLICY "entity_contacts_delete" 
  ON public.entity_contacts 
  FOR DELETE 
  USING (
    company_id IN (
      SELECT m.company_id FROM public.memberships m 
      WHERE m.user_id = auth.uid() 
      AND m.status = 'active'
    )
  );
-- Add comment
COMMENT ON TABLE public.entity_contacts IS 'Polymorphic link table connecting external_contacts to clients, donors, and vendors';
