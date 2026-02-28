-- ===============================================
-- ENHANCE RECURRING TASKS + EVENTS
-- Add proper support for nth weekday (e.g., 2nd Tuesday)
-- ===============================================

-- Drop and recreate expand_task_series with improved BYDAY support
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
  v_by_setpos int;
  v_until timestamptz;
  v_count int;
  v_current_date timestamptz;
  v_occurrence_count int := 0;
  v_company_id uuid;
  v_max_iterations int := 1000;
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
  
  -- Parse BYDAY (can include position like 2TU, -1FR)
  IF v_rrule ~ 'BYDAY=' THEN
    v_by_weekday := string_to_array(
      (regexp_match(v_rrule, 'BYDAY=([^;]+)'))[1],
      ','
    );
  END IF;
  
  -- Parse BYSETPOS (for nth weekday of month)
  IF (regexp_match(v_rrule, 'BYSETPOS=(-?\d+)')) IS NOT NULL THEN
    v_by_setpos := ((regexp_match(v_rrule, 'BYSETPOS=(-?\d+)'))[1])::int;
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
  
  -- Generate occurrences
  WHILE v_current_date <= v_range_end AND v_occurrence_count < v_max_iterations LOOP
    -- Check if within count limit
    IF v_count IS NOT NULL AND v_occurrence_count >= v_count THEN
      EXIT;
    END IF;
    
    -- Check UNTIL
    IF v_until IS NOT NULL AND v_current_date > v_until THEN
      EXIT;
    END IF;
    
    -- Check if date should be included
    IF v_current_date >= v_range_start THEN
      DECLARE
        v_day_abbrev text;
        v_include boolean := true;
        v_week_of_month int;
        v_last_week boolean;
      BEGIN
        -- WEEKLY: Check BYDAY
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
          -- Simple weekday check (no position number)
          v_include := v_day_abbrev = ANY(v_by_weekday);
        END IF;
        
        -- MONTHLY: Check BYDAY with position (e.g., 2TU = 2nd Tuesday)
        IF v_by_weekday IS NOT NULL AND v_freq = 'MONTHLY' THEN
          v_day_abbrev := CASE extract(dow from v_current_date)
            WHEN 0 THEN 'SU'
            WHEN 1 THEN 'MO'
            WHEN 2 THEN 'TU'
            WHEN 3 THEN 'WE'
            WHEN 4 THEN 'TH'
            WHEN 5 THEN 'FR'
            WHEN 6 THEN 'SA'
          END;
          
          v_include := false;
          FOR i IN 1..array_length(v_by_weekday, 1) LOOP
            DECLARE
              v_byday_entry text := v_by_weekday[i];
              v_pos int;
              v_day text;
              v_dom int := extract(day from v_current_date)::int;
              v_days_in_month int := extract(day from (date_trunc('month', v_current_date) + interval '1 month' - interval '1 day'))::int;
            BEGIN
              -- Check for position prefix like 1MO, 2TU, -1FR
              IF v_byday_entry ~ '^-?\d' THEN
                v_pos := (regexp_match(v_byday_entry, '^(-?\d+)'))[1]::int;
                v_day := (regexp_match(v_byday_entry, '([A-Z]{2})$'))[1];
                
                IF v_day = v_day_abbrev THEN
                  -- Calculate which occurrence of this weekday in the month
                  v_week_of_month := ceil(v_dom::numeric / 7)::int;
                  v_last_week := v_dom > v_days_in_month - 7;
                  
                  IF v_pos > 0 AND v_week_of_month = v_pos THEN
                    v_include := true;
                  ELSIF v_pos = -1 AND v_last_week THEN
                    v_include := true;
                  END IF;
                END IF;
              ELSE
                -- No position, just weekday (with BYSETPOS perhaps)
                IF v_byday_entry = v_day_abbrev THEN
                  IF v_by_setpos IS NOT NULL THEN
                    v_week_of_month := ceil(v_dom::numeric / 7)::int;
                    v_last_week := v_dom > v_days_in_month - 7;
                    IF v_by_setpos > 0 AND v_week_of_month = v_by_setpos THEN
                      v_include := true;
                    ELSIF v_by_setpos = -1 AND v_last_week THEN
                      v_include := true;
                    END IF;
                  ELSE
                    v_include := true;
                  END IF;
                END IF;
              END IF;
            END;
          END LOOP;
        END IF;
        
        -- MONTHLY: Check BYMONTHDAY
        IF v_by_monthday IS NOT NULL AND v_freq = 'MONTHLY' THEN
          v_include := extract(day from v_current_date)::int = ANY(v_by_monthday);
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
          
          occurrence_date := v_current_date::date;
          occurrence_start_at := v_current_date;
          
          IF NOT is_exception THEN
            RETURN NEXT;
          END IF;
          
          v_occurrence_count := v_occurrence_count + 1;
        END IF;
      END;
    END IF;
    
    -- Move to next date based on frequency
    CASE v_freq
      WHEN 'DAILY' THEN 
        v_current_date := v_current_date + (v_interval || ' days')::interval;
      WHEN 'WEEKLY' THEN 
        -- For weekly with BYDAY, advance by 1 day to check each weekday
        IF v_by_weekday IS NOT NULL AND array_length(v_by_weekday, 1) > 1 THEN
          v_current_date := v_current_date + interval '1 day';
          -- Reset to start of next week if past Saturday
          IF extract(dow from v_current_date) = 0 AND v_interval > 1 THEN
            v_current_date := v_current_date + ((v_interval - 1) * 7 || ' days')::interval;
          END IF;
        ELSE
          v_current_date := v_current_date + (v_interval * 7 || ' days')::interval;
        END IF;
      WHEN 'MONTHLY' THEN 
        -- For monthly with BYDAY, advance by 1 day to check each day
        IF v_by_weekday IS NOT NULL THEN
          v_current_date := v_current_date + interval '1 day';
        ELSE
          v_current_date := v_current_date + (v_interval || ' months')::interval;
        END IF;
      WHEN 'YEARLY' THEN 
        v_current_date := v_current_date + (v_interval || ' years')::interval;
      ELSE 
        v_current_date := v_current_date + interval '1 day';
    END CASE;
  END LOOP;
  
  RETURN;
