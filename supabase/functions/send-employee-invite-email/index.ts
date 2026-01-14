import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    // Use service role to read invite data
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { invite_id }: SendInviteRequest = await req.json();

    if (!invite_id) {
      throw new Error("invite_id is required");
    }

    console.log("Fetching invite:", invite_id);

    // Fetch invite with employee and company info
    const { data: invite, error: inviteError } = await supabase
      .from("employee_invites")
      .select(`
        id,
        email,
        token,
        expires_at,
        status,
        employees!inner(full_name, company_id),
        companies!inner(name)
      `)
      .eq("id", invite_id)
      .single();

    if (inviteError) {
      console.error("Error fetching invite:", inviteError);
      throw new Error(`Failed to fetch invite: ${inviteError.message}`);
    }

    if (!invite) {
      throw new Error("Invite not found");
    }

    if (invite.status !== "pending") {
      throw new Error(`Invite is not pending (status: ${invite.status})`);
    }

    // Extract nested data (Supabase returns objects for singular relations)
    const employeeData = invite.employees as unknown as { full_name: string; company_id: string };
    const companyData = invite.companies as unknown as { name: string };

    console.log("Invite found:", {
      email: invite.email,
      company: companyData?.name,
      employee: employeeData?.full_name,
    });

    // Build the invite URL
    const appUrl = Deno.env.get("APP_URL") || "https://bible-link-hub.lovable.app";
    const inviteUrl = `${appUrl}/invite?token=${invite.token}`;

    // Format expiry date
    const expiryDate = new Date(invite.expires_at).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const companyName = companyData?.name || "the company";
    const employeeName = employeeData?.full_name || "there";

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Invitations <onboarding@resend.dev>",
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

    return new Response(
      JSON.stringify({ success: true, message: "Invitation email sent" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-employee-invite-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
