/**
 * Generate SQL INSERT statements from CSV
 * This outputs SQL that can be executed via Supabase MCP (bypasses RLS)
 */

import * as fs from "fs";
import * as path from "path";

const CSV_PATH = process.argv[2] || "";
const COMPANY_ID = "9ea3677d-be6c-46df-a41c-d22f01e88756";

// Simple CSV parser
function parseCSV(filePath: string): string[][] {
  const content = fs.readFileSync(filePath, "utf-8");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
    } else if (char === "\n" && !inQuotes) {
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      }
    } else if (char === "\r" && nextChar === "\n" && !inQuotes) {
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      }
      i++;
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

// Escape SQL strings
function sqlEscape(str: string | null): string {
  if (!str) return "NULL";
  return "'" + str.replace(/'/g, "''").replace(/\\/g, "\\\\") + "'";
}

// Parse date
function parseDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === "") {
    return new Date().toISOString();
  }
  const cleanDate = dateStr.replace(" (UTC)", "").trim();
  const date = new Date(cleanDate + " UTC");
  return date.toISOString();
}

async function main() {
  if (!CSV_PATH || !fs.existsSync(CSV_PATH)) {
    console.error("Usage: npx tsx scripts/generate-exit-survey-sql.ts /path/to/file.csv");
    process.exit(1);
  }

  const rows = parseCSV(CSV_PATH);
  const header = rows[0];
  const dataRows = rows.slice(1);

  const submitDateIdx = 60;
  const firstNameIdx = 55;
  const lastNameIdx = 56;
  const oe1Idx = firstNameIdx - 3;
  const oe2Idx = firstNameIdx - 2;

  console.log("-- Exit Survey CSV Import SQL");
  console.log(`-- Generated from: ${path.basename(CSV_PATH)}`);
  console.log(`-- Total rows: ${dataRows.length}\n`);

  // Filter for Feb/Mar 2026 entries only
  const newRows = dataRows.filter((row) => {
    const submitDate = row[submitDateIdx];
    return submitDate && (submitDate.includes("2026-02-") || submitDate.includes("2026-03-"));
  });

  console.log(`-- New entries (Feb-Mar 2026): ${newRows.length}\n`);

  for (let i = 0; i < newRows.length; i++) {
    const row = newRows[i];
    const firstName = row[firstNameIdx]?.trim() || null;
    const lastName = row[lastNameIdx]?.trim() || null;
    const submittedAt = parseDate(row[submitDateIdx]);
    const openEndedImprovement = row[oe1Idx]?.trim() || null;
    const openEndedPositive = row[oe2Idx]?.trim() || null;
    const isAnonymous = !firstName && !lastName;

    console.log(`-- Entry ${i + 1}: ${firstName} ${lastName} (${submittedAt.slice(0, 10)})`);
    console.log(`INSERT INTO exit_survey_submissions (`);
    console.log(`  company_id, definition_id, submitted_at,`);
    console.log(`  patient_first_name, patient_last_name,`);
    console.log(`  open_ended_improvement, open_ended_positive, is_anonymous`);
    console.log(`) VALUES (`);
    console.log(`  '${COMPANY_ID}',`);
    console.log(`  (SELECT id FROM exit_survey_definitions WHERE company_id = '${COMPANY_ID}' AND is_active = true LIMIT 1),`);
    console.log(`  '${submittedAt}',`);
    console.log(`  ${sqlEscape(firstName)}, ${sqlEscape(lastName)},`);
    console.log(`  ${sqlEscape(openEndedImprovement)}, ${sqlEscape(openEndedPositive)}, ${isAnonymous}`);
    console.log(`) RETURNING id;\n`);
  }

  console.log(`\n-- Total submissions to insert: ${newRows.length}`);
}

main();
