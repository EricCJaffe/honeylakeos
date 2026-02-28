
-- Exit Survey Module: DB Trigger Functions

-- ============================================================
-- Trigger 1: Calculate submission averages after response insert/update
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_submission_averages()
RETURNS TRIGGER AS $$
DECLARE
  v_submission_id UUID;
  v_company_id UUID;
  v_kpi_avg NUMERIC(4,2);
  v_admissions_avg NUMERIC(4,2);
  v_patient_services_avg NUMERIC(4,2);
  v_treatment_team_avg NUMERIC(4,2);
  v_treatment_program_avg NUMERIC(4,2);
  v_facility_avg NUMERIC(4,2);
  v_overall_avg NUMERIC(4,2);
BEGIN
  v_submission_id := NEW.submission_id;

  -- Get company_id from the submission
  SELECT company_id INTO v_company_id
  FROM exit_survey_submissions
  WHERE id = v_submission_id;

  -- Calculate per-category averages by joining with questions
  SELECT
    AVG(CASE WHEN q.category = 'KPI' THEN r.score END),
    AVG(CASE WHEN q.category = 'Admissions' THEN r.score END),
    AVG(CASE WHEN q.category = 'Patient Services' THEN r.score END),
    AVG(CASE WHEN q.category = 'Treatment Team' THEN r.score END),
    AVG(CASE WHEN q.category = 'Treatment Program' THEN r.score END),
    AVG(CASE WHEN q.category = 'Facility' THEN r.score END),
    AVG(r.score)
  INTO
    v_kpi_avg,
    v_admissions_avg,
    v_patient_services_avg,
    v_treatment_team_avg,
    v_treatment_program_avg,
    v_facility_avg,
    v_overall_avg
  FROM exit_survey_responses r
  JOIN exit_survey_questions q ON q.id = r.question_id
  WHERE r.submission_id = v_submission_id
    AND r.score IS NOT NULL
    AND q.type = 'scored';

  -- Update the submission with computed averages
  UPDATE exit_survey_submissions
  SET
    kpi_avg = v_kpi_avg,
    admissions_avg = v_admissions_avg,
    patient_services_avg = v_patient_services_avg,
    treatment_team_avg = v_treatment_team_avg,
    treatment_program_avg = v_treatment_program_avg,
    facility_avg = v_facility_avg,
    overall_average = v_overall_avg
  WHERE id = v_submission_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_calculate_submission_averages
  AFTER INSERT OR UPDATE ON exit_survey_responses
  FOR EACH ROW EXECUTE FUNCTION calculate_submission_averages();

-- ============================================================
-- Trigger 2: Create low-score alert after response insert
-- ============================================================
CREATE OR REPLACE FUNCTION create_low_score_alert()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_threshold INTEGER;
  v_owner_email TEXT;
  v_priority TEXT;
  v_threshold_setting TEXT;
BEGIN
  -- Only fire on INSERT, only for scored questions
  IF TG_OP != 'INSERT' OR NEW.score IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get company_id from the submission
  SELECT company_id INTO v_company_id
  FROM exit_survey_submissions
  WHERE id = NEW.submission_id;

  -- Get alert threshold from settings (default 3)
  SELECT value INTO v_threshold_setting
  FROM exit_survey_settings
  WHERE company_id = v_company_id AND key = 'alert_threshold';

  v_threshold := COALESCE(v_threshold_setting::INTEGER, 3);

  -- Only create alert if score <= threshold
  IF NEW.score > v_threshold THEN
    RETURN NEW;
  END IF;

  -- Get question owner_email to verify it's set
  SELECT owner_email INTO v_owner_email
  FROM exit_survey_questions
  WHERE id = NEW.question_id;

  -- Only create alert if question has an owner email
  IF v_owner_email IS NULL OR v_owner_email = '' THEN
    RETURN NEW;
  END IF;

  -- Set priority based on score
  v_priority := CASE
    WHEN NEW.score = 1 THEN 'high'
    WHEN NEW.score = 2 THEN 'normal'
    ELSE 'low'
  END;

  -- Insert the alert
  INSERT INTO exit_survey_alerts (
    company_id,
    submission_id,
    question_id,
    score,
    status,
    priority
  ) VALUES (
    v_company_id,
    NEW.submission_id,
    NEW.question_id,
    NEW.score,
    'pending',
    v_priority
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_low_score_alert
  AFTER INSERT ON exit_survey_responses
  FOR EACH ROW EXECUTE FUNCTION create_low_score_alert();
;
