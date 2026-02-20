import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    owner_name: string | null;
  } | null;
  exit_survey_submissions?: {
    patient_first_name: string | null;
    patient_last_name: string | null;
    submitted_at: string;
  } | null;
};

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

    const now = new Date();
    const reminderThresholdHours = 48;

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

    const { data: alertsData, error: alertsError } = await supabase
      .from("exit_survey_alerts")
      .select(
        "id, question_id, submission_id, score, created_at, exit_survey_questions(text, owner_email, owner_name), exit_survey_submissions(patient_first_name, patient_last_name, submitted_at)"
      )
      .eq("company_id", company_id)
      .neq("status", "resolved");

    if (alertsError) throw alertsError;
    const alerts = (alertsData || []) as AlertRow[];

    const results: Record<string, unknown> = {};

    for (const alert of alerts) {
      const createdAt = new Date(alert.created_at);
      const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      if (ageHours < reminderThresholdHours) continue;

      const ownerEmail = alert.exit_survey_questions?.owner_email || adminEmail;
      if (!ownerEmail) continue;

      // Check last reminder comment
      const { data: commentData } = await supabase
        .from("exit_survey_alert_comments")
        .select("created_at, comment")
        .eq("alert_id", alert.id)
        .ilike("comment", "[Reminder]%")
        .order("created_at", { ascending: false })
        .limit(1);

      const lastReminder = commentData?.[0]?.created_at ? new Date(commentData[0].created_at) : null;
      if (lastReminder) {
        const hoursSinceLastReminder = (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastReminder < reminderThresholdHours) {
          continue;
        }
      }

      const patientName = getPatientName(alert.exit_survey_submissions);
      const link = appUrl ? `${appUrl}/app/exit-survey/submissions/${alert.submission_id}` : "#";

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color:#111;">
          <h2 style="margin:0 0 8px;">Reminder: Exit Survey Follow-Up Needed</h2>
          <p style="margin:0 0 12px;">Question: <strong>${alert.exit_survey_questions?.text ?? "Question"}</strong></p>
          <p style="margin:0 0 12px;">Score: <strong>${alert.score}</strong></p>
          <p style="margin:0 0 12px;">Patient: <strong>${patientName}</strong></p>
          <a href="${link}" style="color:#0f766e;">View response</a>
          <p style="margin-top:16px; font-size:12px; color:#6b7280;">This reminder repeats every 48–72 hours until the task is marked complete by an admin.</p>
        </div>
      `;

      await resend.emails.send({
        from: emailFrom,
        to: [ownerEmail],
        subject: "Reminder: Exit Survey Follow-Up Needed",
        html,
      });

      await supabase.from("exit_survey_alert_comments").insert({
        alert_id: alert.id,
        comment: `[Reminder] Follow-up reminder sent to ${ownerEmail} at ${now.toISOString()}`,
        author_id: null,
        author_name: "System",
      });

      results[alert.id] = { reminded: true, ownerEmail };
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("exit-survey-reminders error:", error);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
