-- ==========================================
-- Activation Scores Table
-- ==========================================

CREATE TABLE public.activation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  breakdown_json JSONB NOT NULL DEFAULT '{}',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  calculated_by TEXT DEFAULT 'system',
  CONSTRAINT activation_scores_company_id_key UNIQUE (company_id)
);

-- Enable RLS
ALTER TABLE public.activation_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Site admins can see all
CREATE POLICY "Site admins can view all activation scores"
  ON public.activation_scores
  FOR SELECT
  USING (public.is_site_admin((SELECT site_id FROM companies WHERE id = activation_scores.company_id)));

-- Company admins can see their own
CREATE POLICY "Company admins can view own activation score"
  ON public.activation_scores
  FOR SELECT
  USING (public.is_company_admin(company_id));

-- Coaches can see attributed client scores
CREATE POLICY "Coaches can view attributed client scores"
  ON public.activation_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_coach_attribution
      WHERE company_coach_attribution.company_id = activation_scores.company_id
      AND company_coach_attribution.is_active = true
      AND company_coach_attribution.coach_company_id IN (
        SELECT m.company_id FROM public.memberships m WHERE m.user_id = auth.uid()
      )
    )
  );

-- System can insert/update (via SECURITY DEFINER functions)
CREATE POLICY "System can manage activation scores"
  ON public.activation_scores
  FOR ALL
  USING (public.is_site_admin((SELECT site_id FROM companies WHERE id = activation_scores.company_id)))
  WITH CHECK (public.is_site_admin((SELECT site_id FROM companies WHERE id = activation_scores.company_id)));

-- ==========================================
-- Enhanced Scoring Function with Breakdown
-- ==========================================

