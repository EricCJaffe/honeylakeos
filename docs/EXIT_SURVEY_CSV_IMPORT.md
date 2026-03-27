# Exit Survey CSV Import Procedure

**Purpose:** Import historical or updated exit survey responses from Typeform CSV export.

**Status:** Pre-go-live only. After go-live, all responses will be collected via the live `/exit-survey` form.

---

## Quick Start (For Future Imports)

### 1. Get the CSV File
- Download the latest Typeform export CSV
- File naming pattern: `responses-*.csv`
- Place in `~/Downloads/` or note the path

### 2. Run the Import Script

```bash
# Auto-detect latest CSV in Downloads
npx tsx scripts/import-exit-survey-csv.ts

# Or specify path explicitly
npx tsx scripts/import-exit-survey-csv.ts ~/Downloads/responses-XYZ.csv
```

### 3. Review Output

The script will:
- ✅ **Skip duplicates** automatically (matches on: first name + last name + submission date)
- ✅ **Insert only new entries**
- ✅ **Show progress** every 10 insertions
- ✅ **Report final counts**

Example output:
```
=== Exit Survey CSV Import ===

Reading: /Users/ericjaffe/Downloads/responses-XYZ.csv

✓ Connected to Supabase

Found 28 questions in DB (26 scored)

Found 333 existing submissions (will skip duplicates)

Parsed 154 rows from CSV

Column indices: submit=60, first=55, last=56

Progress: 10 inserted...
Progress: 20 inserted...
Progress: 30 inserted...

=== Import Complete ===
Total inserted : 34
Total skipped  : 119 (duplicates)
Total errors   : 0

Database now has: 367 total submissions
```

---

## How It Works

### Data Structure

The CSV export has this structure:
- **Column 0**: Typeform response ID
- **Columns 1-52**: Question pairs (score + comment) for 26 scored questions
- **Column 53**: Open-ended improvement feedback
- **Column 54**: Open-ended positive feedback
- **Column 55**: Patient first name
- **Column 56**: Patient last name
- **Column 57**: Response type ("completed")
- **Column 58**: Start date
- **Column 59**: (empty)
- **Column 60**: Submit date
- **Column 61**: Network ID
- **Column 62**: Tags
- **Column 63**: Ending message

### Deduplication Logic

Creates a unique key for each submission:
```
{firstName}|{lastName}|{submitDate (YYYY-MM-DD)}
```

If this key exists in the database, the submission is skipped.

**Why this works:**
- Same patient unlikely to submit twice on the same day
- Handles re-imports of overlapping date ranges
- No risk of duplicate data

### Database Operations

For each new submission:
1. **Insert to `exit_survey_submissions`**:
   - company_id, definition_id, submitted_at
   - patient_first_name, patient_last_name
   - open_ended_improvement, open_ended_positive
   - is_anonymous (true if no name provided)

2. **Insert to `exit_survey_responses`** (batch):
   - Links each scored answer to the submission
   - submission_id, question_id, score, comment

3. **Rollback on error**:
   - If responses fail to insert, orphaned submission is deleted
   - Ensures data integrity

---

## Troubleshooting

### Error: "CSV file not found"
```bash
# Check the path
ls -lh ~/Downloads/responses-*.csv

# Or specify full path
npx tsx scripts/import-exit-survey-csv.ts /full/path/to/file.csv
```

### Error: "Missing SUPABASE_URL"
```bash
# Ensure .env file exists with required vars
cat .env | grep SUPABASE

# Should show:
# VITE_SUPABASE_URL=https://umsibvxethuebdyjamxi.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### "Total inserted: 0" (all skipped)
This means all entries in the CSV are already in the database. ✅ No action needed.

### Errors during import
Check the console output for specific error messages. Common issues:
- Invalid date format → Script will use current date as fallback
- Missing question mapping → Check that active questions exist in DB
- RLS policy blocking → Ensure using service role key (not anon key)

---

## Pre-Go-Live Import History

| Import Date | CSV Date Range | Entries Added | Total in DB | Status |
|---|---|---|---|---|
| Feb 2026 | Aug 2024 - Jan 2026 | 333 | 333 | ✅ Complete |
| **Mar 27, 2026** | **Feb 2026 - Mar 26, 2026** | **34** | **367** | **✅ Complete** |
| *Future* | TBD | TBD | TBD | Pending |

---

## When to Remove This Tool

**After go-live:**
1. All new responses will come through the live `/exit-survey` form
2. No more manual imports will be needed
3. This script and documentation can be archived or deleted

**Post-go-live cleanup:**
```bash
# Optional: remove import scripts
git rm scripts/import-exit-survey-*.ts
git rm docs/EXIT_SURVEY_CSV_IMPORT.md
git commit -m "Remove pre-go-live import tools (no longer needed)"
```

---

## Claude Code Quick Prompt (For Future Use)

If you need to run another import, use this prompt:

> "Import the latest exit survey CSV from Downloads. The file is `responses-[ID].csv`. Use the script at `scripts/import-exit-survey-csv.ts`. Show me the duplicate count and how many new entries were added."

Claude will:
1. Find the CSV file
2. Run the import script
3. Report the results
4. Verify the database count

---

## Technical Notes

- **Script location:** `scripts/import-exit-survey-csv.ts`
- **Company ID:** `9ea3677d-be6c-46df-a41c-d22f01e88756` (Honey Lake Clinic)
- **Requires:** Service role key for full database access
- **Safe to re-run:** Deduplication prevents double-imports
- **Performance:** ~3-5 submissions per second
- **Database tables:**
  - `exit_survey_submissions` (main table)
  - `exit_survey_responses` (individual question answers)
  - `exit_survey_questions` (question definitions)
  - `exit_survey_definitions` (survey version)
