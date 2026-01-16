-- Create split_task_series_from_occurrence RPC for "this and future" edits
CREATE OR REPLACE FUNCTION public.split_task_series_from_occurrence(
  p_series_task_id uuid,
  p_occurrence_start_at timestamptz,
  p_new_rrule text,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_priority text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_due_date date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_task RECORD;
  v_new_task_id uuid;
  v_new_due_date date;
BEGIN
  -- Get the original series task
  SELECT * INTO v_old_task
  FROM tasks
  WHERE id = p_series_task_id AND is_recurring_template = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Series task not found';
  END IF;
  
  -- Check permission
  IF NOT (
    is_company_admin(v_old_task.company_id) OR
    v_old_task.created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to modify this series';
  END IF;
  
  v_new_due_date := COALESCE(p_due_date, p_occurrence_start_at::date);
  
  -- 1. Shorten the old series to end before this occurrence
  UPDATE tasks
  SET 
    recurrence_end_at = p_occurrence_start_at - interval '1 second',
    recurrence_rules = CASE
      WHEN recurrence_rules LIKE '%UNTIL=%' THEN
        regexp_replace(recurrence_rules, 'UNTIL=[^;]+', 'UNTIL=' || to_char(p_occurrence_start_at - interval '1 day', 'YYYYMMDD"T"HH24MISS"Z"'))
      ELSE
        recurrence_rules || ';UNTIL=' || to_char(p_occurrence_start_at - interval '1 day', 'YYYYMMDD"T"HH24MISS"Z"')
    END
  WHERE id = p_series_task_id;
  
  -- 2. Create a new series starting from this occurrence
  INSERT INTO tasks (
    company_id,
    title,
    description,
    status,
    priority,
    due_date,
    project_id,
    phase_id,
    is_recurring_template,
    recurrence_rules,
    recurrence_start_at,
    recurrence_end_at,
    recurrence_count,
    recurrence_timezone,
    parent_recurring_task_id,
    created_by,
    notes,
    estimated_time
  ) VALUES (
    v_old_task.company_id,
    COALESCE(p_title, v_old_task.title),
    COALESCE(p_description, v_old_task.description),
    COALESCE(p_status, v_old_task.status),
    COALESCE(p_priority, v_old_task.priority),
    v_new_due_date,
    v_old_task.project_id,
    v_old_task.phase_id,
    true,
    p_new_rrule,
    p_occurrence_start_at,
    v_old_task.recurrence_end_at,
    v_old_task.recurrence_count,
    v_old_task.recurrence_timezone,
    p_series_task_id, -- Link to parent for history tracking
    auth.uid(),
    v_old_task.notes,
    v_old_task.estimated_time
  )
  RETURNING id INTO v_new_task_id;
  
  -- 3. Move any future overrides to the new series
  UPDATE task_recurrence_overrides
  SET series_task_id = v_new_task_id
  WHERE series_task_id = p_series_task_id
    AND occurrence_start_at >= p_occurrence_start_at;
  
  -- 4. Move any future exceptions to the new series
  UPDATE task_recurrence_exceptions
  SET task_id = v_new_task_id
  WHERE task_id = p_series_task_id
    AND exception_date >= p_occurrence_start_at::date;
  
  -- 5. Move any future completions to the new series
  UPDATE task_occurrence_completions
  SET series_task_id = v_new_task_id
  WHERE series_task_id = p_series_task_id
    AND occurrence_start_at >= p_occurrence_start_at;
  
  -- Copy assignees to new task
  INSERT INTO task_assignees (task_id, user_id)
  SELECT v_new_task_id, user_id
  FROM task_assignees
  WHERE task_id = p_series_task_id;
  
  RETURN json_build_object(
    'success', true,
    'old_series_id', p_series_task_id,
    'new_series_id', v_new_task_id
  );
END;
$$;