CREATE OR REPLACE FUNCTION public.calculate_activation_score(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
    setup_score INTEGER := 0;
    engagement_score INTEGER := 0;
    value_score INTEGER := 0;
    total_score INTEGER := 0;
    breakdown JSONB;
    
    -- Setup criteria
    has_invited_user BOOLEAN := FALSE;
    has_task_list BOOLEAN := FALSE;
    has_project_or_tasks BOOLEAN := FALSE;
    has_note_or_doc BOOLEAN := FALSE;
    
    -- Engagement criteria
    active_days_14 INTEGER := 0;
    active_users_14 INTEGER := 0;
    total_tasks INTEGER := 0;
    completed_tasks INTEGER := 0;
    
    -- Value criteria
    has_run_report BOOLEAN := FALSE;
    has_advanced_module BOOLEAN := FALSE;
    has_framework BOOLEAN := FALSE;
BEGIN
    -- ==========================================
    -- A) SETUP (30 points)
    -- ==========================================
    
    -- Check invited user accepted (10 pts)
    SELECT EXISTS (
        SELECT 1 FROM activation_events
        WHERE company_id = p_company_id AND event_key = 'invited_user_accepted'
    ) INTO has_invited_user;
    IF has_invited_user THEN setup_score := setup_score + 10; END IF;
    
    -- Check task list created (5 pts)
    SELECT EXISTS (
        SELECT 1 FROM activation_events
        WHERE company_id = p_company_id AND event_key = 'created_first_task_list'
    ) INTO has_task_list;
    IF has_task_list THEN setup_score := setup_score + 5; END IF;
    
    -- Check project OR 3+ tasks (10 pts)
    SELECT (
        EXISTS (
            SELECT 1 FROM activation_events
            WHERE company_id = p_company_id AND event_key = 'created_first_project'
        )
        OR
        (SELECT COUNT(*) FROM tasks WHERE tasks.company_id = p_company_id AND archived_at IS NULL) >= 3
    ) INTO has_project_or_tasks;
    IF has_project_or_tasks THEN setup_score := setup_score + 10; END IF;
    
    -- Check note or document (5 pts)
    SELECT EXISTS (
        SELECT 1 FROM activation_events
        WHERE company_id = p_company_id AND event_key = 'created_first_note_or_doc'
    ) INTO has_note_or_doc;
    IF has_note_or_doc THEN setup_score := setup_score + 5; END IF;
    
    -- ==========================================
    -- B) ENGAGEMENT (40 points)
    -- ==========================================
    
    -- Active days in last 14 (10 pts for 3+)
    SELECT COUNT(DISTINCT DATE(occurred_at)) INTO active_days_14
    FROM activation_events
    WHERE company_id = p_company_id
    AND occurred_at > now() - INTERVAL '14 days';
    IF active_days_14 >= 3 THEN engagement_score := engagement_score + 10; END IF;
    
    -- Active users in last 14 (10 pts for 2+)
    SELECT COUNT(DISTINCT user_id) INTO active_users_14
    FROM activation_events
    WHERE company_id = p_company_id
    AND occurred_at > now() - INTERVAL '14 days';
    IF active_users_14 >= 2 THEN engagement_score := engagement_score + 10; END IF;
    
    -- Total tasks created (10 pts for 5+)
    SELECT COUNT(*) INTO total_tasks
    FROM tasks
    WHERE tasks.company_id = p_company_id AND archived_at IS NULL;
    IF total_tasks >= 5 THEN engagement_score := engagement_score + 10; END IF;
    
    -- Completed tasks (10 pts for 3+)
    SELECT COUNT(*) INTO completed_tasks
    FROM tasks
    WHERE tasks.company_id = p_company_id 
    AND status = 'done'
    AND archived_at IS NULL;
    IF completed_tasks >= 3 THEN engagement_score := engagement_score + 10; END IF;
    
    -- ==========================================
    -- C) VALUE SIGNALS (30 points)
    -- ==========================================
    
    -- Ran a report (10 pts)
    SELECT EXISTS (
        SELECT 1 FROM activation_events
        WHERE company_id = p_company_id AND event_key = 'ran_first_report'
    ) INTO has_run_report;
    IF has_run_report THEN value_score := value_score + 10; END IF;
    
    -- Used advanced module: CRM, Donors, Finance, LMS (10 pts)
    SELECT EXISTS (
        SELECT 1 FROM activation_events
        WHERE company_id = p_company_id AND event_key = 'created_first_crm_record'
    ) OR EXISTS (
        SELECT 1 FROM crm_clients WHERE crm_clients.company_id = p_company_id AND archived_at IS NULL LIMIT 1
    ) OR EXISTS (
        SELECT 1 FROM donor_profiles WHERE donor_profiles.company_id = p_company_id LIMIT 1
    ) OR EXISTS (
        SELECT 1 FROM lms_courses WHERE lms_courses.company_id = p_company_id AND archived_at IS NULL LIMIT 1
    ) INTO has_advanced_module;
    IF has_advanced_module THEN value_score := value_score + 10; END IF;
    
    -- Framework assigned OR health score exists (10 pts)
    SELECT EXISTS (
        SELECT 1 FROM activation_events
        WHERE company_id = p_company_id AND event_key = 'enabled_framework'
    ) OR EXISTS (
        SELECT 1 FROM company_frameworks WHERE company_frameworks.company_id = p_company_id
    ) OR EXISTS (
        SELECT 1 FROM framework_health_scores WHERE framework_health_scores.company_id = p_company_id
    ) INTO has_framework;
    IF has_framework THEN value_score := value_score + 10; END IF;
    
    -- ==========================================
    -- BUILD RESULT
    -- ==========================================
    
    total_score := setup_score + engagement_score + value_score;
    
    breakdown := jsonb_build_object(
        'setup', jsonb_build_object(
            'score', setup_score,
            'max', 30,
            'criteria', jsonb_build_object(
                'invited_user_accepted', jsonb_build_object('met', has_invited_user, 'points', 10, 'label', 'Invited ≥1 user'),
                'created_task_list', jsonb_build_object('met', has_task_list, 'points', 5, 'label', 'Created ≥1 task list'),
                'project_or_tasks', jsonb_build_object('met', has_project_or_tasks, 'points', 10, 'label', 'Created ≥1 project OR ≥3 tasks'),
                'note_or_doc', jsonb_build_object('met', has_note_or_doc, 'points', 5, 'label', 'Created ≥1 note or document')
            )
        ),
        'engagement', jsonb_build_object(
            'score', engagement_score,
            'max', 40,
            'criteria', jsonb_build_object(
                'active_days', jsonb_build_object('met', active_days_14 >= 3, 'points', 10, 'label', '≥3 active days in last 14', 'value', active_days_14),
                'active_users', jsonb_build_object('met', active_users_14 >= 2, 'points', 10, 'label', '≥2 users active in last 14', 'value', active_users_14),
                'tasks_created', jsonb_build_object('met', total_tasks >= 5, 'points', 10, 'label', '≥5 tasks created total', 'value', total_tasks),
                'tasks_completed', jsonb_build_object('met', completed_tasks >= 3, 'points', 10, 'label', '≥3 tasks completed', 'value', completed_tasks)
            )
        ),
        'value_signals', jsonb_build_object(
            'score', value_score,
            'max', 30,
            'criteria', jsonb_build_object(
                'ran_report', jsonb_build_object('met', has_run_report, 'points', 10, 'label', 'Ran ≥1 report'),
                'advanced_module', jsonb_build_object('met', has_advanced_module, 'points', 10, 'label', 'Used advanced module (CRM/Donor/Finance/LMS)'),
                'framework_enabled', jsonb_build_object('met', has_framework, 'points', 10, 'label', 'Framework assigned OR health score computed')
            )
        )
    );
    
    result := jsonb_build_object(
        'score', total_score,
        'breakdown', breakdown,
        'calculated_at', now()
    );
    
    RETURN result;
