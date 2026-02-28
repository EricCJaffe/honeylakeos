import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type QuestionRow = {
  id: string;
  text: string;
  department: string | null;
  owner_email: string | null;
  owner_name: string | null;
};

type ResponseRow = {
  question_id: string;
  score: number | null;
  exit_survey_submissions?: {
    submitted_at: string;
  } | null;
};

type AlertRow = {
  id: string;
  question_id: string;
  submission_id: string;
  score: number;
  created_at: string;
  exit_survey_questions?: {
    text: string;
    owner_email: string | null;
    department: string | null;
  } | null;
  exit_survey_submissions?: {
    patient_first_name: string | null;
    patient_last_name: string | null;
    submitted_at: string;
  } | null;
};

const REDACTED_PATIENT = "Withheld (PHI-safe mode)";
const REDACTED_QUESTION = "Question details redacted. Review in dashboard.";

function parseEmailList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 3 && email.includes("@"));
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getPatientName(submission?: AlertRow["exit_survey_submissions"]) {
  if (!submission) return "Anonymous";
  const first = submission.patient_first_name ?? "";
  const last = submission.patient_last_name ?? "";
  const full = `${first} ${last}`.trim();
  return full || "Anonymous";
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const appUrl = Deno.env.get("APP_URL");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const emailFrom = Deno.env.get("EMAIL_FROM") || "Honey Lake Clinic <noreply@honeylake.clinic>";

    if (!resendApiKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration incomplete." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { company_id }: { company_id: string } = await req.json();
    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: "company_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);
    const { data: settingsRows } = await supabase
      .from("exit_survey_settings")
      .select("key, value")
      .eq("company_id", company_id)
      .in("key", ["phi_safe_email_mode", "weekly_digest_recipient_emails"]);
    const settingsMap = new Map((settingsRows || []).map((row) => [row.key, row.value]));
    const phiSafeMode = (settingsMap.get("phi_safe_email_mode") ?? "false") === "true";
    const digestRecipientOverrides = parseEmailList(settingsMap.get("weekly_digest_recipient_emails"));

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    // Resolve admin fallback recipient
    const { data: adminMemberships } = await supabase
      .from("memberships")
      .select("user_id")
      .eq("company_id", company_id)
      .eq("role", "company_admin")
      .limit(1);

    let adminEmail: string | null = null;
    if (adminMemberships && adminMemberships[0]?.user_id) {
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", adminMemberships[0].user_id)
        .limit(1);
      adminEmail = adminProfiles?.[0]?.email ?? null;
    }

    // Load active questions and owners
    const { data: questionsData, error: questionError } = await supabase
      .from("exit_survey_questions")
      .select("id, text, department, owner_email, owner_name")
      .eq("company_id", company_id)
      .eq("is_active", true);

    if (questionError) throw questionError;
    const questions = (questionsData || []) as QuestionRow[];

    // Map owner -> question IDs
    const ownerMap = new Map<string, QuestionRow[]>();
    for (const q of questions) {
      const ownerEmail = q.owner_email || adminEmail;
      if (!ownerEmail) continue;
      const key = ownerEmail.toLowerCase();
      if (!ownerMap.has(key)) ownerMap.set(key, []);
      ownerMap.get(key)!.push(q);
    }

    const recipientMap = new Map<string, QuestionRow[]>();
    if (digestRecipientOverrides.length) {
      for (const recipient of digestRecipientOverrides) {
        recipientMap.set(recipient, questions);
      }
    } else {
      for (const [ownerEmail, ownerQuestions] of ownerMap.entries()) {
        recipientMap.set(ownerEmail, ownerQuestions);
      }
    }

    if (recipientMap.size === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No question owners configured." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Pull responses for last 7 days
    const { data: responsesData, error: responseError } = await supabase
      .from("exit_survey_responses")
      .select("question_id, score, exit_survey_submissions(submitted_at)")
      .eq("exit_survey_submissions.company_id", company_id)
      .gte("exit_survey_submissions.submitted_at", weekStart.toISOString())
      .lte("exit_survey_submissions.submitted_at", now.toISOString());

    if (responseError) throw responseError;
    const responses = (responsesData || []) as ResponseRow[];

    // Count submissions in last 7 days
    const { count: submissionCount } = await supabase
      .from("exit_survey_submissions")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company_id)
      .gte("submitted_at", weekStart.toISOString())
      .lte("submitted_at", now.toISOString());

    // Pull open alerts for last 7 days
    const { data: alertsData, error: alertsError } = await supabase
      .from("exit_survey_alerts")
      .select(
        "id, question_id, submission_id, score, created_at, exit_survey_questions(text, owner_email, department), exit_survey_submissions(patient_first_name, patient_last_name, submitted_at)"
      )
      .eq("company_id", company_id)
      .neq("status", "resolved")
      .gte("created_at", weekStart.toISOString());

    if (alertsError) throw alertsError;
    const alerts = (alertsData || []) as AlertRow[];

    // Build per-question averages for the week
    const questionStats = new Map<string, { total: number; count: number }>();
    for (const row of responses) {
      if (row.score === null) continue;
      const entry = questionStats.get(row.question_id) || { total: 0, count: 0 };
      entry.total += row.score;
      entry.count += 1;
      questionStats.set(row.question_id, entry);
    }

    const results: Record<string, unknown> = {};

    const usingOverrideRecipients = digestRecipientOverrides.length > 0;
    for (const [ownerEmail, ownerQuestions] of recipientMap.entries()) {
      const questionIds = ownerQuestions.map((q) => q.id);
      const ownerAlerts = alerts.filter(
        (a) =>
          questionIds.includes(a.question_id) &&
          (usingOverrideRecipients || a.exit_survey_questions?.owner_email?.toLowerCase() === ownerEmail)
      );

      const departmentNames = Array.from(
        new Set(ownerQuestions.map((q) => q.department || "General"))
      );

      const questionRows = ownerQuestions.map((q) => {
        const stats = questionStats.get(q.id);
        const avg = stats && stats.count > 0 ? (stats.total / stats.count).toFixed(2) : "—";
        const questionText = phiSafeMode ? REDACTED_QUESTION : q.text;
        return `<tr><td style="padding:4px 8px;">${questionText}</td><td style="padding:4px 8px; text-align:right;">${avg}</td></tr>`;
      });

      const alertItems = ownerAlerts.map((a) => {
        const patient = phiSafeMode ? REDACTED_PATIENT : getPatientName(a.exit_survey_submissions);
        const questionText = phiSafeMode ? REDACTED_QUESTION : (a.exit_survey_questions?.text ?? "Question");
        const link = appUrl ? `${appUrl}/app/exit-survey/submissions/${a.submission_id}` : "#";
        return `<li style="margin-bottom:6px;">
          <strong>${questionText}</strong> — Score ${a.score} (${patient})
          <a href="${link}" style="color:#0f766e; margin-left:6px;">View</a>
        </li>`;
      });

      const hasTasks = ownerAlerts.length > 0;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color:#111;">
          <h2 style="margin:0 0 8px;">Weekly Exit Survey Summary</h2>
          <p style="margin:0 0 12px;">Departments: ${departmentNames.join(", ")}</p>
          <p style="margin:0 0 16px;">Surveys completed in the last 7 days: <strong>${submissionCount ?? 0}</strong></p>
          <p style="margin:0 0 16px;">Open follow-ups this week: <strong>${ownerAlerts.length}</strong></p>

          <h3 style="margin:16px 0 8px;">Department Scores (Last 7 Days)</h3>
          <table style="width:100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr>
                <th style="text-align:left; padding:4px 8px; border-bottom:1px solid #e5e7eb;">Question</th>
                <th style="text-align:right; padding:4px 8px; border-bottom:1px solid #e5e7eb;">Avg</th>
              </tr>
            </thead>
            <tbody>
              ${questionRows.join("")}
            </tbody>
          </table>

          ${hasTasks ? `
            <h3 style="margin:16px 0 8px;">Assigned Follow-Ups</h3>
            <ul style="padding-left:18px; margin:0; font-size:13px;">
              ${alertItems.join("")}
            </ul>
          ` : `
            <p style="margin:16px 0; font-size:13px;">No action items this week. Please review your department scores above.</p>
          `}
        </div>
      `;

      const emailResponse = await resend.emails.send({
        from: emailFrom,
        to: [ownerEmail],
        subject: `Weekly Exit Survey Summary — ${formatDate(weekStart)} to ${formatDate(now)}`,
        html,
      });

      results[ownerEmail] = { sent: !!emailResponse, tasks: ownerAlerts.length };
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("exit-survey-weekly-digest error:", error);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
