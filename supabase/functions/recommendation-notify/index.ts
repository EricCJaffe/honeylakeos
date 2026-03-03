import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  recommendation_id: string;
  /** Optional override recipient emails (comma-separated) */
  recipient_emails?: string;
}

const TYPE_LABELS: Record<string, string> = {
  task: "Task",
  project: "Project",
  calendar_event: "Calendar Event",
  note_prompt: "Note Prompt",
  document_prompt: "Document Prompt",
  framework_change_suggestion: "Framework Change Suggestion",
};

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
    const emailFrom =
      Deno.env.get("EMAIL_FROM") ||
      "Honey Lake Clinic <noreply@honeylake.clinic>";

    if (!resendApiKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Server configuration incomplete.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // 2. Initialize clients
    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Parse request
    const body: NotifyRequest = await req.json();
    if (!body.recommendation_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "recommendation_id is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Fetching recommendation:", body.recommendation_id);

    // 4. Fetch recommendation
    const { data: rec, error: recError } = await supabase
      .from("coach_recommendations")
      .select("*")
      .eq("id", body.recommendation_id)
      .single();

    if (recError || !rec) {
      console.error("Recommendation fetch error:", recError);
      return new Response(
        JSON.stringify({ success: false, error: "Recommendation not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // 5. Resolve recipient emails
    //    - If override provided, use that
    //    - Otherwise look up admins of the target company
    let recipientEmails: string[] = [];

    if (body.recipient_emails) {
      recipientEmails = body.recipient_emails
        .split(",")
        .map((e: string) => e.trim())
        .filter(Boolean);
    }

    if (recipientEmails.length === 0) {
      // Fall back to company admins
      const { data: adminMembers } = await supabase
        .from("memberships")
        .select("user_id")
        .eq("company_id", rec.target_company_id)
        .in("role", ["admin", "Company_Admin"]);

      if (adminMembers && adminMembers.length > 0) {
        const userIds = adminMembers.map(
          (m: { user_id: string }) => m.user_id
        );
        // Fetch emails from auth.users via admin API
        for (const uid of userIds) {
          const {
            data: { user },
          } = await supabase.auth.admin.getUserById(uid);
          if (user?.email) {
            recipientEmails.push(user.email);
          }
        }
      }
    }

    if (recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No recipient emails found for target company",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // 6. Fetch target company name
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", rec.target_company_id)
      .single();

    const companyName = company?.name || "your organization";
    const typeLabel =
      TYPE_LABELS[rec.recommendation_type] || rec.recommendation_type;
    const createdDate = new Date(rec.created_at).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const dashboardUrl = appUrl
      ? `${appUrl}/app/recommendations`
      : "#";

    console.log("Sending recommendation email to:", recipientEmails);

    // 7. Send email
    const emailResponse = await resend.emails.send({
      from: emailFrom,
      to: recipientEmails,
      subject: `New Recommendation: ${rec.title} — ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 24px 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">New Coaching Recommendation</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 14px;">${companyName}</p>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 15px; margin-bottom: 6px;">Hi Team,</p>
              <p style="font-size: 15px; margin-bottom: 24px;">
                A new recommendation has been shared with ${companyName}. Please review and respond.
              </p>

              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 12px; color: #166534; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Recommendation Details</p>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #666; width: 100px;">Title</td>
                    <td style="padding: 4px 0; font-size: 13px; font-weight: 600;">${rec.title}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #666;">Type</td>
                    <td style="padding: 4px 0; font-size: 13px;">${typeLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #666;">Date</td>
                    <td style="padding: 4px 0; font-size: 13px;">${createdDate}</td>
                  </tr>
                </table>
              </div>

              ${
                rec.description
                  ? `
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 24px;">
                <p style="margin: 0 0 6px; font-size: 12px; color: #475569; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Description</p>
                <p style="margin: 0; font-size: 14px; color: #1e293b;">${rec.description}</p>
              </div>
              `
                  : ""
              }

              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: white; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px;">
                  Review in Dashboard
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
              <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
                This notification was generated by the coaching recommendation system.
                You can accept or decline this recommendation from the Recommendations page.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        recipients: recipientEmails.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("recommendation-notify error:", error);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
