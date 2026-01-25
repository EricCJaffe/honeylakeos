-- Add owner_user_id to tasks (with default to created_by for existing rows)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS owner_user_id UUID;

-- Backfill: set owner to created_by for existing tasks
UPDATE public.tasks SET owner_user_id = created_by WHERE owner_user_id IS NULL AND created_by IS NOT NULL;

-- Add owner_user_id to notes
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS owner_user_id UUID;

-- Backfill notes
UPDATE public.notes SET owner_user_id = created_by WHERE owner_user_id IS NULL AND created_by IS NOT NULL;

-- Add owner_user_id to documents
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS owner_user_id UUID;

-- Backfill documents
UPDATE public.documents SET owner_user_id = created_by WHERE owner_user_id IS NULL AND created_by IS NOT NULL;

-- Create indexes for ownership queries
CREATE INDEX IF NOT EXISTS idx_tasks_owner_user_id ON public.tasks(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_notes_owner_user_id ON public.notes(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner_user_id ON public.documents(owner_user_id);

-- Create the reassign_owner RPC function
CREATE OR REPLACE FUNCTION public.reassign_owner(
  p_entity TEXT,
  p_id UUID,
  p_new_owner UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_current_owner UUID;
  v_caller_id UUID;
  v_is_admin BOOLEAN;
  v_new_owner_is_member BOOLEAN;
BEGIN
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get current owner and company based on entity type
  CASE p_entity
    WHEN 'project' THEN
      SELECT company_id, owner_user_id INTO v_company_id, v_current_owner
      FROM public.projects WHERE id = p_id;
    WHEN 'task' THEN
      SELECT company_id, owner_user_id INTO v_company_id, v_current_owner
      FROM public.tasks WHERE id = p_id;
    WHEN 'note' THEN
      SELECT company_id, owner_user_id INTO v_company_id, v_current_owner
      FROM public.notes WHERE id = p_id;
    WHEN 'document' THEN
      SELECT company_id, owner_user_id INTO v_company_id, v_current_owner
      FROM public.documents WHERE id = p_id;
    ELSE
      RETURN json_build_object('success', false, 'error', 'Invalid entity type');
  END CASE;

  -- Check entity exists
  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Entity not found');
  END IF;

  -- Check caller is company admin
  SELECT EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE user_id = v_caller_id 
    AND company_id = v_company_id 
    AND role = 'company_admin'
    AND status = 'active'
  ) INTO v_is_admin;

  -- Caller must be admin OR current owner
  IF NOT v_is_admin AND v_caller_id != v_current_owner THEN
    RETURN json_build_object('success', false, 'error', 'Permission denied: must be admin or current owner');
  END IF;

  -- Check new owner is member of the same company
  SELECT EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE user_id = p_new_owner 
    AND company_id = v_company_id 
    AND status = 'active'
  ) INTO v_new_owner_is_member;

  IF NOT v_new_owner_is_member THEN
    RETURN json_build_object('success', false, 'error', 'New owner must be a member of the same company');
  END IF;

  -- Perform the update
  CASE p_entity
    WHEN 'project' THEN
      UPDATE public.projects 
      SET owner_user_id = p_new_owner, updated_at = now()
      WHERE id = p_id;
    WHEN 'task' THEN
      UPDATE public.tasks 
      SET owner_user_id = p_new_owner, updated_at = now()
      WHERE id = p_id;
    WHEN 'note' THEN
      UPDATE public.notes 
      SET owner_user_id = p_new_owner, updated_at = now()
      WHERE id = p_id;
    WHEN 'document' THEN
      UPDATE public.documents 
      SET owner_user_id = p_new_owner, updated_at = now()
      WHERE id = p_id;
  END CASE;

  RETURN json_build_object(
    'success', true, 
    'entity', p_entity,
    'entity_id', p_id,
    'new_owner_id', p_new_owner,
    'previous_owner_id', v_current_owner
  );
END;
$$;