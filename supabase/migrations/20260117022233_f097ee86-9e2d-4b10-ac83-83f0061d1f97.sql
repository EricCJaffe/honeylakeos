-- ==========================================
-- EOS FRAMEWORK TEMPLATE v1 (System Template)
-- ==========================================

-- Create the EOS system framework
INSERT INTO public.frameworks (
  id,
  company_id,
  owner_type,
  owner_company_id,
  name,
  description,
  version_label,
  status,
  is_system_template,
  created_by
)
VALUES (
  '00000001-0000-0000-0000-000000000001',
  NULL,
  'system',
  NULL,
  'EOS-Inspired Framework',
  'A comprehensive operating system for running your organization, inspired by the Entrepreneurial Operating System. Includes core concepts like Vision, Rocks, Scorecard, Issues, and Level 10 Meetings. Clone and customize to fit your organization.',
  'v1',
  'published',
  true,
  NULL
);
-- ==========================================
-- EOS CONCEPTS (14 core concepts)
-- ==========================================
INSERT INTO public.framework_concepts (framework_id, key, display_name_singular, display_name_plural, description, sort_order, enabled)
VALUES
  ('00000001-0000-0000-0000-000000000001', 'vision', 'Vision', 'Vision', 'Your organization''s long-term vision and direction, including core values, core focus, and long-term targets.', 1, true),
  ('00000001-0000-0000-0000-000000000001', 'core_values', 'Core Value', 'Core Values', 'The fundamental beliefs that guide your organization''s culture and decision-making.', 2, true),
  ('00000001-0000-0000-0000-000000000001', 'core_focus', 'Core Focus', 'Core Focus', 'Your organization''s purpose/cause/passion and niche - what you do better than anyone.', 3, true),
  ('00000001-0000-0000-0000-000000000001', 'marketing_strategy', 'Marketing Strategy', 'Marketing Strategy', 'Your target market, uniques, proven process, and guarantee.', 4, true),
  ('00000001-0000-0000-0000-000000000001', 'ten_year_target', '10-Year Target', '10-Year Targets', 'A big, long-range, compelling goal for the organization.', 5, true),
  ('00000001-0000-0000-0000-000000000001', 'three_year_picture', '3-Year Picture', '3-Year Pictures', 'A vivid description of what your organization looks like in three years.', 6, true),
  ('00000001-0000-0000-0000-000000000001', 'one_year_plan', '1-Year Plan', '1-Year Plans', 'Specific goals and budget for the coming year.', 7, true),
  ('00000001-0000-0000-0000-000000000001', 'quarterly_priorities', 'Rock', 'Rocks', '90-day priorities that move your organization toward its vision. The 3-7 most important things to accomplish this quarter.', 8, true),
  ('00000001-0000-0000-0000-000000000001', 'scorecard', 'Measurable', 'Measurables', 'Weekly metrics that give you a pulse on your business. Numbers that tell you if you''re on track.', 9, true),
  ('00000001-0000-0000-0000-000000000001', 'issues', 'Issue', 'Issues', 'Problems, obstacles, ideas, and opportunities that need to be discussed and solved.', 10, true),
  ('00000001-0000-0000-0000-000000000001', 'meetings', 'Meeting', 'Meetings', 'Regular meeting rhythms including weekly Level 10s and quarterly/annual planning sessions.', 11, true),
  ('00000001-0000-0000-0000-000000000001', 'to_dos', 'To-Do', 'To-Dos', '7-day action items that move Rocks forward and keep commitments from meetings.', 12, true),
  ('00000001-0000-0000-0000-000000000001', 'people', 'Accountability', 'Accountability', 'Right people in right seats. The Accountability Chart defines roles and responsibilities.', 13, true),
  ('00000001-0000-0000-0000-000000000001', 'process', 'Process', 'Processes', 'Documented core processes that define the way things are done in your organization.', 14, true);
