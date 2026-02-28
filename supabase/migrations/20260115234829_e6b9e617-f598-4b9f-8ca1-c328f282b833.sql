-- ============================================
-- TASK OCCURRENCE COMPLETIONS TABLE
-- ============================================

-- Create table for tracking individual occurrence completions
CREATE TABLE IF NOT EXISTS public.task_occurrence_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  series_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  occurrence_start_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  completed_by uuid NOT NULL DEFAULT auth.uid(),
  CONSTRAINT unique_occurrence_completion UNIQUE(company_id, series_task_id, occurrence_start_at)
);
-- Create indexes
CREATE INDEX idx_task_occurrence_completions_company ON public.task_occurrence_completions(company_id);
CREATE INDEX idx_task_occurrence_completions_series ON public.task_occurrence_completions(series_task_id);
CREATE INDEX idx_task_occurrence_completions_date ON public.task_occurrence_completions(occurrence_start_at);
-- Enable RLS
ALTER TABLE public.task_occurrence_completions ENABLE ROW LEVEL SECURITY;
-- RLS: Company members can SELECT
CREATE POLICY "task_occurrence_completions_select_company_member"
  ON public.task_occurrence_completions
  FOR SELECT
  USING (is_company_member(company_id));
-- RLS: Task creator, assignee, or admin can INSERT
CREATE POLICY "task_occurrence_completions_insert_authorized"
  ON public.task_occurrence_completions
  FOR INSERT
  WITH CHECK (
    is_company_member(company_id) AND
    company_id = (SELECT t.company_id FROM tasks t WHERE t.id = series_task_id) AND
    (
      is_company_admin(company_id) OR
      (SELECT t.created_by FROM tasks t WHERE t.id = series_task_id) = auth.uid() OR
      EXISTS (
        SELECT 1 FROM task_assignees ta 
        WHERE ta.task_id = series_task_id AND ta.user_id = auth.uid()
      )
    )
  );
-- RLS: Task creator, assignee, or admin can DELETE
CREATE POLICY "task_occurrence_completions_delete_authorized"
  ON public.task_occurrence_completions
  FOR DELETE
  USING (
    is_company_admin(company_id) OR
    completed_by = auth.uid() OR
    (SELECT t.created_by FROM tasks t WHERE t.id = series_task_id) = auth.uid() OR
    EXISTS (
      SELECT 1 FROM task_assignees ta 
      WHERE ta.task_id = series_task_id AND ta.user_id = auth.uid()
    )
  );
