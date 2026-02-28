CREATE TABLE exit_survey_alert_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES exit_survey_alerts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_comments_alert_id ON exit_survey_alert_comments(alert_id);
CREATE INDEX idx_alert_comments_created_at ON exit_survey_alert_comments(created_at DESC);

ALTER TABLE exit_survey_alert_comments ENABLE ROW LEVEL SECURITY;

-- Authenticated users in the company can read comments (via alert → submission → company)
CREATE POLICY "company members can read alert comments"
  ON exit_survey_alert_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM exit_survey_alerts a
      JOIN memberships m ON m.company_id = a.company_id
      WHERE a.id = exit_survey_alert_comments.alert_id
        AND m.user_id = auth.uid()
    )
  );

-- Authenticated members of the company can insert comments
CREATE POLICY "company members can add alert comments"
  ON exit_survey_alert_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM exit_survey_alerts a
      JOIN memberships m ON m.company_id = a.company_id
      WHERE a.id = exit_survey_alert_comments.alert_id
        AND m.user_id = auth.uid()
    )
  );;
