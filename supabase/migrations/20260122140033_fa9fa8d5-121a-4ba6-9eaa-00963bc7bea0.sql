
-- ============================================================
-- COACHES MODULE RETROFIT - PROMPT 4
-- Program Type Packs + Terminology + Seeding + Member Flow Hooks
-- ============================================================

-- ============================================================
-- A) SCHEMA RETROFITS
-- ============================================================

-- 1) coaching_orgs - add program fields
ALTER TABLE coaching_orgs
ADD COLUMN IF NOT EXISTS program_key text NOT NULL DEFAULT 'generic',
ADD COLUMN IF NOT EXISTS program_name text NOT NULL DEFAULT 'Generic',
ADD COLUMN IF NOT EXISTS program_version text,
ADD COLUMN IF NOT EXISTS seeded_from_pack_id uuid,
ADD COLUMN IF NOT EXISTS seeded_at timestamptz;

-- Add constraint for non-empty values (safe to fail if exists)
DO $$ BEGIN
  ALTER TABLE coaching_orgs ADD CONSTRAINT chk_coaching_orgs_program_key_not_empty CHECK (program_key <> '');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE coaching_orgs ADD CONSTRAINT chk_coaching_orgs_program_name_not_empty CHECK (program_name <> '');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index on program_key
CREATE INDEX IF NOT EXISTS idx_coaching_orgs_program_key ON coaching_orgs(program_key);

-- Backfill existing rows
UPDATE coaching_orgs
SET program_key = 'generic',
    program_name = 'Generic',
    seeded_at = now()
WHERE program_key = 'generic' AND seeded_at IS NULL;

-- 2) coaching_engagements - add program snapshot
ALTER TABLE coaching_engagements
ADD COLUMN IF NOT EXISTS program_key_snapshot text,
ADD COLUMN IF NOT EXISTS program_name_snapshot text;

-- Backfill from coaching_orgs via company_id join
UPDATE coaching_engagements ce
SET program_key_snapshot = co.program_key,
    program_name_snapshot = co.program_name
FROM coaching_orgs co
WHERE ce.coaching_org_company_id = co.company_id
  AND ce.program_key_snapshot IS NULL;

-- Also add to coaching_org_engagements for completeness
ALTER TABLE coaching_org_engagements
ADD COLUMN IF NOT EXISTS program_key_snapshot text,
ADD COLUMN IF NOT EXISTS program_name_snapshot text;

UPDATE coaching_org_engagements coe
SET program_key_snapshot = co.program_key,
    program_name_snapshot = co.program_name
FROM coaching_orgs co
WHERE coe.coaching_org_id = co.id
  AND coe.program_key_snapshot IS NULL;

-- 3) coaching_terms - terminology overrides per org
CREATE TABLE IF NOT EXISTS coaching_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_org_id uuid NOT NULL REFERENCES coaching_orgs(id) ON DELETE CASCADE,
  term_key text NOT NULL,
  term_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_coaching_terms_org_key UNIQUE(coaching_org_id, term_key)
);

CREATE INDEX IF NOT EXISTS idx_coaching_terms_org_key ON coaching_terms(coaching_org_id, term_key);

-- ============================================================
-- B) PRIVATE PACK LIBRARY (Site Admin Only)
-- ============================================================

-- 4) coaching_program_packs - global library
CREATE TABLE IF NOT EXISTS coaching_program_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  version text NOT NULL DEFAULT '1.0',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add FK from coaching_orgs
DO $$ BEGIN
  ALTER TABLE coaching_orgs
  ADD CONSTRAINT fk_coaching_orgs_seeded_from_pack
  FOREIGN KEY (seeded_from_pack_id) REFERENCES coaching_program_packs(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5) coaching_program_pack_terms
CREATE TABLE IF NOT EXISTS coaching_program_pack_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES coaching_program_packs(id) ON DELETE CASCADE,
  term_key text NOT NULL,
  term_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_pack_terms_pack_key UNIQUE(pack_id, term_key)
);