-- ============================================
-- RPC: COMPLETE TASK OCCURRENCE
-- ============================================
CREATE OR REPLACE FUNCTION public.complete_task_occurrence(
  p_series_task_id uuid,
  p_occurrence_start_at timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_task_creator uuid;
  v_is_assignee boolean;
  v_completion_id uuid;
BEGIN
  -- Get task info
  SELECT company_id, created_by INTO v_company_id, v_task_creator
  FROM tasks WHERE id = p_series_task_id;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  
  -- Check if user is assignee
  SELECT EXISTS(
    SELECT 1 FROM task_assignees 
    WHERE task_id = p_series_task_id AND user_id = auth.uid()
  ) INTO v_is_assignee;
  
  -- Permission check
  IF NOT (
    is_company_admin(v_company_id) OR
    v_task_creator = auth.uid() OR
    v_is_assignee
  ) THEN
    RAISE EXCEPTION 'Not authorized to complete this occurrence';
  END IF;
  
  -- Upsert the completion record
  INSERT INTO task_occurrence_completions (company_id, series_task_id, occurrence_start_at, completed_by)
  VALUES (v_company_id, p_series_task_id, p_occurrence_start_at, auth.uid())
  ON CONFLICT (company_id, series_task_id, occurrence_start_at) 
  DO UPDATE SET completed_at = now(), completed_by = auth.uid()
  RETURNING id INTO v_completion_id;
  
  RETURN json_build_object('success', true, 'completion_id', v_completion_id);
END;
$$;
-- ============================================
-- RPC: UNCOMPLETE TASK OCCURRENCE
-- ============================================
CREATE OR REPLACE FUNCTION public.uncomplete_task_occurrence(
  p_series_task_id uuid,
  p_occurrence_start_at timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_task_creator uuid;
  v_is_assignee boolean;
  v_deleted boolean := false;
BEGIN
  -- Get task info
  SELECT company_id, created_by INTO v_company_id, v_task_creator
  FROM tasks WHERE id = p_series_task_id;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  
  -- Check if user is assignee
  SELECT EXISTS(
    SELECT 1 FROM task_assignees 
    WHERE task_id = p_series_task_id AND user_id = auth.uid()
  ) INTO v_is_assignee;
  
  -- Permission check
  IF NOT (
    is_company_admin(v_company_id) OR
    v_task_creator = auth.uid() OR
    v_is_assignee
  ) THEN
    RAISE EXCEPTION 'Not authorized to uncomplete this occurrence';
  END IF;
  
  -- Delete the completion record
  DELETE FROM task_occurrence_completions 
  WHERE series_task_id = p_series_task_id 
    AND occurrence_start_at = p_occurrence_start_at;
  
  v_deleted := FOUND;
  
  RETURN json_build_object('success', true, 'deleted', v_deleted);
END;
$$;
-- ============================================
-- Update expand_task_series to include completion status
-- ============================================
CREATE OR REPLACE FUNCTION public.expand_task_series(
  p_task_id uuid,
  p_range_start text,
  p_range_end text
)
RETURNS TABLE(
  occurrence_date date,
  occurrence_start_at timestamptz,
  is_exception boolean,
  is_override boolean,
  is_completed boolean,
  override_task_id uuid,
  completed_at timestamptz,
  completed_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task RECORD;
  v_rrule text;
  v_dtstart timestamptz;
  v_range_start timestamptz;
  v_range_end timestamptz;
  v_freq text;
  v_interval int := 1;
  v_by_weekday text[];
  v_by_month int[];
  v_by_monthday int[];
  v_until timestamptz;
  v_count int;
  v_current_date timestamptz;
  v_occurrence_count int := 0;
  v_company_id uuid;
BEGIN
  -- Get task details
  SELECT t.*, t.company_id INTO v_task
  FROM tasks t
  WHERE t.id = p_task_id AND t.is_recurring_template = true;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  v_company_id := v_task.company_id;
  v_rrule := v_task.recurrence_rules;
  v_dtstart := COALESCE(v_task.recurrence_start_at, v_task.created_at);
  v_range_start := p_range_start::timestamptz;
  v_range_end := p_range_end::timestamptz;
  
  IF v_rrule IS NULL THEN
    RETURN;
  END IF;
  
  -- Parse RRULE components
  v_freq := (regexp_match(v_rrule, 'FREQ=(\w+)'))[1];
  
  IF (regexp_match(v_rrule, 'INTERVAL=(\d+)')) IS NOT NULL THEN
    v_interval := ((regexp_match(v_rrule, 'INTERVAL=(\d+)'))[1])::int;
  END IF;
  
  IF (regexp_match(v_rrule, 'UNTIL=([^;]+)')) IS NOT NULL THEN
    v_until := ((regexp_match(v_rrule, 'UNTIL=([^;]+)'))[1])::timestamptz;
  END IF;
  
  IF (regexp_match(v_rrule, 'COUNT=(\d+)')) IS NOT NULL THEN
    v_count := ((regexp_match(v_rrule, 'COUNT=(\d+)'))[1])::int;
  END IF;
  
  -- Parse BYDAY
  IF v_rrule ~ 'BYDAY=' THEN
    v_by_weekday := string_to_array(
      (regexp_match(v_rrule, 'BYDAY=([^;]+)'))[1],
      ','
    );
  END IF;
  
  -- Parse BYMONTH
  IF v_rrule ~ 'BYMONTH=' THEN
    SELECT array_agg(x::int) INTO v_by_month
    FROM unnest(string_to_array((regexp_match(v_rrule, 'BYMONTH=([^;]+)'))[1], ',')) x;
  END IF;
  
  -- Parse BYMONTHDAY
  IF v_rrule ~ 'BYMONTHDAY=' THEN
    SELECT array_agg(x::int) INTO v_by_monthday
    FROM unnest(string_to_array((regexp_match(v_rrule, 'BYMONTHDAY=([^;]+)'))[1], ',')) x;
  END IF;
  
  v_current_date := v_dtstart;
  
  -- Cap expansion to prevent infinite loops
  WHILE v_current_date <= v_range_end AND v_occurrence_count < 500 LOOP
    -- Check if within count limit
    IF v_count IS NOT NULL AND v_occurrence_count >= v_count THEN
      EXIT;
    END IF;
    
    -- Check UNTIL
    IF v_until IS NOT NULL AND v_current_date > v_until THEN
      EXIT;
    END IF;
    
    -- Check if date should be included (BYDAY filter for weekly)
    IF v_current_date >= v_range_start THEN
      DECLARE
        v_day_abbrev text;
        v_include boolean := true;
      BEGIN
        IF v_by_weekday IS NOT NULL AND v_freq = 'WEEKLY' THEN
          v_day_abbrev := CASE extract(dow from v_current_date)
            WHEN 0 THEN 'SU'
            WHEN 1 THEN 'MO'
            WHEN 2 THEN 'TU'
            WHEN 3 THEN 'WE'
            WHEN 4 THEN 'TH'
            WHEN 5 THEN 'FR'
            WHEN 6 THEN 'SA'
          END;
          v_include := v_day_abbrev = ANY(v_by_weekday);
        END IF;
        
        IF v_include THEN
          -- Check for exception
          is_exception := EXISTS(
            SELECT 1 FROM task_recurrence_exceptions tre
            WHERE tre.task_id = p_task_id 
              AND tre.exception_date = v_current_date::date
          );
          
          -- Check for override
          SELECT tro.override_task_id INTO override_task_id
          FROM task_recurrence_overrides tro
          WHERE tro.series_task_id = p_task_id 
            AND tro.occurrence_start_at::date = v_current_date::date;
          
          is_override := override_task_id IS NOT NULL;
          
          -- Check for completion
          SELECT toc.completed_at, toc.completed_by INTO completed_at, completed_by
          FROM task_occurrence_completions toc
          WHERE toc.series_task_id = p_task_id 
            AND toc.occurrence_start_at::date = v_current_date::date;
          
          is_completed := completed_at IS NOT NULL;
          
          -- Return if not an exception
          IF NOT is_exception THEN
            occurrence_date := v_current_date::date;
            occurrence_start_at := v_current_date;
            RETURN NEXT;
          END IF;
        END IF;
      END;
    END IF;
    
    v_occurrence_count := v_occurrence_count + 1;
    
    -- Move to next occurrence based on frequency
    CASE v_freq
      WHEN 'DAILY' THEN
        v_current_date := v_current_date + (v_interval || ' days')::interval;
      WHEN 'WEEKLY' THEN
        IF v_by_weekday IS NOT NULL THEN
          v_current_date := v_current_date + '1 day'::interval;
        ELSE
          v_current_date := v_current_date + (v_interval || ' weeks')::interval;
        END IF;
      WHEN 'MONTHLY' THEN
        v_current_date := v_current_date + (v_interval || ' months')::interval;
      WHEN 'YEARLY' THEN
        v_current_date := v_current_date + (v_interval || ' years')::interval;
      ELSE
        v_current_date := v_current_date + '1 day'::interval;
    END CASE;
  END LOOP;
END;
$$;
