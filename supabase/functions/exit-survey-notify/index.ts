import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  alert_id: string;
}

const REDACTED_PATIENT = "Withheld (PHI-safe mode)";
const REDACTED_QUESTION = "Question details redacted. Review in dashboard.";

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate environment
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

    // 2. Initialize clients
    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Parse request
    const { alert_id }: NotifyRequest = await req.json();
    if (!alert_id) {
      return new Response(
        JSON.stringify({ success: false, error: "alert_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Fetching alert:", alert_id);

    // 4. Fetch alert with related question and submission
    const { data: alert, error: alertError } = await supabase
      .from("exit_survey_alerts")
      .select(`
        id,
        score,
        priority,
        status,
        created_at,
        exit_survey_questions (
          text,
          category,
          department,
          owner_name,
          owner_email
        ),
        exit_survey_submissions (
          company_id,
          patient_first_name,
          patient_last_name,
          submitted_at,
          is_anonymous,
          companies (id, name)
        )
      `)
      .eq("id", alert_id)
      .single();

    if (alertError || !alert) {
      console.error("Alert fetch error:", alertError);
      return new Response(
        JSON.stringify({ success: false, error: "Alert not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 5. Extract related data (handle array/object shape from Supabase)
    const rawQuestion = alert.exit_survey_questions as unknown;
    const rawSubmission = alert.exit_survey_submissions as unknown;

    const question = Array.isArray(rawQuestion) ? rawQuestion[0] : rawQuestion as {
      text: string;
      category: string;
      department: string | null;
      owner_name: string | null;
      owner_email: string | null;
    } | null;

    const submission = Array.isArray(rawSubmission) ? rawSubmission[0] : rawSubmission as {
      company_id: string;
      patient_first_name: string | null;
      patient_last_name: string | null;
      submitted_at: string;
      is_anonymous: boolean;
    } | null;

    if (!question?.owner_email) {
      return new Response(
        JSON.stringify({ success: false, error: "No owner email for this question" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const alertCompanyId = submission?.company_id ?? null;
    const { data: phiSafeSetting } = await supabase
      .from("exit_survey_settings")
      .select("value")
      .eq("company_id", alertCompanyId ?? "")
      .eq("key", "phi_safe_email_mode")
      .maybeSingle();
    const phiSafeMode = (phiSafeSetting?.value ?? "false") === "true";

    // 6. Build email content
    const priorityLabel = alert.priority === "high" ? "🔴 HIGH" : alert.priority === "normal" ? "🟡 NORMAL" : "🟢 LOW";
    const scoreLabel = `${alert.score}/5`;
    const patientName = submission?.is_anonymous || (!submission?.patient_first_name && !submission?.patient_last_name)
      ? "Anonymous patient"
      : `${submission?.patient_first_name ?? ""} ${submission?.patient_last_name ?? ""}`.trim();
    const patientLabel = phiSafeMode ? REDACTED_PATIENT : patientName;
    const questionLabel = phiSafeMode ? REDACTED_QUESTION : question.text;
    const submittedDate = submission?.submitted_at
      ? new Date(submission.submitted_at).toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        })
      : "Unknown date";
    const dashboardUrl = appUrl ? `${appUrl}/app/exit-survey` : "#";

    console.log("Sending alert email to:", question.owner_email);

    // 7. Send email
    const emailResponse = await resend.emails.send({
      from: emailFrom,
      to: [question.owner_email],
      subject: `[${priorityLabel}] Low score alert: ${question.category} — Honey Lake Clinic Exit Survey`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 24px 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">Exit Survey Alert</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 14px;">Honey Lake Clinic</p>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 15px; margin-bottom: 6px;">Hi ${question.owner_name ?? "Team"},</p>
              <p style="font-size: 15px; margin-bottom: 24px;">
                A patient submitted a low score on a question in your department.
              </p>

              <div style="background: #fef3f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 12px; color: #991b1b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Alert Details</p>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #666; width: 130px;">Priority</td>
                    <td style="padding: 4px 0; font-size: 13px; font-weight: 600;">${priorityLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #666;">Score</td>
                    <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #dc2626;">${scoreLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #666;">Category</td>
                    <td style="padding: 4px 0; font-size: 13px;">${question.category}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #666;">Department</td>
                    <td style="padding: 4px 0; font-size: 13px;">${question.department ?? "N/A"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #666;">Patient</td>
                    <td style="padding: 4px 0; font-size: 13px;">${patientLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #666;">Submitted</td>
                    <td style="padding: 4px 0; font-size: 13px;">${submittedDate}</td>
                  </tr>
                </table>
              </div>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 24px;">
                <p style="margin: 0 0 6px; font-size: 12px; color: #475569; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Question</p>
                <p style="margin: 0; font-size: 14px; font-style: italic; color: #1e293b;">"${questionLabel}"</p>
              </div>

              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: white; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px;">
                  View in Dashboard →
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
              <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
                This alert was generated automatically by the Honey Lake Clinic Exit Survey system.
                You are receiving this because you are listed as the owner for this question category.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("exit-survey-notify error:", error);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