-- 6) coaching_program_pack_workflow_templates (uses template_status and coaching_workflow_type)
CREATE TABLE IF NOT EXISTS coaching_program_pack_workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES coaching_program_packs(id) ON DELETE CASCADE,
  name text NOT NULL,
  workflow_type coaching_workflow_type NOT NULL,
  description text,
  status template_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7) coaching_program_pack_workflow_steps (uses coaching_step_type)
CREATE TABLE IF NOT EXISTS coaching_program_pack_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_workflow_template_id uuid NOT NULL REFERENCES coaching_program_pack_workflow_templates(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  step_type coaching_step_type NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_pack_workflow_steps_order UNIQUE(pack_workflow_template_id, step_order)
);

-- 8) coaching_program_pack_dashboard_widgets
CREATE TABLE IF NOT EXISTS coaching_program_pack_dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES coaching_program_packs(id) ON DELETE CASCADE,
  dashboard_type coaching_dashboard_type NOT NULL,
  widget_key text NOT NULL,
  widget_order integer NOT NULL DEFAULT 0,
  description text,
  data_source text,
  config_json jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_pack_dashboard_widgets UNIQUE(pack_id, dashboard_type, widget_key)
);

-- ============================================================
-- Add seeding metadata to existing tables for idempotency
-- ============================================================

-- coaching_workflow_templates - add seeding metadata
ALTER TABLE coaching_workflow_templates
ADD COLUMN IF NOT EXISTS seeded_from_pack_workflow_template_id uuid;

