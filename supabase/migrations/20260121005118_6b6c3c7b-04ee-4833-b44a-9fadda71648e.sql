-- Fix entity_links constraints and function to support all entity types
-- This addresses the "ENTITY_NOT_FOUND" bug when linking CRM clients, opportunities, etc.

-- Drop old constraints
ALTER TABLE public.entity_links DROP CONSTRAINT IF EXISTS valid_from_type;
ALTER TABLE public.entity_links DROP CONSTRAINT IF EXISTS valid_to_type;
-- Add updated constraints with all entity types
ALTER TABLE public.entity_links ADD CONSTRAINT valid_from_type 
  CHECK (from_type IN ('task', 'project', 'note', 'document', 'event', 'crm_client', 'external_contact', 'coach_profile', 'sales_opportunity', 'donation'));
ALTER TABLE public.entity_links ADD CONSTRAINT valid_to_type 
  CHECK (to_type IN ('task', 'project', 'note', 'document', 'event', 'crm_client', 'external_contact', 'coach_profile', 'sales_opportunity', 'donation'));
-- Update the helper function to support all entity types
CREATE OR REPLACE FUNCTION public.get_entity_company_id(p_entity_type text, p_entity_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  CASE p_entity_type
    WHEN 'task' THEN
      SELECT company_id INTO v_company_id FROM tasks WHERE id = p_entity_id;
    WHEN 'project' THEN
      SELECT company_id INTO v_company_id FROM projects WHERE id = p_entity_id;
    WHEN 'note' THEN
      SELECT company_id INTO v_company_id FROM notes WHERE id = p_entity_id;
    WHEN 'document' THEN
      SELECT company_id INTO v_company_id FROM documents WHERE id = p_entity_id;
    WHEN 'event' THEN
      SELECT company_id INTO v_company_id FROM events WHERE id = p_entity_id;
    WHEN 'crm_client' THEN
      SELECT company_id INTO v_company_id FROM crm_clients WHERE id = p_entity_id;
    WHEN 'external_contact' THEN
      SELECT company_id INTO v_company_id FROM external_contacts WHERE id = p_entity_id;
    WHEN 'coach_profile' THEN
      SELECT company_id INTO v_company_id FROM coach_profiles WHERE id = p_entity_id;
    WHEN 'sales_opportunity' THEN
      SELECT company_id INTO v_company_id FROM sales_opportunities WHERE id = p_entity_id;
    WHEN 'donation' THEN
      SELECT company_id INTO v_company_id FROM donations WHERE id = p_entity_id;
    ELSE
      RETURN NULL;
  END CASE;
  RETURN v_company_id;
END;
$$;
-- Update create_entity_link to provide better error messages distinguishing "not found" vs "access denied"
CREATE OR REPLACE FUNCTION public.create_entity_link(
  p_company_id uuid,
  p_from_type text,
  p_from_id uuid,
  p_to_type text,
  p_to_id uuid,
  p_link_type text DEFAULT 'related'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_company_id uuid;
  v_to_company_id uuid;
  v_link_id uuid;
BEGIN
  -- Validate user is company member
  IF NOT is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'FORBIDDEN: not a company member';
  END IF;

  -- Validate both entities belong to the same company
  v_from_company_id := get_entity_company_id(p_from_type, p_from_id);
  v_to_company_id := get_entity_company_id(p_to_type, p_to_id);

  IF v_from_company_id IS NULL THEN
    RAISE EXCEPTION 'Source entity not found: % with id %', p_from_type, p_from_id;
  END IF;

  IF v_to_company_id IS NULL THEN
    RAISE EXCEPTION 'Target entity not found: % with id %', p_to_type, p_to_id;
  END IF;

  -- Check if user has access to source entity's company
  IF v_from_company_id != p_company_id THEN
    RAISE EXCEPTION 'FORBIDDEN: no access to source entity';
  END IF;

  -- Check if user has access to target entity's company
  IF v_to_company_id != p_company_id THEN
    RAISE EXCEPTION 'FORBIDDEN: no access to target entity';
  END IF;

  -- Insert the link
  INSERT INTO entity_links (company_id, from_type, from_id, to_type, to_id, link_type, created_by)
  VALUES (p_company_id, p_from_type, p_from_id, p_to_type, p_to_id, p_link_type, auth.uid())
  RETURNING id INTO v_link_id;

  RETURN v_link_id;
END;
$$;
