/**
 * Exit Survey CSV Import
 *
 * Imports exit survey responses from Typeform CSV export.
 * Automatically deduplicates against existing database entries.
 *
 * Usage:
 *   export CSV_PATH="/path/to/responses.csv"
 *   npx tsx scripts/import-exit-survey-csv.ts
 *
 * Or just run with the CSV in ~/Downloads:
 *   npx tsx scripts/import-exit-survey-csv.ts ~/Downloads/responses-*.csv
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ============================================================
// Configuration
// ============================================================

const COMPANY_ID = "9ea3677d-be6c-46df-a41c-d22f01e88756";

// CSV path from args or env
const CSV_PATH =
  process.argv[2] ||
  process.env.CSV_PATH ||
  (() => {
    // Try to find the most recent CSV in Downloads
    const downloadsDir = path.join(process.env.HOME || "~", "Downloads");
    const files = fs
      .readdirSync(downloadsDir)
      .filter((f) => f.startsWith("responses-") && f.endsWith(".csv"))
      .map((f) => ({
        name: f,
        path: path.join(downloadsDir, f),
        mtime: fs.statSync(path.join(downloadsDir, f)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    return files[0]?.path || "";
  })();

// Load Supabase credentials from .env
const SUPABASE_URL = process.env.SUPABASE_URL || loadEnvVar("VITE_SUPABASE_URL");
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  loadEnvVar("SUPABASE_SERVICE_ROLE_KEY") ||
  loadEnvVar("VITE_SUPABASE_PUBLISHABLE_KEY");

function loadEnvVar(key: string): string {
  // Check .env.local first, then .env
  for (const fileName of [".env.local", ".env"]) {
    const envPath = path.resolve(process.cwd(), fileName);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const match = content.match(new RegExp(`^${key}=(.+)$`, "m"));
      if (match) return match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return "";
}

// ============================================================
// CSV Parsing
// ============================================================

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
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
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
      i++; // Skip \n
    } else {
      currentField += char;
    }
  }

  // Push final row if exists
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

// ============================================================
// Date parsing
// ============================================================

function parseDate(dateStr: string): string {
  // Parse "2026-03-26 15:46:02" format
  if (!dateStr || dateStr.trim() === "") {
    return new Date().toISOString();
  }

  // Handle UTC suffix if present
  const cleanDate = dateStr.replace(" (UTC)", "").trim();
  const date = new Date(cleanDate + " UTC");

  if (isNaN(date.getTime())) {
    console.warn(`Invalid date: ${dateStr}, using current time`);
    return new Date().toISOString();
  }

  return date.toISOString();
}

// ============================================================
// Main import function
// ============================================================

async function main() {
  console.log("=== Exit Survey CSV Import ===\n");

  // 1. Validate CSV file
  if (!CSV_PATH || !fs.existsSync(CSV_PATH)) {
    console.error(`ERROR: CSV file not found`);
    console.error(`Provide path as argument: npx tsx scripts/import-exit-survey-csv.ts /path/to/file.csv`);
    console.error(`Or set CSV_PATH env var`);
    process.exit(1);
  }
  console.log(`Reading: ${CSV_PATH}\n`);

  // 2. Validate Supabase credentials
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    console.error("Set these in your .env file");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log("✓ Connected to Supabase\n");

  // 3. Fetch questions from DB to build question_number → question_id map
  const { data: questions, error: qErr } = await supabase
    .from("exit_survey_questions")
    .select("id, question_number, text, type")
    .eq("company_id", COMPANY_ID)
    .eq("is_active", true)
    .order("question_number", { ascending: true });

  if (qErr || !questions) {
    console.error("ERROR: Failed to fetch questions:", qErr?.message);
    process.exit(1);
  }

  const questionByNumber: Record<number, { id: string; type: string }> = {};
  for (const q of questions) {
    questionByNumber[q.question_number] = { id: q.id, type: q.type };
  }

  const scoredCount = questions.filter((q) => q.type === "scored").length;
  console.log(`Found ${questions.length} questions in DB (${scoredCount} scored)\n`);

  // 4. Fetch existing submissions for deduplication
  const { data: existingSubmissions } = await supabase
    .from("exit_survey_submissions")
    .select("patient_first_name, patient_last_name, submitted_at")
    .eq("company_id", COMPANY_ID);

  const existingKeys = new Set<string>();
  for (const s of existingSubmissions || []) {
    existingKeys.add(
      `${s.patient_first_name ?? ""}|${s.patient_last_name ?? ""}|${s.submitted_at?.slice(0, 10)}`
    );
  }
  console.log(`Found ${existingKeys.size} existing submissions (will skip duplicates)\n`);

  // 5. Fetch active definition
  const { data: defData } = await supabase
    .from("exit_survey_definitions")
    .select("id")
    .eq("company_id", COMPANY_ID)
    .eq("is_active", true)
    .single();

  const definitionId = defData?.id ?? null;

  // 6. Parse CSV
  const rows = parseCSV(CSV_PATH);
  console.log(`Parsed ${rows.length} rows from CSV\n`);

  if (rows.length <= 1) {
    console.log("No data rows found (only header)");
    process.exit(0);
  }

  const header = rows[0];
  const dataRows = rows.slice(1);

  // Find column indices (submit date is typically near the end)
  const submitDateIdx = header.findIndex((h) =>
    h.toLowerCase().includes("submit date")
  );
  const firstNameIdx = header.findIndex((h) =>
    h.toLowerCase().includes("first name")
  );
  const lastNameIdx = header.findIndex((h) =>
    h.toLowerCase().includes("last name")
  );

  console.log(`Column indices: submit=${submitDateIdx}, first=${firstNameIdx}, last=${lastNameIdx}\n`);

  // 7. Process rows
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const row of dataRows) {
    try {
      // Get metadata
      const firstName = row[firstNameIdx]?.trim() || null;
      const lastName = row[lastNameIdx]?.trim() || null;
      const submittedAt = parseDate(row[submitDateIdx]);

      // Check deduplication
      const dedupKey = `${firstName ?? ""}|${lastName ?? ""}|${submittedAt.slice(0, 10)}`;
      if (existingKeys.has(dedupKey)) {
        totalSkipped++;
        continue;
      }

      // Find improvement and positive feedback columns (near the end, before names)
      const oe1Idx = firstNameIdx - 3; // "What could have improved your stay"
      const oe2Idx = firstNameIdx - 2; // "What has positively impacted your stay"

      const openEndedImprovement = row[oe1Idx]?.trim() || null;
      const openEndedPositive = row[oe2Idx]?.trim() || null;

      // Parse scored question responses (columns 1 to oe1Idx-1, in pairs)
      const numPairs = Math.floor((oe1Idx - 1) / 2);
      const responseRows: { question_id: string; score: number; comment: string | null }[] = [];

      for (let qNum = 1; qNum <= numPairs; qNum++) {
        const scoreCol = 1 + (qNum - 1) * 2;
        const commentCol = scoreCol + 1;

        const rawScore = row[scoreCol];
        const score = parseInt(String(rawScore), 10);

        if (isNaN(score) || score < 1 || score > 5) continue;

        const q = questionByNumber[qNum];
        if (!q || q.type !== "scored") continue;

        const comment = row[commentCol]?.trim() || null;
        responseRows.push({ question_id: q.id, score, comment });
      }

      if (responseRows.length === 0) {
        totalSkipped++;
        continue;
      }

      // Insert submission
      const { data: sub, error: subErr } = await supabase
        .from("exit_survey_submissions")
        .insert({
          company_id: COMPANY_ID,
          definition_id: definitionId,
          submitted_at: submittedAt,
          patient_first_name: firstName,
          patient_last_name: lastName,
          open_ended_improvement: openEndedImprovement,
          open_ended_positive: openEndedPositive,
          is_anonymous: !firstName && !lastName,
        })
        .select("id")
        .single();

      if (subErr || !sub) {
        console.error(
          `Error inserting submission for ${firstName} ${lastName}: ${subErr?.message}`
        );
        totalErrors++;
        continue;
      }

      // Insert responses in batch
      const { error: respErr } = await supabase
        .from("exit_survey_responses")
        .insert(
          responseRows.map((r) => ({
            submission_id: sub.id,
            question_id: r.question_id,
            score: r.score,
            comment: r.comment,
          }))
        );

      if (respErr) {
        // Rollback by deleting the orphaned submission
        await supabase.from("exit_survey_submissions").delete().eq("id", sub.id);
        console.error(
          `Error inserting responses for ${firstName} ${lastName}: ${respErr.message}`
        );
        totalErrors++;
        continue;
      }

      existingKeys.add(dedupKey);
      totalInserted++;

      // Log progress every 10 insertions
      if (totalInserted % 10 === 0) {
        console.log(`Progress: ${totalInserted} inserted...`);
      }
    } catch (err) {
      console.error(`Row error:`, err);
      totalErrors++;
    }
  }

  console.log("\n=== Import Complete ===");
  console.log(`Total inserted : ${totalInserted}`);
  console.log(`Total skipped  : ${totalSkipped} (duplicates)`);
  console.log(`Total errors   : ${totalErrors}`);

  // Verify count
  const { count } = await supabase
    .from("exit_survey_submissions")
    .select("*", { count: "exact", head: true })
    .eq("company_id", COMPANY_ID);

  console.log(`\nDatabase now has: ${count} total submissions`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