DO $$ BEGIN
  ALTER TABLE coaching_workflow_templates
  ADD CONSTRAINT fk_wf_templates_pack_template
  FOREIGN KEY (seeded_from_pack_workflow_template_id) REFERENCES coaching_program_pack_workflow_templates(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Unique constraint for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_templates_seeded
ON coaching_workflow_templates(coaching_org_id, seeded_from_pack_workflow_template_id)
WHERE seeded_from_pack_workflow_template_id IS NOT NULL;

-- coaching_workflow_steps - add seeding metadata
ALTER TABLE coaching_workflow_steps
ADD COLUMN IF NOT EXISTS seeded_from_pack_step_id uuid;

DO $$ BEGIN
  ALTER TABLE coaching_workflow_steps
  ADD CONSTRAINT fk_wf_steps_pack_step
  FOREIGN KEY (seeded_from_pack_step_id) REFERENCES coaching_program_pack_workflow_steps(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- coaching_org_dashboard_widgets - org-scoped widget defaults
CREATE TABLE IF NOT EXISTS coaching_org_dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_org_id uuid NOT NULL REFERENCES coaching_orgs(id) ON DELETE CASCADE,
  dashboard_type coaching_dashboard_type NOT NULL,
  widget_key text NOT NULL,
  widget_order integer NOT NULL DEFAULT 0,
  description text,
  data_source text,
  config_json jsonb DEFAULT '{}',
  is_enabled boolean NOT NULL DEFAULT true,
  seeded_from_pack_widget_id uuid REFERENCES coaching_program_pack_dashboard_widgets(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_dashboard_widgets UNIQUE(coaching_org_id, dashboard_type, widget_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_widgets_seeded
ON coaching_org_dashboard_widgets(coaching_org_id, seeded_from_pack_widget_id)
WHERE seeded_from_pack_widget_id IS NOT NULL;

-- ============================================================
-- C) SEED INITIAL GENERIC PACK
-- ============================================================

-- Insert Generic pack
INSERT INTO coaching_program_packs (key, name, version, description, is_active)
VALUES ('generic', 'Generic', '1.0', 'Default coaching program pack with standard terminology and workflows', true)
ON CONFLICT (key) DO NOTHING;

-- Seed Generic pack terms
INSERT INTO coaching_program_pack_terms (pack_id, term_key, term_value)
SELECT p.id, t.term_key, t.term_value
FROM coaching_program_packs p
CROSS JOIN (VALUES
  ('member_label', 'Member Company'),
  ('health_check_label', 'Health Check'),
  ('annual_meeting_label', 'Annual Meeting'),
  ('quarterly_meeting_label', 'Quarterly Meeting'),
  ('monthly_meeting_label', 'Monthly Meeting'),
  ('one_on_one_label', '1:1'),
  ('goals_label', 'Goals'),
  ('plan_label', 'Coaching Plan'),
  ('coach_label', 'Coach'),
  ('manager_label', 'Manager'),
  ('engagement_label', 'Engagement'),
  ('group_label', 'Group'),
  ('workflow_label', 'Workflow'),
  ('dashboard_label', 'Dashboard')
) AS t(term_key, term_value)
WHERE p.key = 'generic'
ON CONFLICT (pack_id, term_key) DO NOTHING;

-- Seed Generic pack workflow templates
WITH pack AS (
  SELECT id FROM coaching_program_packs WHERE key = 'generic'
)
INSERT INTO coaching_program_pack_workflow_templates (pack_id, name, workflow_type, description, status)
SELECT pack.id, t.name, t.workflow_type::coaching_workflow_type, t.description, 'active'::template_status
FROM pack
CROSS JOIN (VALUES
  ('Annual Strategic Planning', 'annual_meeting', 'Annual strategic planning session with vision review and goal setting'),
  ('Quarterly Business Review', 'quarterly_meeting', 'Quarterly review of progress, metrics, and adjustments'),
  ('Monthly Check-in', 'monthly_meeting', 'Monthly progress check and issue resolution'),
  ('Weekly 1:1 Session', 'one_on_one', 'Regular one-on-one coaching session'),
  ('Content Development', 'content_creation', 'Process for creating and reviewing coaching content'),
  ('Operations Review', 'operations', 'Operational workflow for managing coaching activities')
) AS t(name, workflow_type, description)
ON CONFLICT DO NOTHING;

-- Seed workflow steps for each template
WITH templates AS (
  SELECT pt.id, pt.workflow_type
  FROM coaching_program_pack_workflow_templates pt
  JOIN coaching_program_packs p ON pt.pack_id = p.id
  WHERE p.key = 'generic'
)
INSERT INTO coaching_program_pack_workflow_steps (pack_workflow_template_id, step_order, step_type, title, description)
SELECT t.id, s.step_order, s.step_type::coaching_step_type, s.title, s.description
FROM templates t
CROSS JOIN LATERAL (
  SELECT * FROM (VALUES
    -- Annual meeting steps
    ('annual_meeting', 1, 'form', 'Pre-Meeting Survey', 'Complete annual assessment survey'),
    ('annual_meeting', 2, 'task', 'Review Previous Year Goals', 'Review and document previous year goal outcomes'),
    ('annual_meeting', 3, 'meeting', 'Vision & Strategy Session', 'Conduct vision and strategic planning session'),
    ('annual_meeting', 4, 'note', 'Document Key Decisions', 'Document key decisions and commitments'),
    ('annual_meeting', 5, 'task', 'Set Annual Goals', 'Define and document annual goals'),
    ('annual_meeting', 6, 'task', 'Create Action Plan', 'Create quarterly action plan breakdown'),
    -- Quarterly meeting steps
    ('quarterly_meeting', 1, 'form', 'Quarterly Health Check', 'Complete quarterly health assessment'),
    ('quarterly_meeting', 2, 'task', 'Prepare Metrics Review', 'Compile and review quarterly metrics'),
    ('quarterly_meeting', 3, 'meeting', 'Quarterly Review Session', 'Conduct quarterly business review'),
    ('quarterly_meeting', 4, 'note', 'Document Insights', 'Document key insights and learnings'),
    ('quarterly_meeting', 5, 'task', 'Update Goals', 'Update goals and adjust targets as needed'),
    -- Monthly meeting steps
    ('monthly_meeting', 1, 'task', 'Review Action Items', 'Review outstanding action items'),
    ('monthly_meeting', 2, 'form', 'Monthly Check-in Form', 'Complete monthly progress check-in'),
    ('monthly_meeting', 3, 'meeting', 'Monthly Session', 'Conduct monthly coaching session'),
    ('monthly_meeting', 4, 'note', 'Session Notes', 'Document session notes and next steps'),
    -- One-on-one steps
    ('one_on_one', 1, 'form', 'Pre-Session Prep', 'Complete pre-session preparation form'),
    ('one_on_one', 2, 'meeting', '1:1 Session', 'Conduct one-on-one coaching session'),
    ('one_on_one', 3, 'note', 'Session Summary', 'Document session summary and action items'),
    -- Content creation steps
    ('content_creation', 1, 'task', 'Define Content Scope', 'Define scope and objectives for content'),
    ('content_creation', 2, 'task', 'Draft Content', 'Create initial content draft'),
    ('content_creation', 3, 'task', 'Review & Edit', 'Review and edit content'),
    ('content_creation', 4, 'task', 'Finalize & Publish', 'Finalize and publish content'),
    -- Operations steps
    ('operations', 1, 'task', 'Weekly Planning', 'Plan weekly coaching activities'),
    ('operations', 2, 'task', 'Resource Allocation', 'Allocate resources and assignments'),
    ('operations', 3, 'task', 'Progress Tracking', 'Track progress across engagements'),
    ('operations', 4, 'form', 'Weekly Report', 'Complete weekly operations report')
  ) AS steps(wf_type, step_order, step_type, title, description)
  WHERE steps.wf_type = t.workflow_type::text
) s
ON CONFLICT DO NOTHING;

-- Seed dashboard widgets for Generic pack
WITH pack AS (
  SELECT id FROM coaching_program_packs WHERE key = 'generic'
)
INSERT INTO coaching_program_pack_dashboard_widgets (pack_id, dashboard_type, widget_key, widget_order, description, data_source)
SELECT pack.id, w.dashboard_type::coaching_dashboard_type, w.widget_key, w.widget_order, w.description, w.data_source
FROM pack
CROSS JOIN (VALUES
  -- Org Admin widgets
  ('org_admin', 'active_engagements', 1, 'Count of active coaching engagements', 'coaching_engagements'),
  ('org_admin', 'coach_performance', 2, 'Overview of coach performance metrics', 'coaching_coaches'),
  ('org_admin', 'org_health_trends', 3, 'Organization-wide health trends', 'coaching_health_checks'),
  ('org_admin', 'revenue_overview', 4, 'Revenue and billing overview', 'billing'),
  ('org_admin', 'pending_onboarding', 5, 'Members pending onboarding', 'coaching_engagement_onboarding'),
  -- Manager widgets
  ('manager', 'coaches_overview', 1, 'Overview of managed coaches', 'coaching_coaches'),
  ('manager', 'engagement_status', 2, 'Status of managed engagements', 'coaching_engagements'),
  ('manager', 'overdue_workflows', 3, 'Workflows requiring attention', 'coaching_workflow_templates'),
  ('manager', 'team_health', 4, 'Team health summary', 'coaching_health_checks'),
  -- Coach widgets
  ('coach', 'upcoming_meetings', 1, 'Upcoming scheduled meetings', 'coaching_meetings'),
  ('coach', 'client_goals', 2, 'Client goals and progress', 'coaching_goals'),
  ('coach', 'prep_required', 3, 'Prep items requiring completion', 'coaching_meeting_prep_items'),
  ('coach', 'active_plans', 4, 'Active coaching plans', 'coaching_plans'),
  ('coach', 'recent_notes', 5, 'Recent coaching notes', 'notes'),
  -- Member widgets
  ('member', 'upcoming_meetings', 1, 'Upcoming scheduled meetings', 'coaching_meetings'),
  ('member', 'goals_progress', 2, 'Goals and progress tracking', 'coaching_goals'),
  ('member', 'health_trends', 3, 'Health check trends', 'coaching_health_checks'),
  ('member', 'action_items', 4, 'Outstanding action items', 'tasks'),
  ('member', 'coach_info', 5, 'Assigned coach information', 'coaching_coaches')
) AS w(dashboard_type, widget_key, widget_order, description, data_source)
ON CONFLICT (pack_id, dashboard_type, widget_key) DO NOTHING;

-- ============================================================
-- D) SEEDING FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION fn_seed_coaching_org_from_pack(
  p_coaching_org_id uuid,
  p_pack_key text,
  p_force_overwrite boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pack_id uuid;
  v_pack_name text;
  v_pack_version text;
  v_org coaching_orgs%ROWTYPE;
  v_terms_copied integer := 0;
  v_templates_copied integer := 0;
  v_steps_copied integer := 0;
  v_widgets_copied integer := 0;
  v_template_mapping jsonb := '{}';
BEGIN
  -- 1) Validate caller is site admin (or service role)
  IF NOT (fn_is_site_admin(auth.uid()) OR current_setting('role', true) = 'service_role') THEN
    RAISE EXCEPTION 'Only site admins can seed coaching orgs from packs';
  END IF;
  
  -- 2) Validate coaching org exists
  SELECT * INTO v_org FROM coaching_orgs WHERE id = p_coaching_org_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Coaching org not found: %', p_coaching_org_id;
  END IF;
  
  -- 3) Validate pack exists and is active
  SELECT id, name, version INTO v_pack_id, v_pack_name, v_pack_version
  FROM coaching_program_packs
  WHERE key = p_pack_key AND is_active = true;
  
  IF v_pack_id IS NULL THEN
    RAISE EXCEPTION 'Pack not found or inactive: %', p_pack_key;
  END IF;
  
  -- 4) Check if already seeded (unless force)
  IF v_org.seeded_at IS NOT NULL AND NOT p_force_overwrite THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Coaching org already seeded. Use force_overwrite=true to reseed.',
      'seeded_at', v_org.seeded_at
    );
  END IF;
  
  -- 5) Update coaching_orgs with pack info
  UPDATE coaching_orgs
  SET program_key = p_pack_key,
      program_name = v_pack_name,
      program_version = v_pack_version,
      seeded_from_pack_id = v_pack_id,
      seeded_at = now(),
      updated_at = now()
  WHERE id = p_coaching_org_id;
  
  -- 6) Copy Terms
  INSERT INTO coaching_terms (coaching_org_id, term_key, term_value)
  SELECT p_coaching_org_id, pt.term_key, pt.term_value
  FROM coaching_program_pack_terms pt
  WHERE pt.pack_id = v_pack_id
  ON CONFLICT (coaching_org_id, term_key) 
  DO UPDATE SET term_value = EXCLUDED.term_value, updated_at = now()
  WHERE p_force_overwrite;
  
  GET DIAGNOSTICS v_terms_copied = ROW_COUNT;
  
  -- 7) Copy Workflow Templates
  WITH inserted_templates AS (
    INSERT INTO coaching_workflow_templates (
      coaching_org_id, name, workflow_type, description, status, seeded_from_pack_workflow_template_id
    )
    SELECT 
      p_coaching_org_id,
      pt.name,
      pt.workflow_type,
      pt.description,
      pt.status,
      pt.id
    FROM coaching_program_pack_workflow_templates pt
    WHERE pt.pack_id = v_pack_id
    ON CONFLICT (coaching_org_id, seeded_from_pack_workflow_template_id) 
    WHERE seeded_from_pack_workflow_template_id IS NOT NULL
    DO UPDATE SET 
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      updated_at = now()
    WHERE p_force_overwrite
    RETURNING id, seeded_from_pack_workflow_template_id
  )
  SELECT jsonb_object_agg(seeded_from_pack_workflow_template_id::text, id::text)
  INTO v_template_mapping
  FROM inserted_templates;
  
  GET DIAGNOSTICS v_templates_copied = ROW_COUNT;
  
  -- 8) Copy Workflow Steps (if templates were copied)
  IF v_template_mapping IS NOT NULL AND v_template_mapping <> '{}'::jsonb THEN
    INSERT INTO coaching_workflow_steps (
      coaching_workflow_template_id, step_order, step_type, title, description, seeded_from_pack_step_id
    )
    SELECT 
      (v_template_mapping->>ps.pack_workflow_template_id::text)::uuid,
      ps.step_order,
      ps.step_type,
      ps.title,
      ps.description,
      ps.id
    FROM coaching_program_pack_workflow_steps ps
    JOIN coaching_program_pack_workflow_templates pt ON ps.pack_workflow_template_id = pt.id
    WHERE pt.pack_id = v_pack_id
      AND v_template_mapping ? pt.id::text
    ON CONFLICT (coaching_workflow_template_id, step_order) 
    DO UPDATE SET 
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      updated_at = now()
    WHERE p_force_overwrite;
    
    GET DIAGNOSTICS v_steps_copied = ROW_COUNT;
  END IF;
  
  -- 9) Copy Dashboard Widgets
  INSERT INTO coaching_org_dashboard_widgets (
    coaching_org_id, dashboard_type, widget_key, widget_order, description, data_source, config_json, seeded_from_pack_widget_id
  )
  SELECT 
    p_coaching_org_id,
    pw.dashboard_type,
    pw.widget_key,
    pw.widget_order,
    pw.description,
    pw.data_source,
    pw.config_json,
    pw.id
  FROM coaching_program_pack_dashboard_widgets pw
  WHERE pw.pack_id = v_pack_id
  ON CONFLICT (coaching_org_id, dashboard_type, widget_key) 
  DO UPDATE SET 
    widget_order = EXCLUDED.widget_order,
    description = EXCLUDED.description,
    data_source = EXCLUDED.data_source,
    updated_at = now()
  WHERE p_force_overwrite;
  
  GET DIAGNOSTICS v_widgets_copied = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'pack_key', p_pack_key,
    'pack_name', v_pack_name,
    'pack_version', v_pack_version,
    'terms_copied', v_terms_copied,
    'templates_copied', v_templates_copied,
    'steps_copied', v_steps_copied,
    'widgets_copied', v_widgets_copied
  );
