-- Seed form fields for Forum Health Check (Generic)
INSERT INTO wf_form_fields (form_id, key, label, field_type, is_required, sort_order, help_text, options)
SELECT 
  f.id,
  field.key,
  field.label,
  field.field_type::wf_field_type,
  field.is_required,
  field.sort_order,
  field.help_text,
  field.options::jsonb
FROM wf_forms f
CROSS JOIN (VALUES
  ('overall_health', 'Overall Forum Health', 'rating', true, 0, 'Rate the overall health of your forum (1-10)', '{"min": 1, "max": 10}'),
  ('attendance_consistency', 'Attendance Consistency', 'rating', true, 1, 'How consistent is member attendance? (1-10)', '{"min": 1, "max": 10}'),
  ('engagement_level', 'Engagement Level', 'rating', true, 2, 'How engaged are members during sessions? (1-10)', '{"min": 1, "max": 10}'),
  ('trust_vulnerability', 'Trust & Vulnerability', 'rating', true, 3, 'Level of trust and vulnerability in discussions (1-10)', '{"min": 1, "max": 10}'),
  ('accountability', 'Accountability', 'rating', true, 4, 'How well do members hold each other accountable? (1-10)', '{"min": 1, "max": 10}'),
  ('value_received', 'Value Received', 'rating', true, 5, 'Members feel they receive value from the forum (1-10)', '{"min": 1, "max": 10}'),
  ('meeting_quality', 'Meeting Quality', 'rating', true, 6, 'Quality of forum meeting facilitation (1-10)', '{"min": 1, "max": 10}'),
  ('challenges', 'Current Challenges', 'long_text', false, 7, 'What challenges is the forum currently facing?', null),
  ('wins', 'Recent Wins', 'long_text', false, 8, 'What wins or successes has the forum celebrated recently?', null),
  ('improvement_areas', 'Areas for Improvement', 'long_text', false, 9, 'What areas need improvement?', null),
  ('support_needed', 'Support Needed', 'long_text', false, 10, 'What support does the forum need from leadership?', null),
  ('additional_comments', 'Additional Comments', 'long_text', false, 11, 'Any other observations or comments', null)
) AS field(key, label, field_type, is_required, sort_order, help_text, options)
WHERE f.template_key = 'generic_forum_health_check'
ON CONFLICT DO NOTHING;

-- Seed form fields for Forum Health Check (Convene)
INSERT INTO wf_form_fields (form_id, key, label, field_type, is_required, sort_order, help_text, options)
SELECT 
  f.id,
  field.key,
  field.label,
  field.field_type::wf_field_type,
  field.is_required,
  field.sort_order,
  field.help_text,
  field.options::jsonb
FROM wf_forms f
CROSS JOIN (VALUES
  ('overall_health', 'Overall Forum Health', 'rating', true, 0, 'Rate the overall health of your forum (1-10)', '{"min": 1, "max": 10}'),
  ('attendance_consistency', 'Attendance Consistency', 'rating', true, 1, 'How consistent is member attendance? (1-10)', '{"min": 1, "max": 10}'),
  ('engagement_level', 'Engagement Level', 'rating', true, 2, 'How engaged are members during sessions? (1-10)', '{"min": 1, "max": 10}'),
  ('trust_vulnerability', 'Trust & Vulnerability', 'rating', true, 3, 'Level of trust and vulnerability in discussions (1-10)', '{"min": 1, "max": 10}'),
  ('accountability', 'Accountability', 'rating', true, 4, 'How well do members hold each other accountable? (1-10)', '{"min": 1, "max": 10}'),
  ('value_received', 'Value Received', 'rating', true, 5, 'Members feel they receive value from the forum (1-10)', '{"min": 1, "max": 10}'),
  ('meeting_quality', 'Meeting Quality', 'rating', true, 6, 'Quality of forum meeting facilitation (1-10)', '{"min": 1, "max": 10}'),
  ('challenges', 'Current Challenges', 'long_text', false, 7, 'What challenges is the forum currently facing?', null),
  ('wins', 'Recent Wins', 'long_text', false, 8, 'What wins or successes has the forum celebrated recently?', null),
  ('improvement_areas', 'Areas for Improvement', 'long_text', false, 9, 'What areas need improvement?', null),
  ('support_needed', 'Support Needed', 'long_text', false, 10, 'What support does the forum need from leadership?', null),
  ('additional_comments', 'Additional Comments', 'long_text', false, 11, 'Any other observations or comments', null)
) AS field(key, label, field_type, is_required, sort_order, help_text, options)
WHERE f.template_key = 'convene_forum_health_check'
ON CONFLICT DO NOTHING;

