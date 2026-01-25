-- Add missing recurrence columns to events table (some may already exist)
DO $$
BEGIN
  -- Add recurrence_start_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'recurrence_start_at') THEN
    ALTER TABLE public.events ADD COLUMN recurrence_start_at timestamptz;
  END IF;
  
  -- Add recurrence_end_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'recurrence_end_at') THEN
    ALTER TABLE public.events ADD COLUMN recurrence_end_at timestamptz;
  END IF;
  
  -- Add recurrence_count if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'recurrence_count') THEN
    ALTER TABLE public.events ADD COLUMN recurrence_count integer;
  END IF;
  
  -- Add is_recurrence_exception if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'is_recurrence_exception') THEN
    ALTER TABLE public.events ADD COLUMN is_recurrence_exception boolean DEFAULT false;
  END IF;
END $$;

-- Create event_recurrence_exceptions table
CREATE TABLE IF NOT EXISTS public.event_recurrence_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, event_id, exception_date)
);

-- Create event_recurrence_overrides table
CREATE TABLE IF NOT EXISTS public.event_recurrence_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  series_event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  occurrence_start_at timestamptz NOT NULL,
  override_event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, series_event_id, occurrence_start_at)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_recurrence_exceptions_lookup 
  ON public.event_recurrence_exceptions(company_id, event_id);
CREATE INDEX IF NOT EXISTS idx_event_recurrence_overrides_lookup 
  ON public.event_recurrence_overrides(company_id, series_event_id);
CREATE INDEX IF NOT EXISTS idx_events_recurrence 
  ON public.events(company_id, is_recurring_template) WHERE is_recurring_template = true;

-- Enable RLS
ALTER TABLE public.event_recurrence_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_recurrence_overrides ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_recurrence_exceptions
CREATE POLICY "event_recurrence_exceptions_select_company_member"
  ON public.event_recurrence_exceptions FOR SELECT
  USING (is_company_member(company_id));

CREATE POLICY "event_recurrence_exceptions_insert_company_member"
  ON public.event_recurrence_exceptions FOR INSERT
  WITH CHECK (is_company_member(company_id));

CREATE POLICY "event_recurrence_exceptions_delete_creator_or_admin"
  ON public.event_recurrence_exceptions FOR DELETE
  USING ((created_by = auth.uid()) OR is_company_admin(company_id));

-- RLS policies for event_recurrence_overrides
CREATE POLICY "event_recurrence_overrides_select_company_member"
  ON public.event_recurrence_overrides FOR SELECT
  USING (is_company_member(company_id));

CREATE POLICY "event_recurrence_overrides_insert_company_member"
  ON public.event_recurrence_overrides FOR INSERT
  WITH CHECK (is_company_member(company_id));

CREATE POLICY "event_recurrence_overrides_delete_creator_or_admin"
  ON public.event_recurrence_overrides FOR DELETE
  USING ((created_by = auth.uid()) OR is_company_admin(company_id));

-- Create RPC for expanding event series
CREATE OR REPLACE FUNCTION public.expand_event_series(
  p_event_id uuid,
  p_range_start timestamptz,
  p_range_end timestamptz
)
RETURNS TABLE (
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
  
  -- Start generating occurrences
  v_current_date := v_start;
  
  -- Fast forward to range start
  IF v_current_date < p_range_start THEN
    WHILE v_current_date < p_range_start LOOP
      CASE v_freq
        WHEN 'DAILY' THEN v_current_date := v_current_date + (v_interval || ' days')::interval;
        WHEN 'WEEKLY' THEN v_current_date := v_current_date + (v_interval * 7 || ' days')::interval;
        WHEN 'MONTHLY' THEN v_current_date := v_current_date + (v_interval || ' months')::interval;
        WHEN 'YEARLY' THEN v_current_date := v_current_date + (v_interval || ' years')::interval;
        ELSE v_current_date := v_current_date + '1 day'::interval;
      END CASE;
      v_occurrence_count := v_occurrence_count + 1;
      
      -- Check count limit during fast-forward
      IF v_count IS NOT NULL AND v_occurrence_count >= v_count THEN
        RETURN;
      END IF;
    END LOOP;
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
      SELECT 1 FROM event_recurrence_exceptions ere
      WHERE ere.event_id = p_event_id 
        AND ere.exception_date = v_current_date::date
    ) THEN
      occurrence_date := v_current_date;
      is_exception := true;
      override_event_id := NULL;
      is_override := false;
    -- Check if this occurrence has an override
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
      -- Normal occurrence
      occurrence_date := v_current_date;
      is_exception := false;
      override_event_id := NULL;
      is_override := false;
    END IF;
    
    -- Only return non-exception occurrences within range
    IF v_current_date >= p_range_start AND NOT is_exception THEN
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

-- RPC to skip an event occurrence
CREATE OR REPLACE FUNCTION public.skip_event_occurrence(
  p_event_id uuid,
  p_occurrence_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_exception_id uuid;
BEGIN
  -- Get event and validate
  SELECT * INTO v_event FROM events WHERE id = p_event_id AND is_recurring_template = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found or not a recurring template';
  END IF;
  
  -- Check permissions
  IF NOT is_company_member(v_event.company_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Insert exception
  INSERT INTO event_recurrence_exceptions (company_id, event_id, exception_date, created_by)
  VALUES (v_event.company_id, p_event_id, p_occurrence_date, auth.uid())
  ON CONFLICT (company_id, event_id, exception_date) DO NOTHING
  RETURNING id INTO v_exception_id;
  
  RETURN v_exception_id;
END;
$$;

-- RPC to create an override (edit single occurrence)
CREATE OR REPLACE FUNCTION public.create_event_occurrence_override(
  p_series_event_id uuid,
  p_occurrence_start_at timestamptz,
  p_title text,
  p_description text DEFAULT NULL,
  p_start_at timestamptz DEFAULT NULL,
  p_end_at timestamptz DEFAULT NULL,
  p_all_day boolean DEFAULT false,
  p_location_text text DEFAULT NULL,
  p_color text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_series_event RECORD;
  v_override_event_id uuid;
  v_start_at timestamptz;
BEGIN
  -- Get series event
  SELECT * INTO v_series_event FROM events WHERE id = p_series_event_id AND is_recurring_template = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Series event not found';
  END IF;
  
  -- Check permissions
  IF NOT is_company_member(v_series_event.company_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  v_start_at := COALESCE(p_start_at, p_occurrence_start_at);
  
  -- Create the override event
  INSERT INTO events (
    company_id, title, description, start_at, end_at, all_day,
    location_text, color, is_recurrence_exception, parent_recurring_event_id,
    recurrence_instance_at, created_by, project_id, timezone
  )
  VALUES (
    v_series_event.company_id, p_title, p_description, v_start_at, p_end_at, p_all_day,
    p_location_text, p_color, true, p_series_event_id,
    p_occurrence_start_at, auth.uid(), v_series_event.project_id, v_series_event.timezone
  )
  RETURNING id INTO v_override_event_id;
  
  -- Create the override record
  INSERT INTO event_recurrence_overrides (
    company_id, series_event_id, occurrence_start_at, override_event_id, created_by
  )
  VALUES (
    v_series_event.company_id, p_series_event_id, p_occurrence_start_at, v_override_event_id, auth.uid()
  );
  
  RETURN v_override_event_id;
END;
$$;