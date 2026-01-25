
-- =====================================================
-- GENERIC COACHING PROGRAM PACK - COMPLETE SEED DATA
-- =====================================================

-- =====================================================
-- 1. ADD MISSING TERMINOLOGY
-- =====================================================
INSERT INTO coaching_program_pack_terms (pack_id, term_key, term_value)
VALUES 
  ('cc93b66a-6f8f-4b85-96e5-3aab2127ec44', 'meeting_label', 'Meeting'),
  ('cc93b66a-6f8f-4b85-96e5-3aab2127ec44', 'onboarding_label', 'Onboarding'),
  ('cc93b66a-6f8f-4b85-96e5-3aab2127ec44', 'review_label', 'Review')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. SEED LIFECYCLE WORKFLOWS WITH STEPS
-- =====================================================

-- generic_engagement_lifecycle
INSERT INTO coaching_program_pack_workflow_templates (id, pack_id, name, workflow_type, description, status)
VALUES (
  'a0000001-0000-0000-0000-000000000001',
  'cc93b66a-6f8f-4b85-96e5-3aab2127ec44',
  'Engagement Lifecycle',
  'engagement_lifecycle',
  'Master lifecycle workflow tracking engagement from creation to completion. Scope: engagement. Owner: org_admin.',
  'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO coaching_program_pack_workflow_steps (pack_workflow_template_id, step_order, step_type, title, description, default_assignee)
VALUES 
  ('a0000001-0000-0000-0000-000000000001', 1, 'milestone', 'Engagement Created', 'Initial engagement record created', 'org_admin'),
  ('a0000001-0000-0000-0000-000000000001', 2, 'milestone', 'Member Onboarding', 'Member completes onboarding forms and orientation', 'member'),
  ('a0000001-0000-0000-0000-000000000001', 3, 'milestone', 'Coach Assigned', 'Coach assigned to engagement', 'org_admin'),
  ('a0000001-0000-0000-0000-000000000001', 4, 'milestone', 'Active Coaching', 'Ongoing coaching relationship active', 'coach'),
  ('a0000001-0000-0000-0000-000000000001', 5, 'milestone', 'Periodic Review', 'Regular review cadence in progress', 'coach'),
  ('a0000001-0000-0000-0000-000000000001', 6, 'milestone', 'Engagement Ended', 'Engagement concluded and access revoked', 'org_admin')
ON CONFLICT DO NOTHING;

-- generic_member_onboarding
INSERT INTO coaching_program_pack_workflow_templates (id, pack_id, name, workflow_type, description, status)
VALUES (
  'a0000002-0000-0000-0000-000000000001',
  'cc93b66a-6f8f-4b85-96e5-3aab2127ec44',
  'Member Onboarding',
  'member_onboarding',
  'Member onboarding workflow including agreement and initial goals. Scope: engagement. Owner: member (company_admin).',
  'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO coaching_program_pack_workflow_steps (pack_workflow_template_id, step_order, step_type, title, description, default_assignee)
VALUES 
  ('a0000002-0000-0000-0000-000000000001', 1, 'form', 'Member Info & Agreement', 'Complete member covenant and info form (generic_key_leader_member_covenant)', 'member'),
  ('a0000002-0000-0000-0000-000000000001', 2, 'form', 'Initial Goals / Priorities', 'Define initial goals and priorities (generic_annual_goals_portfolio)', 'member'),
  ('a0000002-0000-0000-0000-000000000001', 3, 'task', 'Orientation Complete', 'Mark orientation as complete', 'member')
ON CONFLICT DO NOTHING;

-- generic_coach_assignment
INSERT INTO coaching_program_pack_workflow_templates (id, pack_id, name, workflow_type, description, status)
VALUES (
  'a0000003-0000-0000-0000-000000000001',
  'cc93b66a-6f8f-4b85-96e5-3aab2127ec44',
  'Coach Assignment',
  'coach_assignment',
  'Workflow for assigning a coach to an engagement. Scope: engagement. Owner: org_admin/manager.',
  'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO coaching_program_pack_workflow_steps (pack_workflow_template_id, step_order, step_type, title, description, default_assignee)
VALUES 
  ('a0000003-0000-0000-0000-000000000001', 1, 'task', 'Coach Selected', 'Select appropriate coach for engagement', 'org_admin'),
  ('a0000003-0000-0000-0000-000000000001', 2, 'task', 'Coach Assigned', 'Formally assign coach to engagement', 'org_admin'),
  ('a0000003-0000-0000-0000-000000000001', 3, 'meeting', 'Intro Scheduled', 'Schedule introduction meeting between coach and member', 'coach')
ON CONFLICT DO NOTHING;

-- generic_coaching_cadence (repeatable)
INSERT INTO coaching_program_pack_workflow_templates (id, pack_id, name, workflow_type, description, status)
VALUES (
  'a0000004-0000-0000-0000-000000000001',
  'cc93b66a-6f8f-4b85-96e5-3aab2127ec44',
  'Coaching Cadence',
  'coaching_cadence',
  'Repeatable coaching session workflow. Scope: engagement. Owner: coach. Creates: calendar events, tasks, notes.',
  'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO coaching_program_pack_workflow_steps (pack_workflow_template_id, step_order, step_type, title, description, default_assignee)
VALUES 
  ('a0000004-0000-0000-0000-000000000001', 1, 'task', 'Pre-Meeting Prep', 'Coach prepares for upcoming session', 'coach'),
  ('a0000004-0000-0000-0000-000000000001', 2, 'meeting', 'Coaching Session', 'Conduct coaching session', 'coach'),
  ('a0000004-0000-0000-0000-000000000001', 3, 'task', 'Commitments Captured', 'Document commitments and action items', 'coach'),
  ('a0000004-0000-0000-0000-000000000001', 4, 'task', 'Follow-Up', 'Complete follow-up tasks from session', 'coach')
ON CONFLICT DO NOTHING;

-- generic_periodic_review
INSERT INTO coaching_program_pack_workflow_templates (id, pack_id, name, workflow_type, description, status)
VALUES (
  'a0000005-0000-0000-0000-000000000001',
  'cc93b66a-6f8f-4b85-96e5-3aab2127ec44',
  'Periodic Review',
  'periodic_review',
  'Periodic progress review workflow. Scope: engagement. Owner: coach/member.',
  'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO coaching_program_pack_workflow_steps (pack_workflow_template_id, step_order, step_type, title, description, default_assignee)
VALUES 
  ('a0000005-0000-0000-0000-000000000001', 1, 'task', 'Progress Review', 'Review progress against goals and commitments', 'coach'),
  ('a0000005-0000-0000-0000-000000000001', 2, 'form', 'Health Check', 'Complete health check assessment (generic_key_leader_briefing)', 'member'),
  ('a0000005-0000-0000-0000-000000000001', 3, 'task', 'Updated Priorities', 'Update priorities based on review findings', 'member')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. ADD MISSING DASHBOARD WIDGETS
-- =====================================================

-- org_admin: coach assignment coverage
INSERT INTO coaching_program_pack_dashboard_widgets (pack_id, dashboard_type, widget_key, widget_order, description, data_source, config_json)
VALUES (
  'cc93b66a-6f8f-4b85-96e5-3aab2127ec44',
  'org_admin',
  'coach_assignment_coverage',
  6,
  'Coverage of coach assignments across engagements',
  'coach_assignments',
  '{}'::jsonb
) ON CONFLICT DO NOTHING;

-- org_admin: engagement status breakdown
INSERT INTO coaching_program_pack_dashboard_widgets (pack_id, dashboard_type, widget_key, widget_order, description, data_source, config_json)
VALUES (
  'cc93b66a-6f8f-4b85-96e5-3aab2127ec44',
  'org_admin',
  'engagement_status_breakdown',
  7,
  'Breakdown of engagements by status',
  'coaching_engagements',
  '{}'::jsonb
) ON CONFLICT DO NOTHING;

-- coach: active engagements
INSERT INTO coaching_program_pack_dashboard_widgets (pack_id, dashboard_type, widget_key, widget_order, description, data_source, config_json)
VALUES (
  'cc93b66a-6f8f-4b85-96e5-3aab2127ec44',
  'coach',
  'active_engagements',
  0,
  'Count of active coaching engagements for coach',
  'coaching_engagements',
  '{}'::jsonb
) ON CONFLICT DO NOTHING;

-- coach: overdue commitments
INSERT INTO coaching_program_pack_dashboard_widgets (pack_id, dashboard_type, widget_key, widget_order, description, data_source, config_json)
VALUES (
  'cc93b66a-6f8f-4b85-96e5-3aab2127ec44',
  'coach',
  'overdue_commitments',
  6,
  'Tasks and commitments that are overdue',
  'tasks',
  '{"filter": "overdue"}'::jsonb
) ON CONFLICT DO NOTHING;

-- coach: inactive engagement alerts
INSERT INTO coaching_program_pack_dashboard_widgets (pack_id, dashboard_type, widget_key, widget_order, description, data_source, config_json)
VALUES (
  'cc93b66a-6f8f-4b85-96e5-3aab2127ec44',
  'coach',
  'inactive_engagement_alerts',
  7,
  'Alerts for engagements with no recent activity',
  'coaching_engagements',
  '{"filter": "inactive"}'::jsonb
) ON CONFLICT DO NOTHING;

-- member: assigned coach
INSERT INTO coaching_program_pack_dashboard_widgets (pack_id, dashboard_type, widget_key, widget_order, description, data_source, config_json)
VALUES (
  'cc93b66a-6f8f-4b85-96e5-3aab2127ec44',
  'member',
  'assigned_coach',
  0,
  'Information about assigned coach',
  'coach_assignments',
  '{}'::jsonb
) ON CONFLICT DO NOTHING;

-- member: open commitments
INSERT INTO coaching_program_pack_dashboard_widgets (pack_id, dashboard_type, widget_key, widget_order, description, data_source, config_json)
VALUES (
  'cc93b66a-6f8f-4b85-96e5-3aab2127ec44',
  'member',
  'open_commitments',
  4,
  'Open tasks and commitments',
  'tasks',
  '{"filter": "open"}'::jsonb
) ON CONFLICT DO NOTHING;

-- member: recent notes
INSERT INTO coaching_program_pack_dashboard_widgets (pack_id, dashboard_type, widget_key, widget_order, description, data_source, config_json)
VALUES (
  'cc93b66a-6f8f-4b85-96e5-3aab2127ec44',
  'member',
  'recent_notes',
  5,
  'Recent coaching notes and session summaries',
  'notes',
  '{}'::jsonb
) ON CONFLICT DO NOTHING;