-- Seed form fields for Member Covenant (Generic)
INSERT INTO wf_form_fields (form_id, key, label, field_type, is_required, sort_order, help_text, options)
SELECT 
  f.id,
  field.key,
  field.label,
  field.field_type::wf_field_type,
  field.is_required,
  field.sort_order,
  field.help_text,
  field.options::jsonb
FROM wf_forms f
CROSS JOIN (VALUES
  ('member_name', 'Full Name', 'short_text', true, 0, 'Your full legal name', null),
  ('company_name', 'Company Name', 'short_text', true, 1, 'Your company or organization name', null),
  ('title', 'Title/Role', 'short_text', false, 2, 'Your title or role', null),
  ('email', 'Email', 'email', true, 3, 'Your email address', null),
  ('phone', 'Phone', 'phone', false, 4, 'Your phone number', null),
  ('commitment_attendance', 'Attendance Commitment', 'yes_no', true, 5, 'I commit to attending all scheduled meetings', null),
  ('commitment_confidentiality', 'Confidentiality Commitment', 'yes_no', true, 6, 'I commit to keeping all discussions confidential', null),
  ('commitment_participation', 'Participation Commitment', 'yes_no', true, 7, 'I commit to actively participating in discussions', null),
  ('commitment_accountability', 'Accountability Commitment', 'yes_no', true, 8, 'I commit to holding myself and others accountable', null),
  ('commitment_growth', 'Growth Commitment', 'yes_no', true, 9, 'I commit to personal and professional growth', null),
  ('signature', 'Digital Signature', 'short_text', true, 10, 'Type your full name as your digital signature', null),
  ('signature_date', 'Date', 'date', true, 11, 'Date of signature', null)
) AS field(key, label, field_type, is_required, sort_order, help_text, options)
WHERE f.template_key = 'generic_member_covenant'
ON CONFLICT DO NOTHING;

-- Seed form fields for Member Covenant (Convene)
INSERT INTO wf_form_fields (form_id, key, label, field_type, is_required, sort_order, help_text, options)
SELECT 
  f.id,
  field.key,
  field.label,
  field.field_type::wf_field_type,
  field.is_required,
  field.sort_order,
  field.help_text,
  field.options::jsonb
FROM wf_forms f
CROSS JOIN (VALUES
  ('member_name', 'Full Name', 'short_text', true, 0, 'Your full legal name', null),
  ('company_name', 'Company Name', 'short_text', true, 1, 'Your company or organization name', null),
  ('title', 'Title/Role', 'short_text', false, 2, 'Your title or role', null),
  ('email', 'Email', 'email', true, 3, 'Your email address', null),
  ('phone', 'Phone', 'phone', false, 4, 'Your phone number', null),
  ('commitment_attendance', 'Attendance Commitment', 'yes_no', true, 5, 'I commit to attending all scheduled meetings', null),
  ('commitment_confidentiality', 'Confidentiality Commitment', 'yes_no', true, 6, 'I commit to keeping all discussions confidential', null),
  ('commitment_participation', 'Participation Commitment', 'yes_no', true, 7, 'I commit to actively participating in discussions', null),
  ('commitment_accountability', 'Accountability Commitment', 'yes_no', true, 8, 'I commit to holding myself and others accountable', null),
  ('commitment_growth', 'Growth Commitment', 'yes_no', true, 9, 'I commit to personal and professional growth', null),
  ('signature', 'Digital Signature', 'short_text', true, 10, 'Type your full name as your digital signature', null),
  ('signature_date', 'Date', 'date', true, 11, 'Date of signature', null)
) AS field(key, label, field_type, is_required, sort_order, help_text, options)
WHERE f.template_key = 'convene_member_covenant'
ON CONFLICT DO NOTHING;

