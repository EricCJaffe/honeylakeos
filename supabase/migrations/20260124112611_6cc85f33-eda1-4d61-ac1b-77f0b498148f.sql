-- Seed form fields for Annual Goals Portfolio (Generic)
INSERT INTO wf_form_fields (form_id, key, label, field_type, is_required, sort_order, help_text, options)
SELECT 
  f.id, field.key, field.label, field.field_type::wf_field_type, field.is_required, field.sort_order, field.help_text, field.options::jsonb
FROM wf_forms f
CROSS JOIN (VALUES
  ('year', 'Year', 'number', true, 0, 'What year are these goals for?', null),
  ('vision', 'Annual Vision', 'long_text', true, 1, 'What is your vision for this year?', null),
  ('revenue_goal', 'Revenue Goal', 'short_text', true, 2, 'What is your revenue goal?', null),
  ('profit_goal', 'Profit Goal', 'short_text', false, 3, 'What is your profit goal?', null),
  ('goal_1', 'Top Priority Goal #1', 'long_text', true, 4, 'Your most important goal for the year', null),
  ('goal_2', 'Top Priority Goal #2', 'long_text', true, 5, 'Your second priority goal', null),
  ('goal_3', 'Top Priority Goal #3', 'long_text', true, 6, 'Your third priority goal', null),
  ('personal_goals', 'Personal Goals', 'long_text', false, 7, 'What personal goals do you have for this year?', null),
  ('key_initiatives', 'Key Initiatives', 'long_text', true, 8, 'What key initiatives will drive these goals?', null),
  ('potential_obstacles', 'Potential Obstacles', 'long_text', false, 9, 'What obstacles might you face?', null),
  ('support_needed', 'Support Needed', 'long_text', false, 10, 'What support do you need to achieve these goals?', null)
) AS field(key, label, field_type, is_required, sort_order, help_text, options)
WHERE f.template_key = 'generic_annual_goals_portfolio'
ON CONFLICT DO NOTHING;

-- Seed form fields for Executive Briefing (Generic)
INSERT INTO wf_form_fields (form_id, key, label, field_type, is_required, sort_order, help_text, options)
SELECT 
  f.id, field.key, field.label, field.field_type::wf_field_type, field.is_required, field.sort_order, field.help_text, field.options::jsonb
FROM wf_forms f
CROSS JOIN (VALUES
  ('company_name', 'Company Name', 'short_text', true, 0, 'Your company name', null),
  ('executive_name', 'Executive Name', 'short_text', true, 1, 'Your name', null),
  ('briefing_date', 'Briefing Date', 'date', true, 2, 'Date of this briefing', null),
  ('company_overview', 'Company Overview', 'long_text', true, 3, 'Brief overview of your company', null),
  ('current_revenue', 'Current Revenue', 'short_text', true, 4, 'Current annual revenue', null),
  ('employee_count', 'Employee Count', 'number', true, 5, 'Number of employees', null),
  ('key_products_services', 'Key Products/Services', 'long_text', true, 6, 'Your main products or services', null),
  ('target_market', 'Target Market', 'long_text', true, 7, 'Who is your target market?', null),
  ('competitive_advantage', 'Competitive Advantage', 'long_text', true, 8, 'What makes you different?', null),
  ('current_challenges', 'Current Challenges', 'long_text', true, 9, 'What challenges are you facing?', null),
  ('strategic_priorities', 'Strategic Priorities', 'long_text', true, 10, 'What are your top strategic priorities?', null),
  ('discussion_topics', 'Discussion Topics', 'long_text', true, 11, 'What topics would you like to discuss with the group?', null)
) AS field(key, label, field_type, is_required, sort_order, help_text, options)
WHERE f.template_key = 'generic_executive_briefing'
ON CONFLICT DO NOTHING;

-- Seed form fields for Monthly Check-in (Generic)
INSERT INTO wf_form_fields (form_id, key, label, field_type, is_required, sort_order, help_text, options)
SELECT 
  f.id, field.key, field.label, field.field_type::wf_field_type, field.is_required, field.sort_order, field.help_text, field.options::jsonb
FROM wf_forms f
CROSS JOIN (VALUES
  ('month', 'Month', 'dropdown', true, 0, 'Which month?', '{"options": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]}'),
  ('year', 'Year', 'number', true, 1, 'Year', null),
  ('overall_progress', 'Overall Progress', 'rating', true, 2, 'Rate your overall progress this month (1-10)', '{"min": 1, "max": 10}'),
  ('accomplishments', 'Key Accomplishments', 'long_text', true, 3, 'What did you accomplish this month?', null),
  ('challenges', 'Challenges Faced', 'long_text', false, 4, 'What challenges did you face?', null),
  ('lessons_learned', 'Lessons Learned', 'long_text', false, 5, 'What lessons did you learn?', null),
  ('next_month_focus', 'Next Month Focus', 'long_text', true, 6, 'What will you focus on next month?', null),
  ('support_needed', 'Support Needed', 'long_text', false, 7, 'What support do you need?', null),
  ('personal_wellbeing', 'Personal Wellbeing', 'rating', false, 8, 'How is your personal wellbeing? (1-10)', '{"min": 1, "max": 10}')
) AS field(key, label, field_type, is_required, sort_order, help_text, options)
WHERE f.template_key = 'generic_monthly_checkin'
ON CONFLICT DO NOTHING;