-- ==========================================
-- EOS CADENCES (5 meeting rhythms)
-- ==========================================
INSERT INTO public.framework_cadences (framework_id, key, display_name, frequency_type, interval_n, target_day_of_week, target_day_of_month, duration_minutes, default_owner_role_hint, sort_order, enabled)
VALUES
  ('00000001-0000-0000-0000-000000000001', 'weekly_leadership_meeting', 'Weekly Leadership Meeting', 'weekly', 1, 1, NULL, 90, 'leadership', 1, true),
  ('00000001-0000-0000-0000-000000000001', 'weekly_level10', 'Weekly Level 10', 'weekly', 1, 1, NULL, 90, NULL, 2, true),
  ('00000001-0000-0000-0000-000000000001', 'monthly_check_in', 'Monthly Check-in', 'monthly', 1, NULL, 1, 60, 'leadership', 3, true),
  ('00000001-0000-0000-0000-000000000001', 'quarterly_planning', 'Quarterly Planning', 'quarterly', 1, NULL, NULL, 480, 'leadership', 4, true),
  ('00000001-0000-0000-0000-000000000001', 'annual_planning', 'Annual Planning', 'annual', 1, NULL, NULL, 960, 'leadership', 5, true);
-- ==========================================
-- EOS TEMPLATES MAPPING (references to be linked after clone)
-- ==========================================
INSERT INTO public.framework_templates (framework_id, template_type, template_id, applies_to_concept_key, cadence_key, sort_order, enabled)
VALUES
  ('00000001-0000-0000-0000-000000000001', 'note', NULL, 'vision', NULL, 1, true),
  ('00000001-0000-0000-0000-000000000001', 'note', NULL, 'scorecard', 'weekly_level10', 2, true),
  ('00000001-0000-0000-0000-000000000001', 'note', NULL, NULL, 'quarterly_planning', 3, true),
  ('00000001-0000-0000-0000-000000000001', 'note', NULL, NULL, 'annual_planning', 4, true),
  ('00000001-0000-0000-0000-000000000001', 'note', NULL, 'issues', NULL, 5, true),
  ('00000001-0000-0000-0000-000000000001', 'document', NULL, 'people', NULL, 6, true),
  ('00000001-0000-0000-0000-000000000001', 'document', NULL, 'process', NULL, 7, true),
  ('00000001-0000-0000-0000-000000000001', 'project', NULL, 'quarterly_priorities', NULL, 8, true),
  ('00000001-0000-0000-0000-000000000001', 'task', NULL, 'to_dos', 'weekly_level10', 9, true),
  ('00000001-0000-0000-0000-000000000001', 'calendar_event', NULL, 'meetings', 'weekly_level10', 10, true),
  ('00000001-0000-0000-0000-000000000001', 'calendar_event', NULL, 'meetings', 'quarterly_planning', 11, true),
  ('00000001-0000-0000-0000-000000000001', 'lms_path', NULL, 'vision', NULL, 12, true);
-- ==========================================
-- EOS DASHBOARDS (3 audience-specific views)
-- ==========================================

