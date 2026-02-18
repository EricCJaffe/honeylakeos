/**
 * Exit Survey Historical Data Import
 *
 * Reads Exit_Survey_Trends_2026.xlsx (monthly sheets Aug2024–Jan2026)
 * and inserts historical submissions + responses into Supabase.
 *
 * Column structure per sheet:
 *   Col 0: response_id (Typeform)
 *   Cols 1,2: Q1 score + comment
 *   Cols 3,4: Q2 score + comment
 *   ... (26 pairs = cols 1-52)
 *   Col 53: Q27 open-ended (improvement)
 *   Col 54: Q28 open-ended (positive)
 *   Col 55: first_name
 *   Col 56: last_name
 *   Col 57: response_type
 *   Col 58: start_date (Excel serial)
 *   Col 59: (empty)
 *   Col 60: submit_date (Excel serial)
 *
 * Run: npx tsx scripts/import-exit-survey-history.ts
 */

import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ============================================================
// Configuration
// ============================================================

const COMPANY_ID = "9ea3677d-be6c-46df-a41c-d22f01e88756";
const XLSX_PATH = process.env.XLSX_PATH || path.resolve(
  process.env.HOME || "~",
  "Downloads/Exit_Survey_Trends_2026.xlsx"
);

// Load Supabase credentials from .env or environment
// Prefers service role key (bypasses RLS for full dedup) but falls back to anon key
const SUPABASE_URL = process.env.SUPABASE_URL || loadEnvVar("VITE_SUPABASE_URL");
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  loadEnvVar("SUPABASE_SERVICE_ROLE_KEY") ||
  loadEnvVar("VITE_SUPABASE_PUBLISHABLE_KEY") ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const USING_ANON_KEY = !process.env.SUPABASE_SERVICE_ROLE_KEY && !loadEnvVar("SUPABASE_SERVICE_ROLE_KEY");

