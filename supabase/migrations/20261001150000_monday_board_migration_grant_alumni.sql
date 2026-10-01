-- Migration: Monday.com Board Migration - Grant Tracking + Alumni Boards
-- Boards migrated:
--   1. Ashes to Glory Grant Tracking (board_id: 18392152872, 8 items)
--   2. Conrad's Claws Grant Tracking (board_id: 18395099225, 7 items)
--   3. Alumni Marketing Needs (board_id: 4052171541, 41 items)
--   4. Alumni Weekend 2026 (board_id: 18120122979, 64 items)
--
-- Owner: Jennifer MacArthur (e79b8c6f-6f5f-49fe-8fec-267d4b451a97)
-- Module admins: Devan Schanding, Heather Plain, John Panico
-- Department: Accounting (223606de-4c95-4de2-a4f7-c18efa02fe32)
-- Company: Honey Lake Clinic (9ea3677d-be6c-46df-a41c-d22f01e88756)

----------------------------------------------------------------------
-- 1. Grant Tracking table (shared by Ashes to Glory + Conrad's Claws)
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grant_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  program text NOT NULL CHECK (program IN ('ashes_to_glory', 'conrads_claws')),
  patient_name text,
  status text DEFAULT 'new',
  received boolean DEFAULT false,
  first_payment_amount numeric(12,2),
  first_payment_notes text,
  second_payment_amount numeric(12,2),
  second_payment_notes text,
  admission_date date,
  discharge_date date,
  total_grant_amount numeric(12,2),
  invoice_number text,
  notes text,
  approved boolean DEFAULT false,
  date_approved date,
  monday_item_id text,
  monday_board_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grant_tracking_company ON grant_tracking(company_id);
CREATE INDEX IF NOT EXISTS idx_grant_tracking_program ON grant_tracking(program);
CREATE INDEX IF NOT EXISTS idx_grant_tracking_status ON grant_tracking(status);

----------------------------------------------------------------------
-- 2. Alumni Marketing Tasks table
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alumni_marketing_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  month_name text,
  people text,
  person text,
  status text DEFAULT 'new',
  monday_item_id text,
  monday_board_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alumni_marketing_company ON alumni_marketing_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_alumni_marketing_status ON alumni_marketing_tasks(status);

----------------------------------------------------------------------
-- 3. Alumni Event Registrations table (Alumni Weekend 2026)
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alumni_event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_name text NOT NULL DEFAULT 'Alumni Weekend 2026',
  participant_name text,
  email text,
  phone text,
  participant_type text,
  invoice_status text,
  invoiced_amount numeric(12,2),
  facility_approval text,
  financial_approval text,
  lodging text,
  scholarship_amount numeric(12,2),
  monday_item_id text,
  monday_board_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alumni_event_company ON alumni_event_registrations(company_id);
CREATE INDEX IF NOT EXISTS idx_alumni_event_type ON alumni_event_registrations(participant_type);

----------------------------------------------------------------------
-- 4. RLS Policies
----------------------------------------------------------------------

-- Grant Tracking RLS
ALTER TABLE grant_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grant_tracking_select_company"
  ON grant_tracking FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "grant_tracking_insert_company"
  ON grant_tracking FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "grant_tracking_update_company"
  ON grant_tracking FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "grant_tracking_delete_company"
  ON grant_tracking FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('admin', 'owner')
    )
  );

-- Alumni Marketing Tasks RLS
ALTER TABLE alumni_marketing_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alumni_marketing_select_company"
  ON alumni_marketing_tasks FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "alumni_marketing_insert_company"
  ON alumni_marketing_tasks FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "alumni_marketing_update_company"
  ON alumni_marketing_tasks FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "alumni_marketing_delete_company"
  ON alumni_marketing_tasks FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('admin', 'owner')
    )
  );

-- Alumni Event Registrations RLS
ALTER TABLE alumni_event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alumni_event_select_company"
  ON alumni_event_registrations FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "alumni_event_insert_company"
  ON alumni_event_registrations FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "alumni_event_update_company"
  ON alumni_event_registrations FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "alumni_event_delete_company"
  ON alumni_event_registrations FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'active'
        AND role IN ('admin', 'owner')
    )
  );

