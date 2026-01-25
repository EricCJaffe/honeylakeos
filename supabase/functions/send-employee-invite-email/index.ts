import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendInviteRequest {
  invite_id: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate required environment variables
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const appUrl = Deno.env.get("APP_URL");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Get EMAIL_FROM from environment only - never from user input
    // Default to Resend's test address if not configured
    const emailFrom = Deno.env.get("EMAIL_FROM") || "BusinessOS <onboarding@resend.dev>";

    // Validate EMAIL_FROM format: either "email@domain.com" or "Name <email@domain.com>"
    const emailFormatRegex = /^(?:[^<]+<)?[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}>?$/;
    if (!emailFormatRegex.test(emailFrom)) {
      console.error("EMAIL_FROM has invalid format:", emailFrom.substring(0, 20) + "...");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email sender configuration is invalid. Please contact support." 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not set");
      return new Response(
        JSON.stringify({ success: false, error: "Email service is not configured. Please contact support." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!appUrl) {
      console.error("APP_URL is not set");
      return new Response(
        JSON.stringify({ success: false, error: "Application URL is not configured. Please contact support." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ success: false, error: "Backend configuration is incomplete. Please contact support." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 2. Initialize clients
    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Parse request
    const { invite_id }: SendInviteRequest = await req.json();

    if (!invite_id) {
      return new Response(
        JSON.stringify({ success: false, error: "invite_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Fetching invite:", invite_id);

    // 4. Fetch invite with employee and company info using explicit foreign key aliases
    const { data: invite, error: inviteError } = await supabase
      .from("employee_invites")
      .select(`
        id,
        email,
        token,
        expires_at,
        status,
        employee:employees!employee_invites_employee_id_fkey(full_name),
        company:companies!employee_invites_company_id_fkey(name)
      `)
      .eq("id", invite_id)
      .single();

    if (inviteError) {
      console.error("Error fetching invite:", inviteError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch invite: ${inviteError.message}` }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!invite) {
      return new Response(
        JSON.stringify({ success: false, error: "Invite not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (invite.status !== "pending") {
      return new Response(
        JSON.stringify({ success: false, error: `Invite is not pending (status: ${invite.status})` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 5. Extract nested data - handle both array and object shapes from Supabase
    const rawEmployee = invite.employee as unknown;
    const rawCompany = invite.company as unknown;
    
    // Supabase may return array or object depending on the relation
    const employeeData = Array.isArray(rawEmployee) 
      ? (rawEmployee[0] as { full_name: string } | undefined)
      : (rawEmployee as { full_name: string } | null);
    const companyData = Array.isArray(rawCompany)
      ? (rawCompany[0] as { name: string } | undefined)
      : (rawCompany as { name: string } | null);

    const companyName = companyData?.name || "the company";
    const employeeName = employeeData?.full_name || "there";

    console.log("Invite found:", {
      email: invite.email,
      company: companyName,
      employee: employeeName,
    });

    // 6. Build the invite URL
    const inviteUrl = `${appUrl}/invite?token=${invite.token}`;

    // 7. Format expiry date
    const expiryDate = new Date(invite.expires_at).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // 8. Send email via Resend
    console.log("Sending email to:", invite.email, "from:", emailFrom);

    const emailResponse = await resend.emails.send({
      from: emailFrom,
      to: [invite.email],
      subject: `You've been invited to join ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${employeeName},</p>
              <p style="font-size: 16px; margin-bottom: 20px;">
                You've been invited to join <strong>${companyName}</strong> as an employee.
              </p>
              <p style="font-size: 16px; margin-bottom: 30px;">
                Click the button below to accept your invitation and create your account:
              </p>
              <div style="text-align: center; margin-bottom: 30px;">
                <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Accept Invitation
                </a>
              </div>
              <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="font-size: 12px; color: #888; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">
                ${inviteUrl}
              </p>
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              <p style="font-size: 13px; color: #999; text-align: center;">
                This invitation expires on <strong>${expiryDate}</strong>.
              </p>
              <p style="font-size: 13px; color: #999; text-align: center;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    // 9. Update sent_at on the invite
    const { error: updateError } = await supabase
      .from("employee_invites")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", invite_id);

    if (updateError) {
      console.warn("Failed to update sent_at:", updateError);
      // Don't fail the request, email was sent
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-employee-invite-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
