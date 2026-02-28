-- Seed form fields for Chair Readiness Assessment (Generic & Convene)
INSERT INTO wf_form_fields (form_id, key, label, field_type, is_required, sort_order, help_text, options)
SELECT 
  f.id, field.key, field.label, field.field_type::wf_field_type, field.is_required, field.sort_order, field.help_text, field.options::jsonb
FROM wf_forms f
CROSS JOIN (VALUES
  ('candidate_name', 'Candidate Name', 'short_text', true, 0, 'Full name of chair candidate', null),
  ('email', 'Email', 'email', true, 1, 'Email address', null),
  ('phone', 'Phone', 'phone', false, 2, 'Phone number', null),
  ('years_experience', 'Years of Business Experience', 'number', true, 3, 'Total years in business leadership', null),
  ('leadership_roles', 'Previous Leadership Roles', 'long_text', true, 4, 'Describe your leadership experience', null),
  ('facilitation_experience', 'Facilitation Experience', 'long_text', false, 5, 'Describe any facilitation or group leadership experience', null),
  ('why_chair', 'Why Do You Want to Be a Chair?', 'long_text', true, 6, 'What motivates you to become a chair?', null),
  ('time_commitment', 'Time Commitment', 'yes_no', true, 7, 'Can you commit 15-20 hours per month to this role?', null),
  ('travel_willingness', 'Willingness to Travel', 'yes_no', true, 8, 'Are you willing to travel for training and meetings?', null),
  ('strengths', 'Key Strengths', 'long_text', true, 9, 'What strengths would you bring to this role?', null),
  ('development_areas', 'Areas for Development', 'long_text', false, 10, 'What areas would you like to develop?', null),
  ('references', 'Professional References', 'long_text', true, 11, 'List 2-3 professional references with contact information', null)
) AS field(key, label, field_type, is_required, sort_order, help_text, options)
WHERE f.template_key IN ('generic_chair_readiness_assessment', 'convene_chair_readiness_assessment')
ON CONFLICT DO NOTHING;
-- Seed form fields for Forum Prework (Generic & Convene)
INSERT INTO wf_form_fields (form_id, key, label, field_type, is_required, sort_order, help_text, options)
SELECT 
  f.id, field.key, field.label, field.field_type::wf_field_type, field.is_required, field.sort_order, field.help_text, field.options::jsonb
FROM wf_forms f
CROSS JOIN (VALUES
  ('member_name', 'Your Name', 'short_text', true, 0, 'Your name', null),
  ('current_focus', 'Current Business Focus', 'long_text', true, 1, 'What are you currently focused on in your business?', null),
  ('wins', 'Recent Wins', 'long_text', false, 2, 'Share any recent wins or successes', null),
  ('challenges', 'Current Challenges', 'long_text', true, 3, 'What challenges are you facing?', null),
  ('discussion_topic', 'Topic for Discussion', 'long_text', true, 4, 'What topic would you like the group to help you with?', null),
  ('specific_questions', 'Specific Questions', 'long_text', false, 5, 'What specific questions do you have for the group?', null),
  ('accountability_update', 'Accountability Update', 'long_text', false, 6, 'Update on commitments from last meeting', null),
  ('personal_update', 'Personal Update', 'long_text', false, 7, 'Any personal updates to share with the group?', null)
) AS field(key, label, field_type, is_required, sort_order, help_text, options)
WHERE f.template_key IN ('generic_forum_prework', 'convene_forum_prework')
ON CONFLICT DO NOTHING;
-- Seed form fields for Forum Summary (Generic & Convene)
INSERT INTO wf_form_fields (form_id, key, label, field_type, is_required, sort_order, help_text, options)
SELECT 
  f.id, field.key, field.label, field.field_type::wf_field_type, field.is_required, field.sort_order, field.help_text, field.options::jsonb