----------------------------------------------------------------------
-- 5. Form Registry entries
----------------------------------------------------------------------
INSERT INTO form_registry (form_type, display_name, department, source_table, app_path)
VALUES
  ('ashes_to_glory_grant', 'Ashes to Glory Grant Tracking', 'Accounting', 'grant_tracking', '/app/forms/ashes-to-glory-grant'),
  ('conrads_claws_grant', 'Conrad''s Claws Grant Tracking', 'Accounting', 'grant_tracking', '/app/forms/conrads-claws-grant'),
  ('alumni_marketing', 'Alumni Marketing Needs', 'Accounting', 'alumni_marketing_tasks', '/app/forms/alumni-marketing'),
  ('alumni_weekend_2026', 'Alumni Weekend 2026', 'Accounting', 'alumni_event_registrations', '/app/forms/alumni-weekend-2026')
ON CONFLICT (form_type) DO NOTHING;

----------------------------------------------------------------------
-- 6. Monday Form Board Map entries
----------------------------------------------------------------------
INSERT INTO monday_form_board_map (form_type, monday_board_id, company_id, notes)
VALUES
  ('ashes_to_glory_grant', '18392152872', '9ea3677d-be6c-46df-a41c-d22f01e88756', 'Ashes to Glory Grant Tracking - 8 items migrated from Monday.com'),
  ('conrads_claws_grant', '18395099225', '9ea3677d-be6c-46df-a41c-d22f01e88756', 'Conrad''s Claws Grant Tracking - 7 items migrated from Monday.com'),
  ('alumni_marketing', '4052171541', '9ea3677d-be6c-46df-a41c-d22f01e88756', 'Alumni Marketing Needs - 41 items migrated from Monday.com'),
  ('alumni_weekend_2026', '18120122979', '9ea3677d-be6c-46df-a41c-d22f01e88756', 'Alumni Weekend 2026 - 64 items migrated from Monday.com')
ON CONFLICT DO NOTHING;

----------------------------------------------------------------------
-- 7. Module Admins (owner + 3 admins for each form)
----------------------------------------------------------------------
-- Jennifer MacArthur as owner
INSERT INTO intranet_module_admins (form_type, user_id, role, company_id)
VALUES
  ('ashes_to_glory_grant', 'e79b8c6f-6f5f-49fe-8fec-267d4b451a97', 'owner', '9ea3677d-be6c-46df-a41c-d22f01e88756'),
  ('conrads_claws_grant', 'e79b8c6f-6f5f-49fe-8fec-267d4b451a97', 'owner', '9ea3677d-be6c-46df-a41c-d22f01e88756'),
  ('alumni_marketing', 'e79b8c6f-6f5f-49fe-8fec-267d4b451a97', 'owner', '9ea3677d-be6c-46df-a41c-d22f01e88756'),
  ('alumni_weekend_2026', 'e79b8c6f-6f5f-49fe-8fec-267d4b451a97', 'owner', '9ea3677d-be6c-46df-a41c-d22f01e88756')
ON CONFLICT DO NOTHING;

-- Devan Schanding as admin
INSERT INTO intranet_module_admins (form_type, user_id, role, company_id)
VALUES
  ('ashes_to_glory_grant', '659ba06e-75ff-47e4-b6cc-49fb1e4c8297', 'admin', '9ea3677d-be6c-46df-a41c-d22f01e88756'),
  ('conrads_claws_grant', '659ba06e-75ff-47e4-b6cc-49fb1e4c8297', 'admin', '9ea3677d-be6c-46df-a41c-d22f01e88756'),
  ('alumni_marketing', '659ba06e-75ff-47e4-b6cc-49fb1e4c8297', 'admin', '9ea3677d-be6c-46df-a41c-d22f01e88756'),
  ('alumni_weekend_2026', '659ba06e-75ff-47e4-b6cc-49fb1e4c8297', 'admin', '9ea3677d-be6c-46df-a41c-d22f01e88756')
