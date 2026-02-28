-- Add missing recurrence columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS recurrence_timezone text DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS recurrence_start_at timestamptz,
ADD COLUMN IF NOT EXISTS recurrence_end_at timestamptz,
ADD COLUMN IF NOT EXISTS recurrence_count integer,
ADD COLUMN IF NOT EXISTS is_recurrence_exception boolean DEFAULT false;
-- Create task_recurrence_exceptions table
CREATE TABLE IF NOT EXISTS public.task_recurrence_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, task_id, exception_date)
);
-- Create task_recurrence_overrides table
CREATE TABLE IF NOT EXISTS public.task_recurrence_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  series_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  occurrence_start_at timestamptz NOT NULL,
  override_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, series_task_id, occurrence_start_at)
);
-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_recurrence_exceptions_lookup 
  ON public.task_recurrence_exceptions(company_id, task_id);
CREATE INDEX IF NOT EXISTS idx_task_recurrence_overrides_lookup 
  ON public.task_recurrence_overrides(company_id, series_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence 
  ON public.tasks(company_id, is_recurring_template) WHERE is_recurring_template = true;
-- Enable RLS
ALTER TABLE public.task_recurrence_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_recurrence_overrides ENABLE ROW LEVEL SECURITY;
-- RLS policies for task_recurrence_exceptions
CREATE POLICY "task_recurrence_exceptions_select_company_member"
  ON public.task_recurrence_exceptions FOR SELECT
  USING (is_company_member(company_id));
CREATE POLICY "task_recurrence_exceptions_insert_company_member"
  ON public.task_recurrence_exceptions FOR INSERT
  WITH CHECK (is_company_member(company_id));
CREATE POLICY "task_recurrence_exceptions_delete_creator_or_admin"
  ON public.task_recurrence_exceptions FOR DELETE
  USING ((created_by = auth.uid()) OR is_company_admin(company_id));
-- RLS policies for task_recurrence_overrides
CREATE POLICY "task_recurrence_overrides_select_company_member"
  ON public.task_recurrence_overrides FOR SELECT
  USING (is_company_member(company_id));
CREATE POLICY "task_recurrence_overrides_insert_company_member"
  ON public.task_recurrence_overrides FOR INSERT
  WITH CHECK (is_company_member(company_id));
CREATE POLICY "task_recurrence_overrides_delete_creator_or_admin"
  ON public.task_recurrence_overrides FOR DELETE
  USING ((created_by = auth.uid()) OR is_company_admin(company_id));
-- Create RPC for expanding task series
-- This function returns virtual occurrences within a date range
CREATE OR REPLACE FUNCTION public.expand_task_series(
  p_task_id uuid,
  p_range_start timestamptz,
  p_range_end timestamptz
)
RETURNS TABLE (
  occurrence_date timestamptz,
  is_exception boolean,
  override_task_id uuid,
  is_override boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task RECORD;
  v_company_id uuid;
  v_rrule text;
  v_start timestamptz;
  v_until timestamptz;
  v_count integer;
  v_interval_days integer := 1;
  v_current_date timestamptz;
  v_occurrence_count integer := 0;
  v_freq text;
  v_interval integer := 1;
  v_byday text[];
  v_bymonthday integer;
  v_day_of_week integer;
  v_week_of_month integer;
BEGIN
  -- Get the task
  SELECT t.*, t.company_id INTO v_task
  FROM tasks t
  WHERE t.id = p_task_id AND t.is_recurring_template = true;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  v_company_id := v_task.company_id;
  v_rrule := v_task.recurrence_rules;
  v_start := COALESCE(v_task.recurrence_start_at, v_task.created_at);
  v_until := v_task.recurrence_end_at;
  v_count := v_task.recurrence_count;
  
  -- Check company membership
  IF NOT is_company_member(v_company_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Parse RRULE
  -- Format: FREQ=DAILY;INTERVAL=1;BYDAY=MO,TU,WE;UNTIL=20260131T000000Z;COUNT=10
  IF v_rrule IS NULL OR v_rrule = '' THEN
    RETURN;
  END IF;
  
  -- Extract FREQ
  v_freq := (SELECT (regexp_matches(v_rrule, 'FREQ=([A-Z]+)', 'i'))[1]);
  
  -- Extract INTERVAL
  v_interval := COALESCE(
    (SELECT (regexp_matches(v_rrule, 'INTERVAL=(\d+)', 'i'))[1])::integer,
    1
  );
  
  -- Extract BYDAY for weekly
  IF v_rrule ~ 'BYDAY=' THEN
    v_byday := string_to_array(
      (SELECT (regexp_matches(v_rrule, 'BYDAY=([A-Z,]+)', 'i'))[1]),
      ','
    );
  END IF;
  
  -- Extract BYMONTHDAY for monthly
  v_bymonthday := (SELECT (regexp_matches(v_rrule, 'BYMONTHDAY=(-?\d+)', 'i'))[1])::integer;
  
  -- Determine interval in days based on frequency
  CASE v_freq
    WHEN 'DAILY' THEN v_interval_days := v_interval;
    WHEN 'WEEKLY' THEN v_interval_days := v_interval * 7;
    WHEN 'MONTHLY' THEN v_interval_days := v_interval * 30;
    WHEN 'YEARLY' THEN v_interval_days := v_interval * 365;
    ELSE v_interval_days := 1;
  END CASE;
  
  -- Start generating occurrences
  v_current_date := v_start;
  
  -- Adjust start to range if needed
  IF v_current_date < p_range_start THEN
    -- Fast forward
    IF v_freq = 'DAILY' THEN
      v_current_date := p_range_start - ((p_range_start - v_start)::interval % (v_interval_days || ' days')::interval);
    ELSE
      -- For other frequencies, iterate (simplified)
      WHILE v_current_date < p_range_start LOOP
        CASE v_freq
          WHEN 'DAILY' THEN v_current_date := v_current_date + (v_interval || ' days')::interval;
          WHEN 'WEEKLY' THEN v_current_date := v_current_date + (v_interval * 7 || ' days')::interval;
          WHEN 'MONTHLY' THEN v_current_date := v_current_date + (v_interval || ' months')::interval;
          WHEN 'YEARLY' THEN v_current_date := v_current_date + (v_interval || ' years')::interval;
        END CASE;
      END LOOP;
    END IF;
  END IF;
  
  -- Generate occurrences within range
  WHILE v_current_date <= p_range_end LOOP
    -- Check count limit
    IF v_count IS NOT NULL AND v_occurrence_count >= v_count THEN
      EXIT;
    END IF;
    
    -- Check until limit
    IF v_until IS NOT NULL AND v_current_date > v_until THEN
      EXIT;
    END IF;
    
    -- Check if this occurrence is an exception
    IF EXISTS (
      SELECT 1 FROM task_recurrence_exceptions tre
      WHERE tre.task_id = p_task_id 
        AND tre.exception_date = v_current_date::date
    ) THEN
      occurrence_date := v_current_date;
      is_exception := true;
      override_task_id := NULL;
      is_override := false;
    -- Check if this occurrence has an override
    ELSIF EXISTS (
      SELECT 1 FROM task_recurrence_overrides tro
      WHERE tro.series_task_id = p_task_id 
        AND tro.occurrence_start_at::date = v_current_date::date
    ) THEN
      occurrence_date := v_current_date;
      is_exception := false;
      override_task_id := (
        SELECT tro.override_task_id FROM task_recurrence_overrides tro
        WHERE tro.series_task_id = p_task_id 
          AND tro.occurrence_start_at::date = v_current_date::date
        LIMIT 1
      );
      is_override := true;
    ELSE
      -- Normal occurrence
      occurrence_date := v_current_date;
      is_exception := false;
      override_task_id := NULL;
      is_override := false;
    END IF;
    
    -- Only return occurrences within range
    IF v_current_date >= p_range_start THEN
      RETURN NEXT;
    END IF;
    
    v_occurrence_count := v_occurrence_count + 1;
    
    -- Move to next occurrence
    CASE v_freq
      WHEN 'DAILY' THEN v_current_date := v_current_date + (v_interval || ' days')::interval;
      WHEN 'WEEKLY' THEN v_current_date := v_current_date + (v_interval * 7 || ' days')::interval;
      WHEN 'MONTHLY' THEN v_current_date := v_current_date + (v_interval || ' months')::interval;
      WHEN 'YEARLY' THEN v_current_date := v_current_date + (v_interval || ' years')::interval;
      ELSE v_current_date := v_current_date + '1 day'::interval;
    END CASE;
  END LOOP;
  
  RETURN;
END;
$$;
-- RPC to skip an occurrence
CREATE OR REPLACE FUNCTION public.skip_task_occurrence(
  p_task_id uuid,
  p_occurrence_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task RECORD;
  v_exception_id uuid;
BEGIN
  -- Get task and validate
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id AND is_recurring_template = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or not a recurring template';
  END IF;
  
  -- Check permissions
  IF NOT is_company_member(v_task.company_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Insert exception
  INSERT INTO task_recurrence_exceptions (company_id, task_id, exception_date, created_by)
  VALUES (v_task.company_id, p_task_id, p_occurrence_date, auth.uid())
  ON CONFLICT (company_id, task_id, exception_date) DO NOTHING
  RETURNING id INTO v_exception_id;
  
  RETURN v_exception_id;
END;
$$;
-- RPC to create an override (edit single occurrence)
CREATE OR REPLACE FUNCTION public.create_task_occurrence_override(
  p_series_task_id uuid,
  p_occurrence_start_at timestamptz,
  p_title text,
  p_description text DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_priority text DEFAULT 'medium',
  p_status text DEFAULT 'to_do'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_series_task RECORD;
  v_override_task_id uuid;
BEGIN
  -- Get series task
  SELECT * INTO v_series_task FROM tasks WHERE id = p_series_task_id AND is_recurring_template = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Series task not found';
  END IF;
  
  -- Check permissions
  IF NOT is_company_member(v_series_task.company_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Create the override task
  INSERT INTO tasks (
    company_id, title, description, due_date, priority, status,
    is_recurrence_exception, parent_recurring_task_id,
    recurrence_instance_date, created_by, project_id
  )
  VALUES (
    v_series_task.company_id, p_title, p_description, p_due_date, p_priority, p_status,
    true, p_series_task_id,
    p_occurrence_start_at::date, auth.uid(), v_series_task.project_id
  )
  RETURNING id INTO v_override_task_id;
  
  -- Create the override record
  INSERT INTO task_recurrence_overrides (
    company_id, series_task_id, occurrence_start_at, override_task_id, created_by
  )
  VALUES (
    v_series_task.company_id, p_series_task_id, p_occurrence_start_at, v_override_task_id, auth.uid()
  );
  
  RETURN v_override_task_id;
END;
$$;