-- Seed form fields for Chair Covenant (Generic)
INSERT INTO wf_form_fields (form_id, key, label, field_type, is_required, sort_order, help_text, options)
SELECT 
  f.id,
  field.key,
  field.label,
  field.field_type::wf_field_type,
  field.is_required,
  field.sort_order,
  field.help_text,
  field.options::jsonb
FROM wf_forms f
CROSS JOIN (VALUES
  ('chair_name', 'Full Name', 'short_text', true, 0, 'Your full legal name', null),
  ('email', 'Email', 'email', true, 1, 'Your email address', null),
  ('phone', 'Phone', 'phone', false, 2, 'Your phone number', null),
  ('commitment_facilitation', 'Facilitation Commitment', 'yes_no', true, 3, 'I commit to facilitating meetings with excellence', null),
  ('commitment_preparation', 'Preparation Commitment', 'yes_no', true, 4, 'I commit to thorough preparation for each meeting', null),
  ('commitment_member_care', 'Member Care Commitment', 'yes_no', true, 5, 'I commit to caring for and supporting each member', null),
  ('commitment_confidentiality', 'Confidentiality Commitment', 'yes_no', true, 6, 'I commit to maintaining strict confidentiality', null),
  ('commitment_training', 'Training Commitment', 'yes_no', true, 7, 'I commit to ongoing chair training and development', null),
  ('commitment_reporting', 'Reporting Commitment', 'yes_no', true, 8, 'I commit to timely reporting and communication', null),
  ('signature', 'Digital Signature', 'short_text', true, 9, 'Type your full name as your digital signature', null),
  ('signature_date', 'Date', 'date', true, 10, 'Date of signature', null)
) AS field(key, label, field_type, is_required, sort_order, help_text, options)
WHERE f.template_key = 'generic_chair_covenant'
ON CONFLICT DO NOTHING;

-- Seed form fields for Chair Covenant (Convene)
INSERT INTO wf_form_fields (form_id, key, label, field_type, is_required, sort_order, help_text, options)
SELECT 
  f.id,
  field.key,
  field.label,
  field.field_type::wf_field_type,
  field.is_required,
  field.sort_order,
  field.help_text,
  field.options::jsonb
FROM wf_forms f
CROSS JOIN (VALUES
  ('chair_name', 'Full Name', 'short_text', true, 0, 'Your full legal name', null),
  ('email', 'Email', 'email', true, 1, 'Your email address', null),
  ('phone', 'Phone', 'phone', false, 2, 'Your phone number', null),
  ('commitment_facilitation', 'Facilitation Commitment', 'yes_no', true, 3, 'I commit to facilitating meetings with excellence', null),
  ('commitment_preparation', 'Preparation Commitment', 'yes_no', true, 4, 'I commit to thorough preparation for each meeting', null),
  ('commitment_member_care', 'Member Care Commitment', 'yes_no', true, 5, 'I commit to caring for and supporting each member', null),
  ('commitment_confidentiality', 'Confidentiality Commitment', 'yes_no', true, 6, 'I commit to maintaining strict confidentiality', null),
  ('commitment_training', 'Training Commitment', 'yes_no', true, 7, 'I commit to ongoing chair training and development', null),
  ('commitment_reporting', 'Reporting Commitment', 'yes_no', true, 8, 'I commit to timely reporting and communication', null),
  ('signature', 'Digital Signature', 'short_text', true, 9, 'Type your full name as your digital signature', null),
  ('signature_date', 'Date', 'date', true, 10, 'Date of signature', null)
) AS field(key, label, field_type, is_required, sort_order, help_text, options)
WHERE f.template_key = 'convene_chair_covenant'
ON CONFLICT DO NOTHING;