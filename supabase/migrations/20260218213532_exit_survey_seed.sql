
-- Exit Survey Module: Seed Data for Honey Lake Clinic
-- company_id: 9ea3677d-be6c-46df-a41c-d22f01e88756

DO $$
DECLARE
  v_company_id UUID := '9ea3677d-be6c-46df-a41c-d22f01e88756';
  v_definition_id UUID;
BEGIN

  -- 1. Create survey definition
  INSERT INTO exit_survey_definitions (company_id, name, version, is_active)
  VALUES (v_company_id, 'Honey Lake Clinic Exit Survey v1', 1, true)
  ON CONFLICT (company_id, version) DO UPDATE SET is_active = true
  RETURNING id INTO v_definition_id;

  IF v_definition_id IS NULL THEN
    SELECT id INTO v_definition_id
    FROM exit_survey_definitions
    WHERE company_id = v_company_id AND version = 1;
  END IF;

  -- 2. Seed the 28 questions (26 scored + 2 open-ended)
  -- Delete existing to re-seed cleanly (idempotent)
  DELETE FROM exit_survey_questions WHERE company_id = v_company_id AND definition_id = v_definition_id;

  INSERT INTO exit_survey_questions
    (company_id, definition_id, question_number, text, category, type, department, owner_name, owner_email, display_order, version)
  VALUES
    -- KPI Questions (Q1-Q2)
    (v_company_id, v_definition_id, 1,
     'Would you recommend Honey Lake Clinic to a friend or loved one who was seeking treatment?',
     'KPI', 'scored', 'Administration', 'Admin Team', 'admin@honeylake.clinic', 1, 1),
    (v_company_id, v_definition_id, 2,
     'Do you feel better today than you did when you arrived?',
     'KPI', 'scored', 'Administration', 'Admin Team', 'admin@honeylake.clinic', 2, 1),

    -- Admissions (Q3)
    (v_company_id, v_definition_id, 3,
     'The admissions process was smooth and welcoming.',
     'Admissions', 'scored', 'Admissions', 'Admissions Director', 'admissions@honeylake.clinic', 3, 1),

    -- Patient Services (Q4-Q7)
    (v_company_id, v_definition_id, 4,
     'The nursing staff was caring and professional.',
     'Patient Services', 'scored', 'Nursing', 'Director of Nursing', 'nursing@honeylake.clinic', 4, 1),
    (v_company_id, v_definition_id, 5,
     'Medical staff addressed my health needs promptly.',
     'Patient Services', 'scored', 'Medical', 'Medical Director', 'medical@honeylake.clinic', 5, 1),
    (v_company_id, v_definition_id, 6,
     'I felt safe and secure throughout my stay.',
     'Patient Services', 'scored', 'Patient Services', 'Patient Services Director', 'patientservices@honeylake.clinic', 6, 1),
    (v_company_id, v_definition_id, 7,
     'The food quality and dining experience met my expectations.',
     'Patient Services', 'scored', 'Food Services', 'Food Services Manager', 'food@honeylake.clinic', 7, 1),

    -- Treatment Team (Q8-Q18)
    (v_company_id, v_definition_id, 8,
     'My psychiatrist / psychiatric provider was helpful and attentive.',
     'Treatment Team', 'scored', 'Psychiatry', 'Chief Psychiatrist', 'psychiatry@honeylake.clinic', 8, 1),
    (v_company_id, v_definition_id, 9,
     'My primary therapist helped me understand and work through my issues.',
     'Treatment Team', 'scored', 'Therapy', 'Clinical Director', 'therapy@honeylake.clinic', 9, 1),
    (v_company_id, v_definition_id, 10,
     'My case manager kept me informed and assisted with discharge planning.',
     'Treatment Team', 'scored', 'Case Management', 'Case Management Director', 'casemanagement@honeylake.clinic', 10, 1),
    (v_company_id, v_definition_id, 11,
     'Group therapy sessions were beneficial to my recovery.',
     'Treatment Team', 'scored', 'Therapy', 'Clinical Director', 'therapy@honeylake.clinic', 11, 1),
    (v_company_id, v_definition_id, 12,
     'I felt heard and respected by my treatment team.',
     'Treatment Team', 'scored', 'Therapy', 'Clinical Director', 'therapy@honeylake.clinic', 12, 1),
    (v_company_id, v_definition_id, 13,
     'My treatment plan was individualized to meet my specific needs.',
     'Treatment Team', 'scored', 'Therapy', 'Clinical Director', 'therapy@honeylake.clinic', 13, 1),
    (v_company_id, v_definition_id, 14,
     'Family therapy / family involvement was handled well.',
     'Treatment Team', 'scored', 'Therapy', 'Clinical Director', 'therapy@honeylake.clinic', 14, 1),
    (v_company_id, v_definition_id, 15,
     'I received adequate education about my diagnosis and treatment.',
     'Treatment Team', 'scored', 'Therapy', 'Clinical Director', 'therapy@honeylake.clinic', 15, 1),
    (v_company_id, v_definition_id, 16,
     'I have a clear discharge plan and know my next steps.',
     'Treatment Team', 'scored', 'Case Management', 'Case Management Director', 'casemanagement@honeylake.clinic', 16, 1),
    (v_company_id, v_definition_id, 17,
     'My spiritual and pastoral needs were addressed during my stay.',
     'Treatment Team', 'scored', 'Pastoral', 'Pastoral Care Director', 'pastoral@honeylake.clinic', 17, 1),
    (v_company_id, v_definition_id, 18,
     'The recreational and experiential therapies were valuable to my recovery.',
     'Treatment Team', 'scored', 'Experiential', 'Experiential Director', 'experiential@honeylake.clinic', 18, 1),

    -- Treatment Program (Q19-Q20)
    (v_company_id, v_definition_id, 19,
     'The overall treatment program met my expectations.',
     'Treatment Program', 'scored', 'Administration', 'Clinical Director', 'therapy@honeylake.clinic', 19, 1),
    (v_company_id, v_definition_id, 20,
     'I feel equipped with the tools I need for continued recovery.',
     'Treatment Program', 'scored', 'Administration', 'Clinical Director', 'therapy@honeylake.clinic', 20, 1),

    -- Facility (Q21-Q26)
    (v_company_id, v_definition_id, 21,
     'The facility was clean and well-maintained.',
     'Facility', 'scored', 'Facilities', 'Facilities Manager', 'facilities@honeylake.clinic', 21, 1),
    (v_company_id, v_definition_id, 22,
     'My room was comfortable and conducive to healing.',
     'Facility', 'scored', 'Facilities', 'Facilities Manager', 'facilities@honeylake.clinic', 22, 1),
    (v_company_id, v_definition_id, 23,
     'The outdoor spaces and grounds enhanced my recovery experience.',
     'Facility', 'scored', 'Facilities', 'Facilities Manager', 'facilities@honeylake.clinic', 23, 1),
    (v_company_id, v_definition_id, 24,
     'Common areas (lounges, meeting rooms) were appropriate and available.',
     'Facility', 'scored', 'Facilities', 'Facilities Manager', 'facilities@honeylake.clinic', 24, 1),
    (v_company_id, v_definition_id, 25,
     'The overall atmosphere of the facility supported my healing.',
     'Facility', 'scored', 'Facilities', 'Facilities Manager', 'facilities@honeylake.clinic', 25, 1),
    (v_company_id, v_definition_id, 26,
     'Laundry, housekeeping, and personal care services met my needs.',
     'Facility', 'scored', 'Facilities', 'Facilities Manager', 'facilities@honeylake.clinic', 26, 1),

    -- Open-ended (Q27-Q28)
    (v_company_id, v_definition_id, 27,
     'What could we improve to better serve future patients?',
     'General', 'open_ended', NULL, NULL, NULL, 27, 1),
    (v_company_id, v_definition_id, 28,
     'What did we do particularly well during your stay?',
     'General', 'open_ended', NULL, NULL, NULL, 28, 1);

  -- 3. Default settings
  INSERT INTO exit_survey_settings (company_id, key, value, category)
  VALUES
    (v_company_id, 'alert_threshold', '3', 'alerts'),
    (v_company_id, 'anonymity', 'false', 'privacy'),
    (v_company_id, 'email_notifications', 'true', 'notifications'),
    (v_company_id, 'report_schedule', 'monthly', 'reports')
  ON CONFLICT (company_id, key) DO UPDATE SET value = EXCLUDED.value;

END $$;
;