END;
$$;

-- ============================================================
-- E) TRIGGER: Set program snapshot on engagement creation
-- ============================================================

-- For coaching_engagements (uses coaching_org_company_id -> coaching_orgs.company_id)
CREATE OR REPLACE FUNCTION trg_set_engagement_program_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set program snapshot from coaching org via company_id
  SELECT program_key, program_name
  INTO NEW.program_key_snapshot, NEW.program_name_snapshot
  FROM coaching_orgs
  WHERE company_id = NEW.coaching_org_company_id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_engagement_program_snapshot ON coaching_engagements;
CREATE TRIGGER trg_engagement_program_snapshot
  BEFORE INSERT ON coaching_engagements
  FOR EACH ROW
  WHEN (NEW.program_key_snapshot IS NULL)
  EXECUTE FUNCTION trg_set_engagement_program_snapshot();

-- For coaching_org_engagements (uses coaching_org_id directly)
CREATE OR REPLACE FUNCTION trg_set_org_engagement_program_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT program_key, program_name
  INTO NEW.program_key_snapshot, NEW.program_name_snapshot
  FROM coaching_orgs
  WHERE id = NEW.coaching_org_id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_engagement_program_snapshot ON coaching_org_engagements;
CREATE TRIGGER trg_org_engagement_program_snapshot
  BEFORE INSERT ON coaching_org_engagements
  FOR EACH ROW
  WHEN (NEW.program_key_snapshot IS NULL)
  EXECUTE FUNCTION trg_set_org_engagement_program_snapshot();

