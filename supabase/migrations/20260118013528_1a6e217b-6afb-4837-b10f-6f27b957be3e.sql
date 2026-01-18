-- Create framework_health_scores table to store computed health scores
CREATE TABLE public.framework_health_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  framework_id UUID NOT NULL REFERENCES public.frameworks(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  status TEXT NOT NULL CHECK (status IN ('green', 'yellow', 'red')),
  breakdown_json JSONB NOT NULL DEFAULT '{}',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for latest score lookup
CREATE INDEX framework_health_scores_company_idx ON public.framework_health_scores(company_id);
CREATE INDEX framework_health_scores_calculated_idx ON public.framework_health_scores(calculated_at DESC);

-- Create coach alert severity enum type
DO $$ BEGIN
  CREATE TYPE public.alert_severity AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create coach_alerts table
CREATE TABLE public.coach_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity public.alert_severity NOT NULL DEFAULT 'medium',
  message TEXT NOT NULL,
  suggested_action TEXT,
  data_snapshot JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  CONSTRAINT valid_coach_relationship CHECK (coach_company_id != client_company_id)
);

-- Indexes for performance
CREATE INDEX coach_alerts_coach_company_idx ON public.coach_alerts(coach_company_id);
CREATE INDEX coach_alerts_client_company_idx ON public.coach_alerts(client_company_id);
CREATE INDEX coach_alerts_unresolved_idx ON public.coach_alerts(coach_company_id) WHERE resolved_at IS NULL;
CREATE INDEX coach_alerts_severity_idx ON public.coach_alerts(severity);

-- Enable RLS
ALTER TABLE public.framework_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_alerts ENABLE ROW LEVEL SECURITY;

-- RLS for framework_health_scores
-- Company members can view their own scores
CREATE POLICY "Company members can view own health scores"
  ON public.framework_health_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = framework_health_scores.company_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );

-- Coaches can view client health scores
CREATE POLICY "Coaches can view client health scores"
  ON public.framework_health_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_organizations co
      JOIN public.memberships m ON m.company_id = co.coach_company_id
      WHERE co.client_company_id = framework_health_scores.company_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND co.status = 'active'
    )
  );

-- Admins can insert health scores
CREATE POLICY "Admins can insert health scores"
  ON public.framework_health_scores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = framework_health_scores.company_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role = 'company_admin'
    )
  );

-- RLS for coach_alerts
-- Coaches can view alerts for their company
CREATE POLICY "Coaches can view their alerts"
  ON public.coach_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = coach_alerts.coach_company_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );

-- Coaches can resolve alerts
CREATE POLICY "Coaches can resolve their alerts"
  ON public.coach_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = coach_alerts.coach_company_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = coach_alerts.coach_company_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );

-- System can create alerts
CREATE POLICY "Members can create alerts"
  ON public.coach_alerts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.company_id = coach_alerts.coach_company_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );

