-- ============================================
-- RPC: UPDATE EVENT SERIES FROM OCCURRENCE (This and future)
-- ============================================
-- This function splits a recurring event series at a specific occurrence,
-- shortening the old series to end before the occurrence and creating
-- a new series starting from the occurrence.

CREATE OR REPLACE FUNCTION public.update_event_series_from_occurrence(
  p_series_event_id uuid,
  p_occurrence_start_at timestamptz,
  p_new_rrule text,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_start_at timestamptz DEFAULT NULL,
  p_end_at timestamptz DEFAULT NULL,
  p_all_day boolean DEFAULT NULL,
  p_location_text text DEFAULT NULL,
  p_color text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_event RECORD;
  v_new_event_id uuid;
  v_new_start_at timestamptz;
  v_new_end_at timestamptz;
  v_occurrence_date date;
BEGIN
  -- Get the original series event
  SELECT * INTO v_old_event
  FROM events
  WHERE id = p_series_event_id AND is_recurring_template = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Series event not found';
  END IF;
  
  -- Check permission
  IF NOT (
    is_company_admin(v_old_event.company_id) OR
    v_old_event.created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to modify this series';
  END IF;
  
  v_occurrence_date := p_occurrence_start_at::date;
  
  -- Calculate new start/end times, preserving time of day from original or using provided values
  v_new_start_at := COALESCE(p_start_at, p_occurrence_start_at);
  v_new_end_at := COALESCE(
    p_end_at,
    CASE 
      WHEN v_old_event.end_at IS NOT NULL 
      THEN p_occurrence_start_at + (v_old_event.end_at - v_old_event.start_at)
      ELSE NULL
    END
  );
  
  -- 1. Shorten the old series to end before this occurrence
  UPDATE events
  SET 
    recurrence_end_at = p_occurrence_start_at - interval '1 second',
    recurrence_rules = CASE
      WHEN recurrence_rules LIKE '%UNTIL=%' THEN
        regexp_replace(recurrence_rules, 'UNTIL=[^;]+', 'UNTIL=' || to_char(p_occurrence_start_at - interval '1 day', 'YYYYMMDD"T"HH24MISS"Z"'))
      ELSE
        recurrence_rules || ';UNTIL=' || to_char(p_occurrence_start_at - interval '1 day', 'YYYYMMDD"T"HH24MISS"Z"')
    END
  WHERE id = p_series_event_id;
  
  -- 2. Create a new series starting from this occurrence
  INSERT INTO events (
    company_id,
    title,
    description,
    start_at,
    end_at,
    timezone,
    all_day,
    location_text,
    color,
    category,
    project_id,
    is_recurring_template,
    recurrence_rules,
    recurrence_start_at,
    recurrence_end_at,
    recurrence_count,
    created_by,
    parent_recurring_event_id
  ) VALUES (
    v_old_event.company_id,
    COALESCE(p_title, v_old_event.title),
    COALESCE(p_description, v_old_event.description),
    v_new_start_at,
    v_new_end_at,
    v_old_event.timezone,
    COALESCE(p_all_day, v_old_event.all_day),
    COALESCE(p_location_text, v_old_event.location_text),
    COALESCE(p_color, v_old_event.color),
    v_old_event.category,
    v_old_event.project_id,
    true,
    p_new_rrule,
    v_new_start_at,
    v_old_event.recurrence_end_at, -- Keep original end date if it was further out
    v_old_event.recurrence_count,
    auth.uid(),
    p_series_event_id -- Link to parent for history tracking
  )
  RETURNING id INTO v_new_event_id;
  
  -- 3. Move any future overrides to the new series
  UPDATE event_recurrence_overrides
  SET series_event_id = v_new_event_id
  WHERE series_event_id = p_series_event_id
    AND occurrence_start_at >= p_occurrence_start_at;
  
  -- 4. Move any future exceptions to the new series
  UPDATE event_recurrence_exceptions
  SET event_id = v_new_event_id
  WHERE event_id = p_series_event_id
    AND exception_date >= v_occurrence_date;
  
  RETURN json_build_object(
    'success', true,
    'new_series_id', v_new_event_id,
    'old_series_id', p_series_event_id
  );
END;
$$;