-- ============================================================
-- F) RLS POLICIES
-- ============================================================

-- Enable RLS on all new tables
ALTER TABLE coaching_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_program_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_program_pack_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_program_pack_workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_program_pack_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_program_pack_dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_org_dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- coaching_program_packs - Site admin only
CREATE POLICY "site_admin_select_packs" ON coaching_program_packs
  FOR SELECT USING (fn_is_site_admin(auth.uid()));

CREATE POLICY "site_admin_insert_packs" ON coaching_program_packs
  FOR INSERT WITH CHECK (fn_is_site_admin(auth.uid()));

CREATE POLICY "site_admin_update_packs" ON coaching_program_packs
  FOR UPDATE USING (fn_is_site_admin(auth.uid()));

CREATE POLICY "site_admin_delete_packs" ON coaching_program_packs
  FOR DELETE USING (fn_is_site_admin(auth.uid()));

-- coaching_program_pack_terms - Site admin only
CREATE POLICY "site_admin_select_pack_terms" ON coaching_program_pack_terms
  FOR SELECT USING (fn_is_site_admin(auth.uid()));

CREATE POLICY "site_admin_insert_pack_terms" ON coaching_program_pack_terms
  FOR INSERT WITH CHECK (fn_is_site_admin(auth.uid()));

CREATE POLICY "site_admin_update_pack_terms" ON coaching_program_pack_terms
  FOR UPDATE USING (fn_is_site_admin(auth.uid()));