ON CONFLICT DO NOTHING;

-- Heather Plain as admin
INSERT INTO intranet_module_admins (form_type, user_id, role, company_id)
VALUES
  ('ashes_to_glory_grant', '30c527c3-955a-4895-a0dd-d3c2943c4684', 'admin', '9ea3677d-be6c-46df-a41c-d22f01e88756'),
  ('conrads_claws_grant', '30c527c3-955a-4895-a0dd-d3c2943c4684', 'admin', '9ea3677d-be6c-46df-a41c-d22f01e88756'),
  ('alumni_marketing', '30c527c3-955a-4895-a0dd-d3c2943c4684', 'admin', '9ea3677d-be6c-46df-a41c-d22f01e88756'),
  ('alumni_weekend_2026', '30c527c3-955a-4895-a0dd-d3c2943c4684', 'admin', '9ea3677d-be6c-46df-a41c-d22f01e88756')
ON CONFLICT DO NOTHING;

-- John Panico as admin
INSERT INTO intranet_module_admins (form_type, user_id, role, company_id)
VALUES
  ('ashes_to_glory_grant', '597aa999-727e-412b-ad9d-76e28454e4a9', 'admin', '9ea3677d-be6c-46df-a41c-d22f01e88756'),
  ('conrads_claws_grant', '597aa999-727e-412b-ad9d-76e28454e4a9', 'admin', '9ea3677d-be6c-46df-a41c-d22f01e88756'),
  ('alumni_marketing', '597aa999-727e-412b-ad9d-76e28454e4a9', 'admin', '9ea3677d-be6c-46df-a41c-d22f01e88756'),
  ('alumni_weekend_2026', '597aa999-727e-412b-ad9d-76e28454e4a9', 'admin', '9ea3677d-be6c-46df-a41c-d22f01e88756')
ON CONFLICT DO NOTHING;

----------------------------------------------------------------------
-- 8. Form Settings (default settings for each form)
----------------------------------------------------------------------
INSERT INTO intranet_form_settings (form_type, company_id, settings)
VALUES
  ('ashes_to_glory_grant', '9ea3677d-be6c-46df-a41c-d22f01e88756', '{"notifications_enabled": true, "auto_archive_days": null}'::jsonb),
  ('conrads_claws_grant', '9ea3677d-be6c-46df-a41c-d22f01e88756', '{"notifications_enabled": true, "auto_archive_days": null}'::jsonb),
  ('alumni_marketing', '9ea3677d-be6c-46df-a41c-d22f01e88756', '{"notifications_enabled": true, "auto_archive_days": null}'::jsonb),
  ('alumni_weekend_2026', '9ea3677d-be6c-46df-a41c-d22f01e88756', '{"notifications_enabled": true, "auto_archive_days": null}'::jsonb)
ON CONFLICT DO NOTHING;

----------------------------------------------------------------------
-- 9. Data Migration from monday_import_items
----------------------------------------------------------------------

-- Ashes to Glory Grant Tracking (board_id: 18392152872)
INSERT INTO grant_tracking (company_id, program, patient_name, status, received,
  first_payment_amount, first_payment_notes, second_payment_amount, second_payment_notes,
  admission_date, discharge_date, total_grant_amount, monday_item_id, monday_board_id)
SELECT
  '9ea3677d-be6c-46df-a41c-d22f01e88756',
  'ashes_to_glory',
  mi.item_name,
  COALESCE(mi.column_values->>'Status', 'new'),
  CASE WHEN mi.column_values->>'Received' IS NOT NULL THEN true ELSE false END,
  (mi.column_values->>'1st Payment Amount')::numeric(12,2),
  mi.column_values->>'1st Payment Notes',
  (mi.column_values->>'2nd Payment Amount')::numeric(12,2),
  mi.column_values->>'2nd Payment Notes',
  CASE WHEN mi.column_values->>'Admission Date' IS NOT NULL
       THEN (mi.column_values->>'Admission Date')::date ELSE NULL END,
  CASE WHEN mi.column_values->>'Discharge Date' IS NOT NULL
       THEN (mi.column_values->>'Discharge Date')::date ELSE NULL END,
  (mi.column_values->>'Total Amount of Grant')::numeric(12,2),
  mi.item_id::text,
  '18392152872'
