-- Drop coaching module tables
-- The coaching and coaches modules have been removed from this deployment.
-- This migration cleans up all associated schema objects.

-- Drop coaching tables in dependency order (most dependent first)
DROP TABLE IF EXISTS coaching_assignment_instances CASCADE;
DROP TABLE IF EXISTS coaching_assignments CASCADE;
DROP TABLE IF EXISTS coaching_org_engagement_assignments CASCADE;
DROP TABLE IF EXISTS coaching_org_engagements CASCADE;
DROP TABLE IF EXISTS coaching_engagement_onboarding CASCADE;
DROP TABLE IF EXISTS coaching_engagements CASCADE;
DROP TABLE IF EXISTS coaching_dashboard_widgets CASCADE;
DROP TABLE IF EXISTS coaching_dashboards CASCADE;
DROP TABLE IF EXISTS coaching_permission_templates CASCADE;
DROP TABLE IF EXISTS coaching_coach_profiles CASCADE;
DROP TABLE IF EXISTS coaching_managers CASCADE;
DROP TABLE IF EXISTS coaching_coaches CASCADE;
DROP TABLE IF EXISTS coaching_org_memberships CASCADE;
DROP TABLE IF EXISTS coaching_orgs CASCADE;

-- Drop legacy coach tables if present
DROP TABLE IF EXISTS coach_assignments CASCADE;
DROP TABLE IF EXISTS coach_profiles CASCADE;

-- Remove coaching-related columns from shared tables (if they exist)
ALTER TABLE companies
  DROP COLUMN IF EXISTS created_by_coaching_org_id;

-- Drop RLS policies that reference coaching_engagement_id before dropping the column
DROP POLICY IF EXISTS notes_coaching_select ON notes;
DROP POLICY IF EXISTS notes_coaching_insert ON notes;
DROP POLICY IF EXISTS notes_coaching_update ON notes;

ALTER TABLE notes
  DROP COLUMN IF EXISTS coaching_engagement_id;

-- Remove coaching module flag rows from feature_flags (if any)
DELETE FROM feature_flags WHERE module_id IN ('coaching', 'coaches');

-- Remove coaches from company_modules (legacy module enablement)
DELETE FROM company_modules
  WHERE module_id IN (
    SELECT id FROM modules WHERE slug IN ('coaching', 'coaches')
  );

DELETE FROM modules WHERE slug IN ('coaching', 'coaches');;