CREATE POLICY "site_admin_delete_pack_terms" ON coaching_program_pack_terms
  FOR DELETE USING (fn_is_site_admin(auth.uid()));

-- coaching_program_pack_workflow_templates - Site admin only
CREATE POLICY "site_admin_select_pack_wf_templates" ON coaching_program_pack_workflow_templates
  FOR SELECT USING (fn_is_site_admin(auth.uid()));

CREATE POLICY "site_admin_insert_pack_wf_templates" ON coaching_program_pack_workflow_templates
  FOR INSERT WITH CHECK (fn_is_site_admin(auth.uid()));

CREATE POLICY "site_admin_update_pack_wf_templates" ON coaching_program_pack_workflow_templates
  FOR UPDATE USING (fn_is_site_admin(auth.uid()));

CREATE POLICY "site_admin_delete_pack_wf_templates" ON coaching_program_pack_workflow_templates
  FOR DELETE USING (fn_is_site_admin(auth.uid()));

-- coaching_program_pack_workflow_steps - Site admin only
CREATE POLICY "site_admin_select_pack_wf_steps" ON coaching_program_pack_workflow_steps
  FOR SELECT USING (fn_is_site_admin(auth.uid()));

CREATE POLICY "site_admin_insert_pack_wf_steps" ON coaching_program_pack_workflow_steps
  FOR INSERT WITH CHECK (fn_is_site_admin(auth.uid()));