FROM monday_import_items mi
WHERE mi.board_id = '18392152872'
ON CONFLICT DO NOTHING;

-- Conrad's Claws Grant Tracking (board_id: 18395099225)
INSERT INTO grant_tracking (company_id, program, patient_name, status, received,
  invoice_number, notes, approved, date_approved,
  admission_date, discharge_date, total_grant_amount, monday_item_id, monday_board_id)
SELECT
  '9ea3677d-be6c-46df-a41c-d22f01e88756',
  'conrads_claws',
  mi.item_name,
  COALESCE(mi.column_values->>'Status', 'new'),
  false,
  mi.column_values->>'Text',
  mi.column_values->>'Notes',
  CASE WHEN mi.column_values->>'Approved' IS NOT NULL THEN true ELSE false END,
  CASE WHEN mi.column_values->>'Date Approved' IS NOT NULL
       THEN (mi.column_values->>'Date Approved')::date ELSE NULL END,
  CASE WHEN mi.column_values->>'Admission Date' IS NOT NULL
       THEN (mi.column_values->>'Admission Date')::date ELSE NULL END,
  CASE WHEN mi.column_values->>'Discharge Date' IS NOT NULL
       THEN (mi.column_values->>'Discharge Date')::date ELSE NULL END,
  (mi.column_values->>'Total Amount of Grant')::numeric(12,2),
  mi.item_id::text,
  '18395099225'
FROM monday_import_items mi
WHERE mi.board_id = '18395099225'
ON CONFLICT DO NOTHING;

-- Alumni Marketing Needs (board_id: 4052171541)
INSERT INTO alumni_marketing_tasks (company_id, item_name, month_name, people, person, status,
  monday_item_id, monday_board_id)
SELECT
  '9ea3677d-be6c-46df-a41c-d22f01e88756',
  mi.item_name,
  mi.column_values->>'Month',
  mi.column_values->>'People',
  mi.column_values->>'Person',
  COALESCE(mi.column_values->>'Status', 'new'),
  mi.item_id::text,
  '4052171541'
FROM monday_import_items mi
WHERE mi.board_id = '4052171541'
ON CONFLICT DO NOTHING;

-- Alumni Weekend 2026 (board_id: 18120122979)
INSERT INTO alumni_event_registrations (company_id, event_name, participant_name,
  email, phone, participant_type, invoice_status, invoiced_amount,
  facility_approval, financial_approval, lodging, scholarship_amount,
  monday_item_id, monday_board_id)
SELECT
  '9ea3677d-be6c-46df-a41c-d22f01e88756',
  'Alumni Weekend 2026',
  mi.item_name,
  mi.column_values->>'Email',
  mi.column_values->>'Phone',
  mi.column_values->>'Participant type',
  mi.column_values->>'Invoice/PandaDoc Status',
  (mi.column_values->>'Invoiced Amount')::numeric(12,2),
  mi.column_values->>'Facility Approval',
  mi.column_values->>'Financial Approval',
  mi.column_values->>'Lodging',
  (mi.column_values->>'Scholarship Amount')::numeric(12,2),
  mi.item_id::text,
  '18120122979'
FROM monday_import_items mi
WHERE mi.board_id = '18120122979'
ON CONFLICT DO NOTHING;

----------------------------------------------------------------------
-- 10. Updated_at trigger for all three tables
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER grant_tracking_updated_at
  BEFORE UPDATE ON grant_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER alumni_marketing_updated_at
  BEFORE UPDATE ON alumni_marketing_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER alumni_event_updated_at
  BEFORE UPDATE ON alumni_event_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