END;
$$;

-- ==========================================
-- Function to Calculate and Store Score
-- ==========================================

CREATE OR REPLACE FUNCTION public.compute_and_store_activation_score(p_company_id UUID, p_calculated_by TEXT DEFAULT 'system')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    score_result JSONB;
    final_score INTEGER;
BEGIN
    -- Calculate the score
    score_result := public.calculate_activation_score(p_company_id);
    final_score := (score_result->>'score')::INTEGER;
    
    -- Upsert into activation_scores
    INSERT INTO public.activation_scores (company_id, score, breakdown_json, calculated_at, calculated_by)
    VALUES (
        p_company_id,
        final_score,
        score_result->'breakdown',
        now(),
        p_calculated_by
    )
    ON CONFLICT (company_id) DO UPDATE SET
        score = final_score,
        breakdown_json = score_result->'breakdown',
        calculated_at = now(),
        calculated_by = p_calculated_by;
    
    -- Log audit event
    INSERT INTO public.audit_logs (company_id, entity_type, entity_id, action, actor_user_id, metadata)
    VALUES (
        p_company_id,
        'activation_score',
        p_company_id,
        'activation_score.calculated',
        CASE WHEN p_calculated_by = 'system' THEN NULL ELSE p_calculated_by::UUID END,
        jsonb_build_object('score', final_score)
    );
    
    RETURN score_result;
END;
$$;

-- ==========================================
-- Function to Recalculate All Pilot Scores
-- ==========================================

CREATE OR REPLACE FUNCTION public.recalculate_all_pilot_scores()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    pilot_record RECORD;
    count INTEGER := 0;
BEGIN
    FOR pilot_record IN 
        SELECT company_id FROM pilot_flags 
        WHERE is_pilot = TRUE AND (ended_at IS NULL OR ended_at > now())
    LOOP
        PERFORM public.compute_and_store_activation_score(pilot_record.company_id, 'system');
        count := count + 1;
    END LOOP;
    
    RETURN count;
END;
$$;

-- ==========================================
-- Update get_pilot_company_stats to use new scoring
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_pilot_company_stats(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    stored_score RECORD;
BEGIN
    -- Get stored score or calculate if not exists
    SELECT score, breakdown_json, calculated_at INTO stored_score
    FROM activation_scores
    WHERE company_id = p_company_id;
    
    SELECT json_build_object(
        'activation_score', COALESCE(stored_score.score, (public.calculate_activation_score(p_company_id)->>'score')::INTEGER),
        'score_breakdown', COALESCE(stored_score.breakdown_json::JSON, (public.calculate_activation_score(p_company_id)->'breakdown')::JSON),
        'score_calculated_at', stored_score.calculated_at,
        'active_users_7d', (
            SELECT COUNT(DISTINCT user_id)
            FROM activation_events
            WHERE company_id = p_company_id
            AND occurred_at > now() - INTERVAL '7 days'
        ),
        'last_activity', (
            SELECT MAX(occurred_at)
            FROM activation_events
            WHERE company_id = p_company_id
        ),
        'milestones_achieved', (
            SELECT COALESCE(json_agg(DISTINCT event_key), '[]'::JSON)
            FROM activation_events
            WHERE company_id = p_company_id
        ),
        'feedback_count', (
            SELECT COUNT(*)
            FROM feedback_items
            WHERE company_id = p_company_id
        ),
        'open_feedback_count', (
            SELECT COUNT(*)
            FROM feedback_items
            WHERE company_id = p_company_id
            AND status = 'open'
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_activation_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_and_store_activation_score(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_all_pilot_scores() TO authenticated;