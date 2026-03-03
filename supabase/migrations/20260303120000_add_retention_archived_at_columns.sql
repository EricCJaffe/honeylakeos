-- Add archived_at columns to exit survey tables for retention archiving
-- Default retention policy: 90-day archive window

ALTER TABLE exit_survey_submissions
  ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;

ALTER TABLE exit_survey_alerts
  ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;

-- Index to efficiently find non-archived records
CREATE INDEX IF NOT EXISTS idx_exit_survey_submissions_archived
  ON exit_survey_submissions (company_id, archived_at)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_exit_survey_alerts_archived
  ON exit_survey_alerts (company_id, archived_at)
  WHERE archived_at IS NULL;

-- Update default retention settings to 90 days for new companies
-- Existing companies keep their configured values; these are just defaults
COMMENT ON COLUMN exit_survey_submissions.archived_at IS 'Set by retention automation when submission exceeds retention window';
COMMENT ON COLUMN exit_survey_alerts.archived_at IS 'Set by retention automation when alert exceeds retention window';