-- Leadership Dashboard
INSERT INTO public.framework_dashboards (id, framework_id, key, display_name, audience, sort_order, enabled)
VALUES ('00000001-0001-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'leadership_dashboard', 'Leadership Dashboard', 'leadership', 1, true);
INSERT INTO public.framework_dashboard_sections (dashboard_id, section_key, display_name, data_source_type, config, sort_order, enabled)
VALUES
  ('00000001-0001-0000-0000-000000000001', 'quarterly_rocks_summary', 'Quarterly Rocks', 'projects', '{"filter": {"tag": "rock"}}', 1, true),
  ('00000001-0001-0000-0000-000000000001', 'scorecard_summary', 'Scorecard', 'custom_derived', '{"metric_key": "scorecard_trend"}', 2, true),
  ('00000001-0001-0000-0000-000000000001', 'open_issues', 'Open Issues', 'tasks', '{"filter": {"tag": "issue", "status": "open"}}', 3, true),
  ('00000001-0001-0000-0000-000000000001', 'upcoming_cadences', 'Upcoming Meetings', 'calendar', '{"days_ahead": 14}', 4, true),
  ('00000001-0001-0000-0000-000000000001', 'overdue_actions', 'Overdue To-Dos', 'tasks', '{"filter": {"overdue": true}}', 5, true);
-- Team Dashboard
INSERT INTO public.framework_dashboards (id, framework_id, key, display_name, audience, sort_order, enabled)
VALUES ('00000001-0002-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'team_dashboard', 'Team Dashboard', 'member', 2, true);
INSERT INTO public.framework_dashboard_sections (dashboard_id, section_key, display_name, data_source_type, config, sort_order, enabled)
VALUES
  ('00000001-0002-0000-0000-000000000001', 'my_rocks', 'My Rocks', 'projects', '{"filter": {"assigned_to_me": true, "tag": "rock"}}', 1, true),
  ('00000001-0002-0000-0000-000000000001', 'my_to_dos', 'My To-Dos', 'tasks', '{"filter": {"assigned_to_me": true}}', 2, true),
  ('00000001-0002-0000-0000-000000000001', 'upcoming_meetings', 'Upcoming Meetings', 'calendar', '{"days_ahead": 7}', 3, true),
  ('00000001-0002-0000-0000-000000000001', 'key_docs_notes', 'Key Documents', 'notes', '{"filter": {"pinned": true}}', 4, true);
-- Coach Dashboard
INSERT INTO public.framework_dashboards (id, framework_id, key, display_name, audience, sort_order, enabled)
VALUES ('00000001-0003-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'coach_dashboard', 'Coach Dashboard', 'coach', 3, true);
INSERT INTO public.framework_dashboard_sections (dashboard_id, section_key, display_name, data_source_type, config, sort_order, enabled)
VALUES
  ('00000001-0003-0000-0000-000000000001', 'client_health_rollup', 'Client Health', 'custom_derived', '{"metric_keys": ["rocks_completion_rate", "overdue_meetings_count"]}', 1, true),
  ('00000001-0003-0000-0000-000000000001', 'cadence_misses', 'Missed Cadences', 'calendar', '{"filter": {"missed": true, "days_back": 30}}', 2, true),
  ('00000001-0003-0000-0000-000000000001', 'rocks_at_risk', 'Rocks at Risk', 'projects', '{"filter": {"tag": "rock", "status": "at_risk"}}', 3, true),
  ('00000001-0003-0000-0000-000000000001', 'issues_aging', 'Aging Issues', 'tasks', '{"filter": {"tag": "issue", "age_days": 14}}', 4, true);
-- ==========================================
-- EOS HEALTH METRICS (5 key indicators)
-- ==========================================
INSERT INTO public.framework_health_metrics (framework_id, key, display_name, description, metric_type, data_source_type, calculation_key, thresholds, enabled, sort_order)
VALUES
  ('00000001-0000-0000-0000-000000000001', 'rocks_completion_rate', 'Rocks Completion Rate', 'Percentage of quarterly Rocks completed on time. Target: 80%+ completion rate per quarter.', 'percentage', 'projects', 'calc_rocks_completion_rate', '{"green": 80, "yellow": 50, "red": 0}', true, 1),
  ('00000001-0000-0000-0000-000000000001', 'overdue_meetings_count', 'Overdue Meetings', 'Number of scheduled cadence meetings missed or rescheduled in the last 30 days.', 'count', 'calendar', 'calc_overdue_meetings', '{"green": 0, "yellow": 2, "red": 5}', true, 2),
  ('00000001-0000-0000-0000-000000000001', 'scorecard_trend', 'Scorecard Health', 'Overall trend of measurables hitting their targets. Derived from task/project metrics until dedicated scorecard module exists.', 'trend', 'custom_derived', 'calc_scorecard_trend', '{"green": 1, "yellow": 0, "red": -1}', true, 3),
  ('00000001-0000-0000-0000-000000000001', 'open_issues_aging', 'Aging Issues', 'Number of open issues older than 14 days. Issues should be IDSed (Identify, Discuss, Solve) promptly.', 'count', 'tasks', 'calc_open_issues_aging', '{"green": 0, "yellow": 3, "red": 10}', true, 4),
  ('00000001-0000-0000-0000-000000000001', 'todo_completion_rate', 'To-Do Completion Rate', 'Percentage of weekly To-Dos completed by their due date. Target: 90%+ weekly.', 'percentage', 'tasks', 'calc_todo_completion_rate', '{"green": 90, "yellow": 70, "red": 0}', true, 5);