-- Create function to compute and store health score for a company
CREATE OR REPLACE FUNCTION public.compute_health_score(
  _company_id UUID,
  _framework_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _score INTEGER;
  _status TEXT;
  _breakdown JSONB;
  _result_id UUID;
  _total_tasks INTEGER;
  _completed_tasks INTEGER;
  _overdue_tasks INTEGER;
  _active_projects INTEGER;
  _stalled_projects INTEGER;
  _last_activity TIMESTAMPTZ;
  _task_score INTEGER;
  _project_score INTEGER;
  _activity_score INTEGER;
BEGIN
  -- Calculate task metrics
  SELECT COUNT(*), 
         COUNT(*) FILTER (WHERE status = 'done'),
         COUNT(*) FILTER (WHERE status != 'done' AND due_date < NOW())
  INTO _total_tasks, _completed_tasks, _overdue_tasks
  FROM public.tasks
  WHERE company_id = _company_id AND archived_at IS NULL;
  
  -- Calculate project metrics
  SELECT COUNT(*) FILTER (WHERE status IN ('in_progress', 'planning')),
         COUNT(*) FILTER (WHERE status IN ('in_progress', 'planning') 
                          AND updated_at < NOW() - INTERVAL '14 days')
  INTO _active_projects, _stalled_projects
  FROM public.projects
  WHERE company_id = _company_id AND archived_at IS NULL;
  
  -- Get last activity
  SELECT GREATEST(
    (SELECT MAX(created_at) FROM public.tasks WHERE company_id = _company_id),
    (SELECT MAX(updated_at) FROM public.projects WHERE company_id = _company_id),
    (SELECT MAX(start_at) FROM public.events WHERE company_id = _company_id)
  ) INTO _last_activity;
  
  -- Calculate scores
  IF _total_tasks > 0 THEN
    _task_score := GREATEST(0, 100 - (_overdue_tasks::FLOAT / _total_tasks * 100)::INTEGER);
  ELSE
    _task_score := 80; -- neutral if no tasks
  END IF;
  
  IF _active_projects > 0 THEN
    _project_score := GREATEST(0, 100 - (_stalled_projects::FLOAT / _active_projects * 100)::INTEGER);
  ELSE
    _project_score := 80;
  END IF;
  
  IF _last_activity IS NOT NULL AND _last_activity > NOW() - INTERVAL '7 days' THEN
    _activity_score := 100;
  ELSIF _last_activity IS NOT NULL AND _last_activity > NOW() - INTERVAL '14 days' THEN
    _activity_score := 70;
  ELSIF _last_activity IS NOT NULL AND _last_activity > NOW() - INTERVAL '30 days' THEN
    _activity_score := 40;
  ELSE
    _activity_score := 20;
  END IF;
  
  -- Weighted average (40% tasks, 30% projects, 30% activity)
  _score := ((_task_score * 40) + (_project_score * 30) + (_activity_score * 30)) / 100;
  
  -- Determine status
  IF _score >= 80 THEN
    _status := 'green';
  ELSIF _score >= 50 THEN
    _status := 'yellow';
  ELSE
    _status := 'red';
  END IF;
  
  -- Build breakdown
  _breakdown := jsonb_build_object(
    'task_completion', jsonb_build_object('score', _task_score, 'weight', 40, 'total', _total_tasks, 'completed', _completed_tasks, 'overdue', _overdue_tasks),
    'project_health', jsonb_build_object('score', _project_score, 'weight', 30, 'active', _active_projects, 'stalled', _stalled_projects),
    'activity', jsonb_build_object('score', _activity_score, 'weight', 30, 'last_activity_at', _last_activity)
  );
  
  -- Insert new score
  INSERT INTO public.framework_health_scores (company_id, framework_id, score, status, breakdown_json)
  VALUES (_company_id, _framework_id, _score, _status, _breakdown)
  RETURNING id INTO _result_id;
  
  RETURN _result_id;
END;
$$;

-- Function to generate coach alerts based on health changes
CREATE OR REPLACE FUNCTION public.generate_coach_alerts(
  _client_company_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _coach RECORD;
  _current_score RECORD;
  _previous_score RECORD;
  _alert_count INTEGER := 0;
  _last_activity TIMESTAMPTZ;
  _days_inactive INTEGER;
BEGIN
  -- Get current and previous health scores
  SELECT * INTO _current_score
  FROM public.framework_health_scores
  WHERE company_id = _client_company_id
  ORDER BY calculated_at DESC
  LIMIT 1;
  
  SELECT * INTO _previous_score
  FROM public.framework_health_scores
  WHERE company_id = _client_company_id
  ORDER BY calculated_at DESC
  OFFSET 1
  LIMIT 1;
  
  -- Get last activity
  SELECT GREATEST(
    (SELECT MAX(created_at) FROM public.tasks WHERE company_id = _client_company_id),
    (SELECT MAX(updated_at) FROM public.projects WHERE company_id = _client_company_id)
  ) INTO _last_activity;
  
  _days_inactive := EXTRACT(DAY FROM NOW() - COALESCE(_last_activity, NOW() - INTERVAL '365 days'));
  
  -- For each coach linked to this client
  FOR _coach IN
    SELECT co.coach_company_id
    FROM public.coach_organizations co
    WHERE co.client_company_id = _client_company_id
    AND co.status = 'active'
  LOOP
    -- Alert: Health score dropped below threshold
    IF _current_score.score IS NOT NULL AND _current_score.score < 50 
       AND (_previous_score.score IS NULL OR _previous_score.score >= 50) THEN
      INSERT INTO public.coach_alerts (
        coach_company_id, client_company_id, alert_type, severity, message, suggested_action, data_snapshot
      ) VALUES (
        _coach.coach_company_id, _client_company_id, 
        'health_below_threshold', 'high',
        'Client health score dropped below 50%',
        'Schedule a check-in call to discuss blockers and priorities',
        jsonb_build_object('current_score', _current_score.score, 'status', _current_score.status)
      );
      _alert_count := _alert_count + 1;
    END IF;
    
    -- Alert: Significant score drop (>15 points)
    IF _current_score.score IS NOT NULL AND _previous_score.score IS NOT NULL
       AND (_previous_score.score - _current_score.score) > 15 THEN
      INSERT INTO public.coach_alerts (
        coach_company_id, client_company_id, alert_type, severity, message, suggested_action, data_snapshot
      ) VALUES (
        _coach.coach_company_id, _client_company_id,
        'health_significant_drop', 'medium',
        format('Health score dropped %s points (from %s to %s)', 
               _previous_score.score - _current_score.score, _previous_score.score, _current_score.score),
        'Review recent changes and offer support',
        jsonb_build_object('previous_score', _previous_score.score, 'current_score', _current_score.score)
      );
      _alert_count := _alert_count + 1;
    END IF;
    
    -- Alert: No activity in 7+ days
    IF _days_inactive >= 7 THEN
      -- Only create if no recent inactivity alert exists
      IF NOT EXISTS (
        SELECT 1 FROM public.coach_alerts
        WHERE coach_company_id = _coach.coach_company_id
        AND client_company_id = _client_company_id
        AND alert_type = 'inactivity'
        AND resolved_at IS NULL
        AND created_at > NOW() - INTERVAL '7 days'
      ) THEN
        INSERT INTO public.coach_alerts (
          coach_company_id, client_company_id, alert_type, 
          severity, message, suggested_action, data_snapshot
        ) VALUES (
          _coach.coach_company_id, _client_company_id,
          'inactivity',
          CASE WHEN _days_inactive >= 14 THEN 'high'::public.alert_severity 
               ELSE 'medium'::public.alert_severity END,
          format('No activity in %s days', _days_inactive),
          'Reach out to check on engagement and identify any obstacles',
          jsonb_build_object('days_inactive', _days_inactive, 'last_activity_at', _last_activity)
        );
        _alert_count := _alert_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN _alert_count;
END;
$$;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.compute_health_score(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_coach_alerts(UUID) TO authenticated;