FROM wf_forms f
CROSS JOIN (VALUES
  ('meeting_date', 'Meeting Date', 'date', true, 0, 'Date of the forum meeting', null),
  ('attendees', 'Attendees', 'long_text', true, 1, 'List all members who attended', null),
  ('topics_discussed', 'Topics Discussed', 'long_text', true, 2, 'Summary of topics discussed', null),
  ('key_insights', 'Key Insights', 'long_text', true, 3, 'What were the key insights from the meeting?', null),
  ('action_items', 'Action Items', 'long_text', true, 4, 'What action items were assigned?', null),
  ('member_commitments', 'Member Commitments', 'long_text', false, 5, 'What commitments did members make?', null),
  ('next_meeting_date', 'Next Meeting Date', 'date', false, 6, 'Date of next scheduled meeting', null),
  ('chair_notes', 'Chair Notes', 'long_text', false, 7, 'Additional notes from the chair', null)
) AS field(key, label, field_type, is_required, sort_order, help_text, options)
WHERE f.template_key IN ('generic_forum_summary', 'convene_forum_summary')
ON CONFLICT DO NOTHING;
-- Seed form fields for Quarterly Review (Generic & Convene)
INSERT INTO wf_form_fields (form_id, key, label, field_type, is_required, sort_order, help_text, options)
SELECT 
  f.id, field.key, field.label, field.field_type::wf_field_type, field.is_required, field.sort_order, field.help_text, field.options::jsonb
FROM wf_forms f
CROSS JOIN (VALUES
  ('quarter', 'Quarter', 'dropdown', true, 0, 'Which quarter is this review for?', '{"options": ["Q1", "Q2", "Q3", "Q4"]}'),
  ('year', 'Year', 'number', true, 1, 'Year', null),
  ('goals_achieved', 'Goals Achieved', 'long_text', true, 2, 'What goals did you achieve this quarter?', null),
  ('goals_missed', 'Goals Not Achieved', 'long_text', false, 3, 'What goals did you not achieve? Why?', null),
  ('key_metrics', 'Key Metrics', 'long_text', true, 4, 'Report on your key business metrics', null),
  ('lessons_learned', 'Lessons Learned', 'long_text', true, 5, 'What lessons did you learn this quarter?', null),
  ('next_quarter_goals', 'Next Quarter Goals', 'long_text', true, 6, 'What are your goals for next quarter?', null),
  ('support_needed', 'Support Needed', 'long_text', false, 7, 'What support do you need from your forum?', null),
  ('overall_satisfaction', 'Overall Satisfaction', 'rating', true, 8, 'How satisfied are you with this quarter? (1-10)', '{"min": 1, "max": 10}')
) AS field(key, label, field_type, is_required, sort_order, help_text, options)
WHERE f.template_key IN ('generic_quarterly_review', 'convene_quarterly_review')
ON CONFLICT DO NOTHING;
-- Seed form fields for Chair Application (Generic & Convene)
INSERT INTO wf_form_fields (form_id, key, label, field_type, is_required, sort_order, help_text, options)
SELECT 
  f.id, field.key, field.label, field.field_type::wf_field_type, field.is_required, field.sort_order, field.help_text, field.options::jsonb
FROM wf_forms f
CROSS JOIN (VALUES
  ('applicant_name', 'Full Name', 'short_text', true, 0, 'Your full legal name', null),
  ('email', 'Email', 'email', true, 1, 'Your email address', null),
  ('phone', 'Phone', 'phone', true, 2, 'Your phone number', null),
  ('company_name', 'Company Name', 'short_text', true, 3, 'Your company or organization', null),
  ('title', 'Title', 'short_text', true, 4, 'Your current title', null),
  ('years_in_role', 'Years in Current Role', 'number', true, 5, 'Years in your current position', null),
  ('industry', 'Industry', 'short_text', true, 6, 'Your industry', null),
  ('why_apply', 'Why Are You Applying?', 'long_text', true, 7, 'Why do you want to become a chair?', null),
  ('relevant_experience', 'Relevant Experience', 'long_text', true, 8, 'Describe relevant leadership and facilitation experience', null),
  ('availability', 'Availability', 'long_text', true, 9, 'Describe your availability for training and meetings', null),
  ('resume_summary', 'Resume Summary', 'long_text', true, 10, 'Brief summary of your professional background', null),
  ('references', 'References', 'long_text', true, 11, 'Provide 2-3 professional references', null)
) AS field(key, label, field_type, is_required, sort_order, help_text, options)
WHERE f.template_key IN ('generic_chair_application', 'convene_chair_application')
ON CONFLICT DO NOTHING;
