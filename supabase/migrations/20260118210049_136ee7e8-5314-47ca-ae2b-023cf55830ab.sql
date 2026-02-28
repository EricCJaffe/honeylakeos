-- Create enum for entity kind (organization vs individual)
CREATE TYPE public.entity_kind AS ENUM ('organization', 'individual');
-- Add entity_kind column to crm_clients with default 'organization'
ALTER TABLE public.crm_clients 
  ADD COLUMN entity_kind public.entity_kind NOT NULL DEFAULT 'organization';
-- Add primary_contact_id for denormalized quick access
ALTER TABLE public.crm_clients 
  ADD COLUMN primary_contact_id UUID REFERENCES public.external_contacts(id) ON DELETE SET NULL;
-- Create index on primary_contact_id for faster lookups
CREATE INDEX idx_crm_clients_primary_contact ON public.crm_clients(primary_contact_id);
-- Create index on entity_kind for filtering
CREATE INDEX idx_crm_clients_entity_kind ON public.crm_clients(entity_kind);
-- Migrate existing data: set entity_kind based on current data patterns
-- If org_name exists and is primary (no person_full_name OR has both), keep as organization
-- If only person_full_name exists without org_name, set as individual
UPDATE public.crm_clients
SET entity_kind = 'individual'
WHERE org_name IS NULL AND person_full_name IS NOT NULL;
-- Add comment explaining the columns
COMMENT ON COLUMN public.crm_clients.entity_kind IS 'Distinguishes organization clients from individual clients';
COMMENT ON COLUMN public.crm_clients.primary_contact_id IS 'Denormalized FK to primary contact for quick display; synced with entity_contacts primary';
