# Session Handoff — Monday.com Board Migration

**Date:** 2026-10-01
**Branch:** `claude/sync-supabase-vercel-setup-r75o4` on `EricCJaffe/honeylakeos`
**Last commit:** `b706461` — "Add Monday.com board migration for grant tracking and alumni boards"

---

## What Was Done

### 1. Listening Session Page (COMPLETE & MERGED)
- Built `/app/listening` page with By Question and By Theme tabs
- Files: `src/pages/app/listening/ListeningSessionPage.tsx`, `src/hooks/useListeningSessions.ts`
- Added route in `src/App.tsx`, nav item in `src/lib/navigationConfig.ts`
- Committed and pushed

### 2. Monday.com Board Migration SQL (WRITTEN, NOT YET APPLIED)
- **File:** `supabase/migrations/20261001150000_monday_board_migration_grant_alumni.sql`
- Creates 3 new tables with RLS policies:
  - `grant_tracking` — shared by Ashes to Glory + Conrad's Claws (distinguished by `program` column)
  - `alumni_marketing_tasks` — Alumni Marketing Needs
  - `alumni_event_registrations` — Alumni Weekend 2026
- Inserts into: `form_registry`, `monday_form_board_map`, `intranet_module_admins`, `intranet_form_settings`
- Migrates data from `monday_import_items` into the new dedicated tables
- **Has NOT been applied to production** — MCP/Supabase connectivity was down

---

## What Needs To Be Done

### Priority 1: Apply the Migration
Run the migration SQL against production Supabase. The file is ready at:
`supabase/migrations/20261001150000_monday_board_migration_grant_alumni.sql`

**Before applying:** Verify column schemas of these existing tables match what the migration INSERTs into:
- `form_registry` — expects columns: `form_type`, `display_name`, `department`, `source_table`, `app_path`
- `monday_form_board_map` — expects: `form_type`, `monday_board_id`, `company_id`, `notes`
- `intranet_module_admins` — expects: `form_type`, `user_id`, `role`, `company_id`
- `intranet_form_settings` — expects: `form_type`, `company_id`, `settings` (jsonb)
- `monday_import_items` — expects: `board_id`, `item_id`, `item_name`, `column_values` (jsonb)

If column names differ, adjust the INSERT statements accordingly.

### Priority 2: Verify Data Migration
After applying, confirm row counts:
- `grant_tracking WHERE program = 'ashes_to_glory'` → should be 8
- `grant_tracking WHERE program = 'conrads_claws'` → should be 7
- `alumni_marketing_tasks` → should be 41
- `alumni_event_registrations` → should be 64

### Priority 3: HLC Construction Board Lookup
**User asked:** "There is one called HLC Construction Honey Lake Clinic — did we move it over?"
- Search `monday_boards` for board_name ILIKE '%construction%' or '%HLC%'
- Check if it has a corresponding `form_registry` entry and dedicated table
- Report back to user

### Priority 4: Full Monday.com Board Audit
- Query all rows from `monday_boards` (there are ~361 boards)
- Cross-reference against `monday_form_board_map` to find boards that have NOT been migrated
- Report any gaps to the user

---

## Key IDs

| Entity | ID |
|---|---|
| Company (Honey Lake Clinic) | `9ea3677d-be6c-46df-a41c-d22f01e88756` |
| Accounting Department | `223606de-4c95-4de2-a4f7-c18efa02fe32` |
| Jennifer MacArthur (owner) | `e79b8c6f-6f5f-49fe-8fec-267d4b451a97` |
| Devan Schanding (admin) | `659ba06e-75ff-47e4-b6cc-49fb1e4c8297` |
| Heather Plain (admin) | `30c527c3-955a-4895-a0dd-d3c2943c4684` |
| John Panico (admin) | `597aa999-727e-412b-ad9d-76e28454e4a9` |

## Board Details

| Board Name | Monday Board ID | Items | PHI/PII |
|---|---|---|---|
| Ashes to Glory Grant Tracking | 18392152872 | 8 | PHI (patient names, treatment dates, financials) |
| Conrad's Claws Grant Tracking | 18395099225 | 7 | PHI (patient names, treatment dates, financials) |
| Alumni Marketing Needs | 4052171541 | 41 | None |
| Alumni Weekend 2026 | 18120122979 | 64 | PII (email, phone) |

## Column Mappings (from monday_import_items.column_values jsonb)

**Ashes to Glory:** patient_name (item_name), Status, Received, 1st Payment Amount, 1st Payment Notes, 2nd Payment Amount, 2nd Payment Notes, Admission Date, Discharge Date, Total Amount of Grant

**Conrad's Claws:** patient_name (item_name), Text (invoice#), Notes, Status, Approved, Date Approved, Admission Date, Discharge Date, Total Amount of Grant

**Alumni Marketing Needs:** item_name, Month, People, Person, Status

**Alumni Weekend 2026:** participant_name (item_name), Email, Phone, Participant type, Invoice/PandaDoc Status, Invoiced Amount, Facility Approval, Financial Approval, Lodging, Scholarship Amount

---

## Notes
- All 4 boards are owned/managed by Jennifer MacArthur under the Accounting department
- The `form_registry`, `monday_form_board_map`, `intranet_module_admins`, and `intranet_form_settings` tables exist in production Supabase but NOT in local migration files — they were created directly in the DB
- The `update_updated_at_column()` trigger function may already exist — the migration uses CREATE OR REPLACE
- `docs/TASKS.md` has been updated with the new active items
