
-- Exit Survey Module: Core Tables
-- All tables use company_id scoping (not site_id)

-- Survey Definitions (survey versions)
CREATE TABLE IF NOT EXISTS exit_survey_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, version)
);

-- Survey Questions
CREATE TABLE IF NOT EXISTS exit_survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  definition_id UUID REFERENCES exit_survey_definitions(id) ON DELETE SET NULL,
  question_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  category TEXT NOT NULL, -- KPI, Admissions, Patient Services, Treatment Team, Treatment Program, Facility, General
  type TEXT NOT NULL DEFAULT 'scored', -- 'scored' or 'open_ended'
  department TEXT,
  owner_name TEXT,
  owner_email TEXT,
  comment_threshold INTEGER DEFAULT 3, -- show comment box if score <= this
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Patient Submissions
CREATE TABLE IF NOT EXISTS exit_survey_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  definition_id UUID REFERENCES exit_survey_definitions(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  patient_first_name TEXT,
  patient_last_name TEXT,
  -- Category averages (auto-calculated by trigger)
  overall_average NUMERIC(4,2),
  kpi_avg NUMERIC(4,2),
  admissions_avg NUMERIC(4,2),
  patient_services_avg NUMERIC(4,2),
  treatment_team_avg NUMERIC(4,2),
  treatment_program_avg NUMERIC(4,2),
  facility_avg NUMERIC(4,2),
  -- Open-ended responses
  open_ended_improvement TEXT,
  open_ended_positive TEXT,
  -- Provider fields
  psych_provider TEXT,
  primary_therapist TEXT,
  case_manager TEXT,
  pastor TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual Question Responses
CREATE TABLE IF NOT EXISTS exit_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES exit_survey_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exit_survey_questions(id) ON DELETE RESTRICT,
  score INTEGER CHECK (score BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(submission_id, question_id)
);

-- Low-Score Alerts
CREATE TABLE IF NOT EXISTS exit_survey_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES exit_survey_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exit_survey_questions(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','acknowledged','reviewed','action_taken','resolved')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('high','normal','low')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pre-aggregated Trends
CREATE TABLE IF NOT EXISTS exit_survey_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  question_id UUID REFERENCES exit_survey_questions(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly','rolling_30','rolling_90','rolling_3mo','rolling_6mo','rolling_12mo')),
  period_label TEXT NOT NULL, -- e.g. "2024-08", "Last 30 Days"
  avg_score NUMERIC(4,2),
  submission_count INTEGER DEFAULT 0,
  score_1_pct NUMERIC(5,2),
  score_2_pct NUMERIC(5,2),
  score_3_pct NUMERIC(5,2),
  score_4_pct NUMERIC(5,2),
  score_5_pct NUMERIC(5,2),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, question_id, period_type, period_label)
);

-- Settings (key-value config per company)
CREATE TABLE IF NOT EXISTS exit_survey_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  category TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_exit_survey_submissions_company ON exit_survey_submissions(company_id);
CREATE INDEX IF NOT EXISTS idx_exit_survey_submissions_date ON exit_survey_submissions(company_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_exit_survey_responses_submission ON exit_survey_responses(submission_id);
CREATE INDEX IF NOT EXISTS idx_exit_survey_alerts_company_status ON exit_survey_alerts(company_id, status);
CREATE INDEX IF NOT EXISTS idx_exit_survey_trends_company ON exit_survey_trends(company_id, question_id, period_type);
CREATE INDEX IF NOT EXISTS idx_exit_survey_questions_company ON exit_survey_questions(company_id, is_active);
;