CREATE POLICY "site_admin_update_pack_wf_steps" ON coaching_program_pack_workflow_steps
  FOR UPDATE USING (fn_is_site_admin(auth.uid()));

CREATE POLICY "site_admin_delete_pack_wf_steps" ON coaching_program_pack_workflow_steps
  FOR DELETE USING (fn_is_site_admin(auth.uid()));

-- coaching_program_pack_dashboard_widgets - Site admin only
CREATE POLICY "site_admin_select_pack_widgets" ON coaching_program_pack_dashboard_widgets
  FOR SELECT USING (fn_is_site_admin(auth.uid()));

CREATE POLICY "site_admin_insert_pack_widgets" ON coaching_program_pack_dashboard_widgets
  FOR INSERT WITH CHECK (fn_is_site_admin(auth.uid()));

CREATE POLICY "site_admin_update_pack_widgets" ON coaching_program_pack_dashboard_widgets
  FOR UPDATE USING (fn_is_site_admin(auth.uid()));

CREATE POLICY "site_admin_delete_pack_widgets" ON coaching_program_pack_dashboard_widgets
  FOR DELETE USING (fn_is_site_admin(auth.uid()));

-- coaching_terms - Org admins can manage their own, site admin sees all
CREATE POLICY "select_coaching_terms" ON coaching_terms
  FOR SELECT USING (
    fn_is_site_admin(auth.uid())
    OR coaching_org_id IN (SELECT fn_user_coaching_org_ids(auth.uid()))
  );