END;
$$;
-- Update expand_event_series with similar improvements
CREATE OR REPLACE FUNCTION public.expand_event_series(
  p_event_id uuid, 
  p_range_start timestamptz, 
  p_range_end timestamptz
)
RETURNS TABLE(
  occurrence_date timestamptz, 
  is_exception boolean, 
  override_event_id uuid, 
  is_override boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_company_id uuid;
  v_rrule text;
  v_start timestamptz;
  v_until timestamptz;
  v_count integer;
  v_current_date timestamptz;
  v_occurrence_count integer := 0;
  v_freq text;
  v_interval integer := 1;
  v_by_weekday text[];
  v_by_monthday int[];
  v_by_setpos int;
  v_max_iterations int := 1000;
BEGIN
  -- Get the event
  SELECT e.*, e.company_id INTO v_event
  FROM events e
  WHERE e.id = p_event_id AND e.is_recurring_template = true;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  v_company_id := v_event.company_id;
  v_rrule := v_event.recurrence_rules;
  v_start := COALESCE(v_event.recurrence_start_at, v_event.start_at);
  v_until := v_event.recurrence_end_at;
  v_count := v_event.recurrence_count;
  
  -- Check company membership
  IF NOT is_company_member(v_company_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Parse RRULE
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
  
  -- Parse BYDAY
  IF v_rrule ~ 'BYDAY=' THEN
    v_by_weekday := string_to_array(
      (regexp_match(v_rrule, 'BYDAY=([^;]+)'))[1],
      ','
    );
  END IF;
  
  -- Parse BYSETPOS
  IF (regexp_match(v_rrule, 'BYSETPOS=(-?\d+)')) IS NOT NULL THEN
    v_by_setpos := ((regexp_match(v_rrule, 'BYSETPOS=(-?\d+)'))[1])::int;
  END IF;
  
  -- Parse BYMONTHDAY
  IF v_rrule ~ 'BYMONTHDAY=' THEN
    SELECT array_agg(x::int) INTO v_by_monthday
    FROM unnest(string_to_array((regexp_match(v_rrule, 'BYMONTHDAY=([^;]+)'))[1], ',')) x;
  END IF;
  
  -- Start generating occurrences
  v_current_date := v_start;
  
  -- Generate occurrences
  WHILE v_current_date <= p_range_end AND v_occurrence_count < v_max_iterations LOOP
    -- Check count limit
    IF v_count IS NOT NULL AND v_occurrence_count >= v_count THEN
      EXIT;
    END IF;
    
    -- Check until limit
    IF v_until IS NOT NULL AND v_current_date > v_until THEN
      EXIT;
    END IF;
    
    -- Check if date should be included
    IF v_current_date >= p_range_start THEN
      DECLARE
        v_day_abbrev text;
        v_include boolean := true;
        v_week_of_month int;
        v_last_week boolean;
      BEGIN
        -- WEEKLY: Check BYDAY
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
        
        -- MONTHLY: Check BYDAY with position
        IF v_by_weekday IS NOT NULL AND v_freq = 'MONTHLY' THEN
          v_day_abbrev := CASE extract(dow from v_current_date)
            WHEN 0 THEN 'SU'
            WHEN 1 THEN 'MO'
            WHEN 2 THEN 'TU'
            WHEN 3 THEN 'WE'
            WHEN 4 THEN 'TH'
            WHEN 5 THEN 'FR'
            WHEN 6 THEN 'SA'
          END;
          
          v_include := false;
          FOR i IN 1..array_length(v_by_weekday, 1) LOOP
            DECLARE
              v_byday_entry text := v_by_weekday[i];
              v_pos int;
              v_day text;
              v_dom int := extract(day from v_current_date)::int;
              v_days_in_month int := extract(day from (date_trunc('month', v_current_date) + interval '1 month' - interval '1 day'))::int;
            BEGIN
              IF v_byday_entry ~ '^-?\d' THEN
                v_pos := (regexp_match(v_byday_entry, '^(-?\d+)'))[1]::int;
                v_day := (regexp_match(v_byday_entry, '([A-Z]{2})$'))[1];
                
                IF v_day = v_day_abbrev THEN
                  v_week_of_month := ceil(v_dom::numeric / 7)::int;
                  v_last_week := v_dom > v_days_in_month - 7;
                  
                  IF v_pos > 0 AND v_week_of_month = v_pos THEN
                    v_include := true;
                  ELSIF v_pos = -1 AND v_last_week THEN
                    v_include := true;
                  END IF;
                END IF;
              ELSE
                IF v_byday_entry = v_day_abbrev THEN
                  IF v_by_setpos IS NOT NULL THEN
                    v_week_of_month := ceil(v_dom::numeric / 7)::int;
                    v_last_week := v_dom > v_days_in_month - 7;
                    IF v_by_setpos > 0 AND v_week_of_month = v_by_setpos THEN
                      v_include := true;
                    ELSIF v_by_setpos = -1 AND v_last_week THEN
                      v_include := true;
                    END IF;
                  ELSE
                    v_include := true;
                  END IF;
                END IF;
              END IF;
            END;
          END LOOP;
        END IF;
        
        -- MONTHLY: Check BYMONTHDAY
        IF v_by_monthday IS NOT NULL AND v_freq = 'MONTHLY' THEN
          v_include := extract(day from v_current_date)::int = ANY(v_by_monthday);
        END IF;
        
        IF v_include THEN
          -- Check for exception
          IF EXISTS (
            SELECT 1 FROM event_recurrence_exceptions ere
            WHERE ere.event_id = p_event_id 
              AND ere.exception_date = v_current_date::date
          ) THEN
            occurrence_date := v_current_date;
            is_exception := true;
            override_event_id := NULL;
            is_override := false;
          -- Check for override
          ELSIF EXISTS (
            SELECT 1 FROM event_recurrence_overrides ero
            WHERE ero.series_event_id = p_event_id 
              AND ero.occurrence_start_at::date = v_current_date::date
          ) THEN
            occurrence_date := v_current_date;
            is_exception := false;
            override_event_id := (
              SELECT ero.override_event_id FROM event_recurrence_overrides ero
              WHERE ero.series_event_id = p_event_id 
                AND ero.occurrence_start_at::date = v_current_date::date
              LIMIT 1
            );
            is_override := true;
          ELSE
            occurrence_date := v_current_date;
            is_exception := false;
            override_event_id := NULL;
            is_override := false;
          END IF;
          
          IF NOT is_exception THEN
            RETURN NEXT;
          END IF;
          
          v_occurrence_count := v_occurrence_count + 1;
        END IF;
      END;
    END IF;
    
    -- Move to next date
    CASE v_freq
      WHEN 'DAILY' THEN 
        v_current_date := v_current_date + (v_interval || ' days')::interval;
      WHEN 'WEEKLY' THEN 
        IF v_by_weekday IS NOT NULL AND array_length(v_by_weekday, 1) > 1 THEN
          v_current_date := v_current_date + interval '1 day';
          IF extract(dow from v_current_date) = 0 AND v_interval > 1 THEN
            v_current_date := v_current_date + ((v_interval - 1) * 7 || ' days')::interval;
          END IF;
        ELSE
          v_current_date := v_current_date + (v_interval * 7 || ' days')::interval;
        END IF;
      WHEN 'MONTHLY' THEN 
        IF v_by_weekday IS NOT NULL THEN
          v_current_date := v_current_date + interval '1 day';
        ELSE
          v_current_date := v_current_date + (v_interval || ' months')::interval;
        END IF;
      WHEN 'YEARLY' THEN 
        v_current_date := v_current_date + (v_interval || ' years')::interval;
      ELSE 
        v_current_date := v_current_date + interval '1 day';
    END CASE;
  END LOOP;
  
  RETURN;
END;
$$;
