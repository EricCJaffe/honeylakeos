-- Create entity_links table for universal linking
CREATE TABLE public.entity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  from_type text NOT NULL,
  from_id uuid NOT NULL,
  to_type text NOT NULL,
  to_id uuid NOT NULL,
  link_type text NOT NULL DEFAULT 'related',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_from_type CHECK (from_type IN ('task', 'project', 'note', 'document', 'event')),
  CONSTRAINT valid_to_type CHECK (to_type IN ('task', 'project', 'note', 'document', 'event')),
  CONSTRAINT valid_link_type CHECK (link_type IN ('related', 'blocks', 'depends_on', 'reference')),
  CONSTRAINT unique_entity_link UNIQUE (company_id, from_type, from_id, to_type, to_id, link_type)
);

-- Create indexes for performance
CREATE INDEX idx_entity_links_from ON public.entity_links (company_id, from_type, from_id);
CREATE INDEX idx_entity_links_to ON public.entity_links (company_id, to_type, to_id);

-- Enable RLS
ALTER TABLE public.entity_links ENABLE ROW LEVEL SECURITY;

-- SELECT: company members can view links
CREATE POLICY "entity_links_select_company_member"
ON public.entity_links
FOR SELECT
USING (is_company_member(company_id));

-- INSERT: company members can create links
CREATE POLICY "entity_links_insert_company_member"
ON public.entity_links
FOR INSERT
WITH CHECK (is_company_member(company_id) AND created_by = auth.uid());

-- DELETE: creator or admin can delete
CREATE POLICY "entity_links_delete_creator_or_admin"
ON public.entity_links
FOR DELETE
USING (created_by = auth.uid() OR is_company_admin(company_id));

-- Helper function to get entity company_id
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
    ELSE
      RETURN NULL;
  END CASE;
  RETURN v_company_id;
END;
$$;

-- RPC to create entity link with validation
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
    RAISE EXCEPTION 'Access denied: not a company member';
  END IF;

  -- Validate both entities belong to the same company
  v_from_company_id := get_entity_company_id(p_from_type, p_from_id);
  v_to_company_id := get_entity_company_id(p_to_type, p_to_id);

  IF v_from_company_id IS NULL THEN
    RAISE EXCEPTION 'Source entity not found';
  END IF;

  IF v_to_company_id IS NULL THEN
    RAISE EXCEPTION 'Target entity not found';
  END IF;

  IF v_from_company_id != p_company_id OR v_to_company_id != p_company_id THEN
    RAISE EXCEPTION 'Cross-company linking is not allowed';
  END IF;

  -- Insert the link
  INSERT INTO entity_links (company_id, from_type, from_id, to_type, to_id, link_type, created_by)
  VALUES (p_company_id, p_from_type, p_from_id, p_to_type, p_to_id, p_link_type, auth.uid())
  RETURNING id INTO v_link_id;

  RETURN v_link_id;
END;
$$;

-- RPC to delete entity link with validation
CREATE OR REPLACE FUNCTION public.delete_entity_link(p_link_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link entity_links%ROWTYPE;
BEGIN
  -- Get the link
  SELECT * INTO v_link FROM entity_links WHERE id = p_link_id;

  IF v_link IS NULL THEN
    RAISE EXCEPTION 'Link not found';
  END IF;

  -- Check permissions
  IF v_link.created_by != auth.uid() AND NOT is_company_admin(v_link.company_id) THEN
    RAISE EXCEPTION 'Access denied: only creator or admin can delete';
  END IF;

  DELETE FROM entity_links WHERE id = p_link_id;
  RETURN TRUE;
END;
$$;