-- Seed form fields for Weekly Report (Generic)
INSERT INTO wf_form_fields (form_id, key, label, field_type, is_required, sort_order, help_text, options)
SELECT 
  f.id, field.key, field.label, field.field_type::wf_field_type, field.is_required, field.sort_order, field.help_text, field.options::jsonb
FROM wf_forms f
CROSS JOIN (VALUES
  ('week_ending', 'Week Ending', 'date', true, 0, 'Date the week ends', null),
  ('wins', 'This Week''s Wins', 'long_text', true, 1, 'What wins did you have this week?', null),
  ('challenges', 'Challenges', 'long_text', false, 2, 'What challenges did you face?', null),
  ('priorities_completed', 'Priorities Completed', 'long_text', true, 3, 'Which priorities did you complete?', null),
  ('priorities_next_week', 'Next Week''s Priorities', 'long_text', true, 4, 'What are your priorities for next week?', null),
  ('blockers', 'Blockers', 'long_text', false, 5, 'Are there any blockers you need help with?', null),
  ('notes', 'Additional Notes', 'long_text', false, 6, 'Any other notes or updates', null)
) AS field(key, label, field_type, is_required, sort_order, help_text, options)
WHERE f.template_key = 'generic_weekly_report'
ON CONFLICT DO NOTHING;

-- Seed form fields for Pre-Meeting Survey (Generic)
INSERT INTO wf_form_fields (form_id, key, label, field_type, is_required, sort_order, help_text, options)
SELECT 
  f.id, field.key, field.label, field.field_type::wf_field_type, field.is_required, field.sort_order, field.help_text, field.options::jsonb
FROM wf_forms f
CROSS JOIN (VALUES
  ('member_name', 'Your Name', 'short_text', true, 0, 'Your name', null),
  ('meeting_date', 'Meeting Date', 'date', true, 1, 'Date of the upcoming meeting', null),
  ('topics_to_discuss', 'Topics to Discuss', 'long_text', true, 2, 'What topics would you like to discuss?', null),
  ('recent_wins', 'Recent Wins', 'long_text', false, 3, 'Share any recent wins', null),
  ('current_challenges', 'Current Challenges', 'long_text', true, 4, 'What challenges are you facing?', null),
  ('accountability_update', 'Accountability Update', 'long_text', false, 5, 'Update on previous commitments', null),
  ('questions_for_group', 'Questions for the Group', 'long_text', false, 6, 'Any specific questions for the group?', null),
  ('energy_level', 'Current Energy Level', 'rating', false, 7, 'How is your energy level? (1-10)', '{"min": 1, "max": 10}')
) AS field(key, label, field_type, is_required, sort_order, help_text, options)
WHERE f.template_key = 'generic_pre_meeting_survey'
ON CONFLICT DO NOTHING;

-- Seed form fields for Session Prep (Generic)
INSERT INTO wf_form_fields (form_id, key, label, field_type, is_required, sort_order, help_text, options)
SELECT 
  f.id, field.key, field.label, field.field_type::wf_field_type, field.is_required, field.sort_order, field.help_text, field.options::jsonb
FROM wf_forms f
CROSS JOIN (VALUES
  ('session_date', 'Session Date', 'date', true, 0, 'Date of the session', null),
  ('session_topic', 'Session Topic', 'short_text', true, 1, 'Main topic for this session', null),
  ('preparation_notes', 'Preparation Notes', 'long_text', true, 2, 'Notes you have prepared for this session', null),
  ('key_questions', 'Key Questions', 'long_text', true, 3, 'Key questions you want to explore', null),
  ('desired_outcomes', 'Desired Outcomes', 'long_text', true, 4, 'What outcomes do you want from this session?', null),
  ('background_context', 'Background Context', 'long_text', false, 5, 'Any background context the group should know', null),
  ('supporting_materials', 'Supporting Materials', 'long_text', false, 6, 'Any materials you will share', null),
  ('time_requested', 'Time Requested', 'number', false, 7, 'Minutes requested for your topic', null)
) AS field(key, label, field_type, is_required, sort_order, help_text, options)
WHERE f.template_key = 'generic_session_prep'
ON CONFLICT DO NOTHING;