CREATE POLICY "insert_coaching_terms" ON coaching_terms
  FOR INSERT WITH CHECK (
    fn_is_site_admin(auth.uid())
    OR fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
  );

CREATE POLICY "update_coaching_terms" ON coaching_terms
  FOR UPDATE USING (
    fn_is_site_admin(auth.uid())
    OR fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
  );

CREATE POLICY "delete_coaching_terms" ON coaching_terms
  FOR DELETE USING (
    fn_is_site_admin(auth.uid())
    OR fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
  );

-- coaching_org_dashboard_widgets - Org admins can manage their own
CREATE POLICY "select_org_dashboard_widgets" ON coaching_org_dashboard_widgets
  FOR SELECT USING (
    fn_is_site_admin(auth.uid())
    OR coaching_org_id IN (SELECT fn_user_coaching_org_ids(auth.uid()))
  );

CREATE POLICY "insert_org_dashboard_widgets" ON coaching_org_dashboard_widgets
  FOR INSERT WITH CHECK (
    fn_is_site_admin(auth.uid())
    OR fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
  );

CREATE POLICY "update_org_dashboard_widgets" ON coaching_org_dashboard_widgets
  FOR UPDATE USING (
    fn_is_site_admin(auth.uid())
    OR fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
  );

CREATE POLICY "delete_org_dashboard_widgets" ON coaching_org_dashboard_widgets
  FOR DELETE USING (
    fn_is_site_admin(auth.uid())
    OR fn_is_coaching_org_admin(auth.uid(), coaching_org_id)
  );

-- ============================================================
-- G) UPDATE TRIGGERS for updated_at
-- ============================================================

CREATE TRIGGER update_coaching_terms_updated_at
  BEFORE UPDATE ON coaching_terms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaching_program_packs_updated_at
  BEFORE UPDATE ON coaching_program_packs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaching_program_pack_terms_updated_at
  BEFORE UPDATE ON coaching_program_pack_terms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaching_program_pack_workflow_templates_updated_at
  BEFORE UPDATE ON coaching_program_pack_workflow_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaching_program_pack_workflow_steps_updated_at
  BEFORE UPDATE ON coaching_program_pack_workflow_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaching_program_pack_dashboard_widgets_updated_at
  BEFORE UPDATE ON coaching_program_pack_dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaching_org_dashboard_widgets_updated_at
  BEFORE UPDATE ON coaching_org_dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- H) HELPER: Get coaching term for an org (with fallback)
-- ============================================================

CREATE OR REPLACE FUNCTION fn_get_coaching_term(
  p_coaching_org_id uuid,
  p_term_key text,
  p_default_value text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_term_value text;
BEGIN
  -- Try org-specific term first
  SELECT term_value INTO v_term_value
  FROM coaching_terms
  WHERE coaching_org_id = p_coaching_org_id AND term_key = p_term_key;
  
  IF v_term_value IS NOT NULL THEN
    RETURN v_term_value;
  END IF;
  
  -- Fall back to generic pack term
  SELECT pt.term_value INTO v_term_value
  FROM coaching_program_pack_terms pt
  JOIN coaching_program_packs p ON pt.pack_id = p.id
  WHERE p.key = 'generic' AND pt.term_key = p_term_key;
  
  RETURN COALESCE(v_term_value, p_default_value, p_term_key);
END;
$$;