function loadEnvVar(key: string): string {
  // Try reading from .env file in project root
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    const match = content.match(new RegExp(`^${key}=(.+)$`, "m"));
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

// ============================================================
// Excel date conversion
// ============================================================

function excelDateToIso(serial: number): string {
  // Excel serial number to JS Date
  // 25569 = days from 1/1/1900 to 1/1/1970 (Excel uses 1/1/1900 epoch, with 1900-leap-year bug)
  const ms = (serial - 25569) * 86400 * 1000;
  return new Date(ms).toISOString();
}

// ============================================================
// Sheet name detection — only monthly data sheets
// ============================================================

const MONTH_PATTERN = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\d{4}$/;

function isDataSheet(name: string): boolean {
  return MONTH_PATTERN.test(name);
}

function sheetNameToDate(name: string): Date {
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const month = months[name.slice(0, 3)];
  const year = parseInt(name.slice(3), 10);
  return new Date(year, month, 1);
}

// ============================================================
// Main import function
// ============================================================

async function main() {
  console.log("=== Exit Survey Historical Import ===\n");

  // 1. Validate XLSX file
  if (!fs.existsSync(XLSX_PATH)) {
    console.error(`ERROR: XLSX file not found at: ${XLSX_PATH}`);
    console.error("Set XLSX_PATH env var or place file at ~/Downloads/Exit_Survey_Trends_2026.xlsx");
    process.exit(1);
  }
  console.log(`Reading: ${XLSX_PATH}`);

  // 2. Validate Supabase credentials
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("ERROR: Missing SUPABASE_URL or key");
    console.error("Set SUPABASE_SERVICE_ROLE_KEY in environment for full access.");
    console.error("Or the anon key will be used (VITE_SUPABASE_PUBLISHABLE_KEY from .env).");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  if (USING_ANON_KEY) {
    console.log("⚠  Using anon key — deduplication check disabled (anon can't SELECT submissions)");
    console.log("   For full dedup, set SUPABASE_SERVICE_ROLE_KEY env var\n");
  } else {
    console.log("✓ Using service role key\n");
  }

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

  // 4. Fetch existing submissions for deduplication (only if using service key)
  const existingKeys = new Set<string>();
  if (!USING_ANON_KEY) {
    const { data: existingSubmissions } = await supabase
      .from("exit_survey_submissions")
      .select("patient_first_name, patient_last_name, submitted_at")
      .eq("company_id", COMPANY_ID);

    for (const s of existingSubmissions || []) {
      existingKeys.add(`${s.patient_first_name ?? ""}|${s.patient_last_name ?? ""}|${s.submitted_at?.slice(0, 10)}`);
    }
    console.log(`Found ${existingKeys.size} existing submissions (will skip duplicates)\n`);
  }

  // 5. Fetch active definition
  const { data: defData } = await supabase
    .from("exit_survey_definitions")
    .select("id")
    .eq("company_id", COMPANY_ID)
    .eq("is_active", true)
    .single();

  const definitionId = defData?.id ?? null;

  // 6. Open workbook
  const wb = XLSX.readFile(XLSX_PATH);
  const dataSheets = wb.SheetNames
    .filter(isDataSheet)
    .sort((a, b) => sheetNameToDate(a).getTime() - sheetNameToDate(b).getTime());

  console.log(`Found ${dataSheets.length} monthly data sheets: ${dataSheets.join(", ")}\n`);

  // 7. Process each sheet
  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const sheetName of dataSheets) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
      raw: true,
    }) as (string | number)[][];

    if (rows.length <= 1) {
      console.log(`${sheetName}: empty, skipping`);
      continue;
    }

    // Data starts at row 1 (row 0 is header)
    const dataRows = rows.slice(1).filter((r) => r[0] !== ""); // skip blank rows

    let sheetInserted = 0;
    let sheetSkipped = 0;
    let sheetErrors = 0;

    for (const row of dataRows) {
      try {
        // Detect column layout dynamically by finding "completed" as anchor
        // Structure: 0=resp_id, then pairs [score,comment] for Q1..Qn,
        //            then open_ended_improvement, open_ended_positive,
        //            first_name, last_name, "completed", start_date, "", submit_date, form_id

        const completedIdx = row.findIndex(
          (v) => String(v).toLowerCase() === "completed"
        );

        if (completedIdx < 5) {
          sheetSkipped++;
          continue;
        }

        const lastNameIdx = completedIdx - 1;
        const firstNameIdx = completedIdx - 2;
        const oe2Idx = completedIdx - 3;
        const oe1Idx = completedIdx - 4;
        const submitDateIdx = completedIdx + 3;

        // Parse submit date
        let submittedAt: string;
        const rawDate = row[submitDateIdx];
        if (typeof rawDate === "number" && rawDate > 0) {
          submittedAt = excelDateToIso(rawDate);
        } else {
          submittedAt = new Date(sheetNameToDate(sheetName).setDate(15)).toISOString();
        }

        const firstName = String(row[firstNameIdx] ?? "").trim() || null;
        const lastName = String(row[lastNameIdx] ?? "").trim() || null;

        // Check deduplication
        const dedupKey = `${firstName ?? ""}|${lastName ?? ""}|${submittedAt.slice(0, 10)}`;
        if (existingKeys.has(dedupKey)) {
          sheetSkipped++;
          continue;
        }

        const openEndedImprovement = String(row[oe1Idx] ?? "").trim() || null;
        const openEndedPositive = String(row[oe2Idx] ?? "").trim() || null;

        // Scored question pairs: index 1 to oe1Idx-1 (two cols per question)
        const numPairs = Math.floor((oe1Idx - 1) / 2);

        // Build responses array
        const responseRows: { question_id: string; score: number; comment: string | null }[] = [];

        for (let qNum = 1; qNum <= numPairs; qNum++) {
          const scoreCol = 1 + (qNum - 1) * 2;
          const commentCol = scoreCol + 1;

          const rawScore = row[scoreCol];
          const score = typeof rawScore === "number"
            ? Math.round(rawScore)
            : parseInt(String(rawScore), 10);

          if (isNaN(score) || score < 1 || score > 5) continue;

          const q = questionByNumber[qNum];
          if (!q || q.type !== "scored") continue;

          const comment = String(row[commentCol] ?? "").trim() || null;
          responseRows.push({ question_id: q.id, score, comment });
        }

        if (responseRows.length === 0) {
          sheetSkipped++;
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
          console.error(`  [${sheetName}] Insert submission error: ${subErr?.message}`);
          sheetErrors++;
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
          console.error(`  [${sheetName}] Insert responses error: ${respErr.message}`);
          sheetErrors++;
          continue;
        }

        existingKeys.add(dedupKey);
        sheetInserted++;

      } catch (err) {
        console.error(`  [${sheetName}] Row error:`, err);
        sheetErrors++;
      }
    }

    console.log(
      `${sheetName.padEnd(10)}: ${sheetInserted} inserted, ${sheetSkipped} skipped, ${sheetErrors} errors`
    );

    totalInserted += sheetInserted;
    totalSkipped += sheetSkipped;
    totalErrors += sheetErrors;
  }

  console.log("\n=== Import Complete ===");
  console.log(`Total inserted : ${totalInserted}`);
  console.log(`Total skipped  : ${totalSkipped}`);
  console.log(`Total errors   : ${totalErrors}`);
  console.log("\nRun 'select count(*) from exit_survey_submissions' in Supabase to verify.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
