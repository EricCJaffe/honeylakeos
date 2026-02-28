
-- Exit Survey Module: Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE exit_survey_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_survey_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_survey_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_survey_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_survey_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- exit_survey_definitions
-- ============================================================
CREATE POLICY "exit_survey_definitions_select" ON exit_survey_definitions
  FOR SELECT USING (
    -- Authenticated users can view definitions for their company
    (auth.role() = 'authenticated' AND company_id IN (
      SELECT company_id FROM memberships WHERE user_id = auth.uid() AND status = 'active'
    ))
    OR
    -- Anon can view active definitions (for the public form)
    (auth.role() = 'anon' AND is_active = true)
  );

CREATE POLICY "exit_survey_definitions_admin" ON exit_survey_definitions
  FOR ALL USING (
    auth.role() = 'authenticated' AND company_id IN (
      SELECT company_id FROM memberships WHERE user_id = auth.uid() AND role = 'company_admin' AND status = 'active'
    )
  );

-- ============================================================
-- exit_survey_questions
-- ============================================================
CREATE POLICY "exit_survey_questions_select" ON exit_survey_questions
  FOR SELECT USING (
    -- Authenticated users for their company
    (auth.role() = 'authenticated' AND company_id IN (
      SELECT company_id FROM memberships WHERE user_id = auth.uid() AND status = 'active'
    ))
    OR
    -- Anon can read active questions (for the public form)
    (auth.role() = 'anon' AND is_active = true)
  );

CREATE POLICY "exit_survey_questions_admin" ON exit_survey_questions
  FOR ALL USING (
    auth.role() = 'authenticated' AND company_id IN (
      SELECT company_id FROM memberships WHERE user_id = auth.uid() AND role = 'company_admin' AND status = 'active'
    )
  );

-- ============================================================
-- exit_survey_submissions
-- ============================================================

-- Anon INSERT: patients submit surveys without authentication
CREATE POLICY "exit_survey_submissions_anon_insert" ON exit_survey_submissions
  FOR INSERT WITH CHECK (auth.role() = 'anon');

-- Authenticated users can read submissions for their company
CREATE POLICY "exit_survey_submissions_select" ON exit_survey_submissions
  FOR SELECT USING (
    auth.role() = 'authenticated' AND company_id IN (
      SELECT company_id FROM memberships WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Admins can update/delete
CREATE POLICY "exit_survey_submissions_admin" ON exit_survey_submissions
  FOR ALL USING (
    auth.role() = 'authenticated' AND company_id IN (
      SELECT company_id FROM memberships WHERE user_id = auth.uid() AND role = 'company_admin' AND status = 'active'
    )
  );

-- ============================================================
-- exit_survey_responses
-- ============================================================

-- Anon INSERT: patients submit responses without authentication
CREATE POLICY "exit_survey_responses_anon_insert" ON exit_survey_responses
  FOR INSERT WITH CHECK (auth.role() = 'anon');

-- Authenticated users can read responses via submission's company
CREATE POLICY "exit_survey_responses_select" ON exit_survey_responses
  FOR SELECT USING (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM exit_survey_submissions s
      JOIN memberships m ON m.company_id = s.company_id
      WHERE s.id = exit_survey_responses.submission_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

-- Admins can update/delete
CREATE POLICY "exit_survey_responses_admin" ON exit_survey_responses
  FOR ALL USING (
    auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM exit_survey_submissions s
      JOIN memberships m ON m.company_id = s.company_id
      WHERE s.id = exit_survey_responses.submission_id
        AND m.user_id = auth.uid()
        AND m.role = 'company_admin'
        AND m.status = 'active'
    )
  );

-- ============================================================
-- exit_survey_alerts
-- ============================================================
CREATE POLICY "exit_survey_alerts_select" ON exit_survey_alerts
  FOR SELECT USING (
    auth.role() = 'authenticated' AND company_id IN (
      SELECT company_id FROM memberships WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Assigned user can update their own alerts
CREATE POLICY "exit_survey_alerts_assigned_update" ON exit_survey_alerts
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND assigned_to = auth.uid()
  );

CREATE POLICY "exit_survey_alerts_admin" ON exit_survey_alerts
  FOR ALL USING (
    auth.role() = 'authenticated' AND company_id IN (
      SELECT company_id FROM memberships WHERE user_id = auth.uid() AND role = 'company_admin' AND status = 'active'
    )
  );

-- ============================================================
-- exit_survey_trends
-- ============================================================
CREATE POLICY "exit_survey_trends_select" ON exit_survey_trends
  FOR SELECT USING (
    auth.role() = 'authenticated' AND company_id IN (
      SELECT company_id FROM memberships WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "exit_survey_trends_admin" ON exit_survey_trends
  FOR ALL USING (
    auth.role() = 'authenticated' AND company_id IN (
      SELECT company_id FROM memberships WHERE user_id = auth.uid() AND role = 'company_admin' AND status = 'active'
    )
  );

-- ============================================================
-- exit_survey_settings
-- ============================================================
CREATE POLICY "exit_survey_settings_select" ON exit_survey_settings
  FOR SELECT USING (
    auth.role() = 'authenticated' AND company_id IN (
      SELECT company_id FROM memberships WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "exit_survey_settings_admin" ON exit_survey_settings
  FOR ALL USING (
    auth.role() = 'authenticated' AND company_id IN (
      SELECT company_id FROM memberships WHERE user_id = auth.uid() AND role = 'company_admin' AND status = 'active'
    )
  );
;
