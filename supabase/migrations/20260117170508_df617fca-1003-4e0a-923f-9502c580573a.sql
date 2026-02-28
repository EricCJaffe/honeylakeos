-- ============================================================
-- Folder Management RPCs for UI
-- ============================================================

-- 1. folder_create: Create a new folder with auto-incrementing sort_order
CREATE OR REPLACE FUNCTION public.folder_create(
  p_name TEXT,
  p_scope TEXT,
  p_parent_folder_id UUID DEFAULT NULL,
  p_company_id UUID DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_new_sort_order int;
  v_new_id uuid;
BEGIN
  -- Determine company_id
  IF p_scope = 'personal' THEN
    v_company_id := p_company_id;
  ELSE
    v_company_id := COALESCE(p_company_id, (SELECT active_company_id FROM profiles WHERE id = v_user_id));
  END IF;
  
  IF v_company_id IS NULL AND p_scope = 'company' THEN
    RAISE EXCEPTION 'Company ID required for company folders';
  END IF;
  
  -- Calculate next sort_order for this scope/parent
  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_new_sort_order
  FROM folders
  WHERE (p_scope = 'personal' AND owner_user_id = v_user_id AND scope = 'personal')
     OR (p_scope = 'company' AND company_id = v_company_id AND scope = 'company');
  
  -- Insert the folder
  INSERT INTO folders (
    company_id, 
    name, 
    scope, 
    owner_user_id, 
    parent_folder_id, 
    sort_order, 
    access_level, 
    created_by
  ) VALUES (
    v_company_id,
    p_name,
    p_scope,
    CASE WHEN p_scope = 'personal' THEN v_user_id ELSE NULL END,
    p_parent_folder_id,
    v_new_sort_order,
    CASE WHEN p_scope = 'personal' THEN 'personal' ELSE 'company' END,
    v_user_id
  ) RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$;
-- 2. folder_rename: Rename a folder
CREATE OR REPLACE FUNCTION public.folder_rename(
  p_folder_id UUID,
  p_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE folders
  SET name = p_name
  WHERE id = p_folder_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Folder not found or no permission';
  END IF;
END;
$$;
-- 3. folder_move: Move folder to new parent with validation
CREATE OR REPLACE FUNCTION public.folder_move(
  p_folder_id UUID,
  p_new_parent_folder_id UUID DEFAULT NULL,
  p_new_index INT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folder RECORD;
  v_new_parent RECORD;
  v_max_sort int;
BEGIN
  -- Get current folder
  SELECT * INTO v_folder FROM folders WHERE id = p_folder_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Folder not found';
  END IF;
  
  -- If moving to a new parent, validate
  IF p_new_parent_folder_id IS NOT NULL THEN
    SELECT * INTO v_new_parent FROM folders WHERE id = p_new_parent_folder_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Parent folder not found';
    END IF;
    
    -- Ensure same scope
    IF v_new_parent.scope != v_folder.scope THEN
      RAISE EXCEPTION 'Cannot move folder between different scopes';
    END IF;
    
    -- For personal folders, ensure same owner
    IF v_folder.scope = 'personal' AND v_new_parent.owner_user_id != v_folder.owner_user_id THEN
      RAISE EXCEPTION 'Personal folder parent must belong to same owner';
    END IF;
  END IF;
  
  -- Calculate new sort_order if provided
  IF p_new_index IS NOT NULL THEN
    -- Reorder siblings to make room
    UPDATE folders
    SET sort_order = sort_order + 1
    WHERE parent_folder_id IS NOT DISTINCT FROM p_new_parent_folder_id
      AND scope = v_folder.scope
      AND id != p_folder_id
      AND sort_order >= p_new_index;
    
    UPDATE folders
    SET parent_folder_id = p_new_parent_folder_id,
        sort_order = p_new_index
    WHERE id = p_folder_id;
  ELSE
    -- Append to end
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_max_sort
    FROM folders
    WHERE parent_folder_id IS NOT DISTINCT FROM p_new_parent_folder_id
      AND scope = v_folder.scope;
    
    UPDATE folders
    SET parent_folder_id = p_new_parent_folder_id,
        sort_order = v_max_sort
    WHERE id = p_folder_id;
  END IF;
END;
$$;
-- 4. folder_reorder: Reorder folder among siblings
CREATE OR REPLACE FUNCTION public.folder_reorder(
  p_folder_id UUID,
  p_new_index INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folder RECORD;
  v_old_index int;
BEGIN
  -- Get current folder
  SELECT * INTO v_folder FROM folders WHERE id = p_folder_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Folder not found';
  END IF;
  
  v_old_index := v_folder.sort_order;
  
  IF p_new_index = v_old_index THEN
    RETURN; -- No change needed
  END IF;
  
  IF p_new_index < v_old_index THEN
    -- Moving up: shift items down
    UPDATE folders
    SET sort_order = sort_order + 1
    WHERE parent_folder_id IS NOT DISTINCT FROM v_folder.parent_folder_id
      AND scope = v_folder.scope
      AND (v_folder.scope = 'company' OR owner_user_id = v_folder.owner_user_id)
      AND id != p_folder_id
      AND sort_order >= p_new_index
      AND sort_order < v_old_index;
  ELSE
    -- Moving down: shift items up
    UPDATE folders
    SET sort_order = sort_order - 1
    WHERE parent_folder_id IS NOT DISTINCT FROM v_folder.parent_folder_id
      AND scope = v_folder.scope
      AND (v_folder.scope = 'company' OR owner_user_id = v_folder.owner_user_id)
      AND id != p_folder_id
      AND sort_order > v_old_index
      AND sort_order <= p_new_index;
  END IF;
  
  UPDATE folders SET sort_order = p_new_index WHERE id = p_folder_id;
END;
$$;
-- 5. folder_delete: Delete folder (children moved up, items unfiled)
-- Already handled by trigger, but add explicit RPC for better error handling
CREATE OR REPLACE FUNCTION public.folder_delete(p_folder_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM folders WHERE id = p_folder_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Folder not found or no permission';
  END IF;
END;
$$;
-- 6. Bulk move items to folder
CREATE OR REPLACE FUNCTION public.move_documents_to_folder(
  p_document_ids UUID[],
  p_folder_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE documents
  SET folder_id = p_folder_id
  WHERE id = ANY(p_document_ids);
END;
$$;
CREATE OR REPLACE FUNCTION public.move_notes_to_folder(
  p_note_ids UUID[],
  p_folder_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notes
  SET folder_id = p_folder_id
  WHERE id = ANY(p_note_ids);
END;
$$;
