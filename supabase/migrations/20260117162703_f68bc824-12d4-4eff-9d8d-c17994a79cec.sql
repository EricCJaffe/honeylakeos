-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_task_lists_owner_sort ON public.task_lists(owner_user_id, sort_order) WHERE is_personal = true;
CREATE INDEX IF NOT EXISTS idx_task_lists_company_sort ON public.task_lists(company_id, sort_order) WHERE is_personal = false;
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON public.tasks(list_id);

-- RPC: Create task list with auto sort_order
CREATE OR REPLACE FUNCTION public.task_list_create(
  p_name TEXT,
  p_scope TEXT, -- 'personal' or 'company'
  p_company_id UUID DEFAULT NULL,
  p_color TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_list_id UUID;
  v_max_order INT;
  v_user_id UUID := auth.uid();
BEGIN
  IF p_scope = 'personal' THEN
    -- Get max sort_order for personal lists
    SELECT COALESCE(MAX(sort_order), -1) INTO v_max_order
    FROM public.task_lists
    WHERE is_personal = true AND owner_user_id = v_user_id;
    
    INSERT INTO public.task_lists (name, color, is_personal, owner_user_id, company_id, sort_order, created_by)
    VALUES (p_name, p_color, true, v_user_id, NULL, v_max_order + 1, v_user_id)
    RETURNING id INTO v_list_id;
    
  ELSIF p_scope = 'company' THEN
    IF p_company_id IS NULL THEN
      RAISE EXCEPTION 'company_id required for company scope';
    END IF;
    
    -- Check admin permission
    IF NOT public.is_company_admin(p_company_id) THEN
      RAISE EXCEPTION 'Only company admins can create company lists';
    END IF;
    
    -- Get max sort_order for company lists
    SELECT COALESCE(MAX(sort_order), -1) INTO v_max_order
    FROM public.task_lists
    WHERE is_personal = false AND company_id = p_company_id;
    
    INSERT INTO public.task_lists (name, color, is_personal, owner_user_id, company_id, sort_order, created_by)
    VALUES (p_name, p_color, false, NULL, p_company_id, v_max_order + 1, v_user_id)
    RETURNING id INTO v_list_id;
    
  ELSE
    RAISE EXCEPTION 'Invalid scope. Use "personal" or "company"';
  END IF;
  
  RETURN v_list_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC: Reorder task list within its scope
CREATE OR REPLACE FUNCTION public.task_list_reorder(
  p_list_id UUID,
  p_new_index INT
)
RETURNS VOID AS $$
DECLARE
  v_list RECORD;
  v_old_index INT;
  v_user_id UUID := auth.uid();
BEGIN
  -- Get the list details
  SELECT * INTO v_list FROM public.task_lists WHERE id = p_list_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'List not found';
  END IF;
  
  -- Check permissions
  IF v_list.is_personal THEN
    IF v_list.owner_user_id != v_user_id THEN
      RAISE EXCEPTION 'Cannot reorder another user''s personal list';
    END IF;
  ELSE
    IF NOT public.is_company_admin(v_list.company_id) THEN
      RAISE EXCEPTION 'Only company admins can reorder company lists';
    END IF;
  END IF;
  
  v_old_index := v_list.sort_order;
  
  IF v_old_index = p_new_index THEN
    RETURN; -- No change needed
  END IF;
  
  -- Shift other lists
  IF v_list.is_personal THEN
    IF p_new_index < v_old_index THEN
      -- Moving up: shift others down
      UPDATE public.task_lists
      SET sort_order = sort_order + 1
      WHERE is_personal = true
        AND owner_user_id = v_user_id
        AND sort_order >= p_new_index
        AND sort_order < v_old_index;
    ELSE
      -- Moving down: shift others up
      UPDATE public.task_lists
      SET sort_order = sort_order - 1
      WHERE is_personal = true
        AND owner_user_id = v_user_id
        AND sort_order > v_old_index
        AND sort_order <= p_new_index;
    END IF;
  ELSE
    IF p_new_index < v_old_index THEN
      UPDATE public.task_lists
      SET sort_order = sort_order + 1
      WHERE is_personal = false
        AND company_id = v_list.company_id
        AND sort_order >= p_new_index
        AND sort_order < v_old_index;
    ELSE
      UPDATE public.task_lists
      SET sort_order = sort_order - 1
      WHERE is_personal = false
        AND company_id = v_list.company_id
        AND sort_order > v_old_index
        AND sort_order <= p_new_index;
    END IF;
  END IF;
  
  -- Update the moved list
  UPDATE public.task_lists SET sort_order = p_new_index WHERE id = p_list_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC: Rename task list
CREATE OR REPLACE FUNCTION public.task_list_rename(
  p_list_id UUID,
  p_name TEXT
)
RETURNS VOID AS $$
DECLARE
  v_list RECORD;
  v_user_id UUID := auth.uid();
BEGIN
  SELECT * INTO v_list FROM public.task_lists WHERE id = p_list_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'List not found';
  END IF;
  
  -- Check permissions
  IF v_list.is_personal THEN
    IF v_list.owner_user_id != v_user_id THEN
      RAISE EXCEPTION 'Cannot rename another user''s personal list';
    END IF;
  ELSE
    IF NOT public.is_company_admin(v_list.company_id) THEN
      RAISE EXCEPTION 'Only company admins can rename company lists';
    END IF;
  END IF;
  
  UPDATE public.task_lists SET name = p_name, updated_at = now() WHERE id = p_list_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC: Delete task list (sets tasks.list_id to null first)
CREATE OR REPLACE FUNCTION public.task_list_delete(
  p_list_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_list RECORD;
  v_user_id UUID := auth.uid();
BEGIN
  SELECT * INTO v_list FROM public.task_lists WHERE id = p_list_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'List not found';
  END IF;
  
  -- Check permissions
  IF v_list.is_personal THEN
    IF v_list.owner_user_id != v_user_id THEN
      RAISE EXCEPTION 'Cannot delete another user''s personal list';
    END IF;
  ELSE
    IF NOT public.is_company_admin(v_list.company_id) THEN
      RAISE EXCEPTION 'Only company admins can delete company lists';
    END IF;
  END IF;
  
  -- Unlink tasks from this list
  UPDATE public.tasks SET list_id = NULL WHERE list_id = p_list_id;
  
  -- Delete the list
  DELETE FROM public.task_lists WHERE id = p_list_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC: Get task counts per list (for sidebar display)
CREATE OR REPLACE FUNCTION public.task_list_counts(
  p_company_id UUID DEFAULT NULL
)
RETURNS TABLE (
  list_id UUID,
  task_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.list_id,
    COUNT(*)::BIGINT as task_count
  FROM public.tasks t
  INNER JOIN public.task_lists tl ON t.list_id = tl.id
  WHERE 
    t.status NOT IN ('archived') AND
    (
      (tl.is_personal = true AND tl.owner_user_id = auth.uid()) OR
      (tl.is_personal = false AND tl.company_id = p_company_id AND p_company_id IS NOT NULL)
    )
  GROUP BY t.list_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC: Get unlisted task count
CREATE OR REPLACE FUNCTION public.unlisted_task_count(
  p_company_id UUID
)
RETURNS BIGINT AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.tasks
  WHERE company_id = p_company_id
    AND list_id IS NULL
    AND status NOT IN ('archived');
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;