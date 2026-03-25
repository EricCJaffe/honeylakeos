import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotifyEvent = "ticket_created" | "status_changed" | "ticket_assigned" | "message_added";

interface NotifyRequest {
  ticket_id: string;
  event: NotifyEvent;
  changed_by_user_id?: string;
  old_status?: string;
  new_status?: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  triage: "In Review",
  in_progress: "In Progress",
  waiting_on_requester: "Awaiting Your Response",
  resolved: "Resolved",
  closed: "Closed",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const appUrl = Deno.env.get("APP_URL") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const emailFrom = Deno.env.get("EMAIL_FROM") || "Honey Lake Clinic <noreply@honeylake.clinic>";

    if (!resendApiKey || !supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ success: false, error: "Server configuration incomplete" }, 500);
    }

    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: NotifyRequest = await req.json();
    const { ticket_id, event } = body;

    if (!ticket_id || !event) {
      return jsonResponse({ success: false, error: "ticket_id and event are required" }, 400);
    }

    // Fetch ticket with company info
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*, company:companies(id, name)")
      .eq("id", ticket_id)
      .single();

    if (ticketError || !ticket) {
      return jsonResponse({ success: false, error: "Ticket not found" }, 404);
    }

    // Fetch submitter profile for their email
    const { data: submitterAuth } = await supabase.auth.admin.getUserById(ticket.created_by_user_id);
    const submitterEmail = submitterAuth?.user?.email;
    const submitterName = submitterAuth?.user?.user_metadata?.full_name || "User";

    // Fetch site admins for admin notifications
    const { data: siteAdmins } = await supabase
      .from("site_memberships")
      .select("user_id")
      .eq("site_id", ticket.site_id)
      .in("role", ["site_admin", "super_admin"]);

    const adminEmails: string[] = [];
    if (siteAdmins) {
      for (const admin of siteAdmins) {
        const { data: adminAuth } = await supabase.auth.admin.getUserById(admin.user_id);
        if (adminAuth?.user?.email) {
          adminEmails.push(adminAuth.user.email);
        }
      }
    }

    const ticketUrl = appUrl ? `${appUrl}/app/support/tickets/${ticket.id}` : "#";
    const dashboardUrl = appUrl ? `${appUrl}/app/support/dashboard` : "#";
    const companyName = (ticket.company as { name: string } | null)?.name || "Unknown";
    const priorityLabel = PRIORITY_LABELS[ticket.priority] || ticket.priority;
    const statusLabel = STATUS_LABELS[ticket.status] || ticket.status;
    const sent: string[] = [];

    // Determine who to notify and what to send
    if (event === "ticket_created" && adminEmails.length > 0) {
      // Notify admins about new ticket
      await resend.emails.send({
        from: emailFrom,
        to: adminEmails,
        subject: `[New Ticket #${ticket.ticket_number}] ${ticket.subject}`,
        html: buildEmail({
          heading: "New Support Ticket",
          preheader: `A new ${priorityLabel.toLowerCase()} priority ticket has been submitted.`,
          details: [
            ["Ticket", `#${ticket.ticket_number}`],
            ["Subject", ticket.subject],
            ["Priority", priorityLabel],
            ["Category", ticket.category || "Other"],
            ["Company", companyName],
            ["Submitted by", submitterName],
          ],
          description: ticket.description,
          ctaUrl: dashboardUrl,
          ctaLabel: "View in Dashboard",
        }),
      });
      sent.push(...adminEmails);
    }

    if (event === "status_changed" && submitterEmail) {
      // Notify submitter about status change
      const oldLabel = body.old_status ? (STATUS_LABELS[body.old_status] || body.old_status) : "Unknown";
      const newLabel = body.new_status ? (STATUS_LABELS[body.new_status] || body.new_status) : statusLabel;

      await resend.emails.send({
        from: emailFrom,
        to: [submitterEmail],
        subject: `[Ticket #${ticket.ticket_number}] Status updated: ${newLabel}`,
        html: buildEmail({
          heading: "Ticket Status Updated",
          preheader: `Your ticket #${ticket.ticket_number} status has changed from ${oldLabel} to ${newLabel}.`,
          details: [
            ["Ticket", `#${ticket.ticket_number} — ${ticket.subject}`],
            ["Previous Status", oldLabel],
            ["New Status", newLabel],
          ],
          ctaUrl: ticketUrl,
          ctaLabel: "View Your Ticket",
        }),
      });
      sent.push(submitterEmail);
    }

    if (event === "ticket_assigned" && ticket.assigned_to_user_id) {
      // Notify assigned agent
      const { data: assigneeAuth } = await supabase.auth.admin.getUserById(ticket.assigned_to_user_id);
      const assigneeEmail = assigneeAuth?.user?.email;

      if (assigneeEmail) {
        await resend.emails.send({
          from: emailFrom,
          to: [assigneeEmail],
          subject: `[Assigned] Ticket #${ticket.ticket_number}: ${ticket.subject}`,
          html: buildEmail({
            heading: "Ticket Assigned to You",
            preheader: `You have been assigned ticket #${ticket.ticket_number}.`,
            details: [
              ["Ticket", `#${ticket.ticket_number}`],
              ["Subject", ticket.subject],
              ["Priority", priorityLabel],
              ["Category", ticket.category || "Other"],
              ["Company", companyName],
            ],
            description: ticket.description,
            ctaUrl: ticketUrl,
            ctaLabel: "View Ticket",
          }),
        });
        sent.push(assigneeEmail);
      }
    }

    if (event === "message_added" && submitterEmail) {
      // Notify submitter about new agent message (only if changed_by is not the submitter)
      if (body.changed_by_user_id && body.changed_by_user_id !== ticket.created_by_user_id) {
        await resend.emails.send({
          from: emailFrom,
          to: [submitterEmail],
          subject: `[Ticket #${ticket.ticket_number}] New reply on your ticket`,
          html: buildEmail({
            heading: "New Reply on Your Ticket",
            preheader: `A support agent has replied to your ticket #${ticket.ticket_number}.`,
            details: [
              ["Ticket", `#${ticket.ticket_number} — ${ticket.subject}`],
              ["Status", statusLabel],
            ],
            ctaUrl: ticketUrl,
            ctaLabel: "View Conversation",
          }),
        });
        sent.push(submitterEmail);
      }
    }

    return jsonResponse({ success: true, sent });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("support-ticket-notify error:", error);
    return jsonResponse({ success: false, error: message }, 500);
  }
});

function buildEmail(opts: {
  heading: string;
  preheader: string;
  details: [string, string][];
  description?: string | null;
  ctaUrl: string;
  ctaLabel: string;
}): string {
  const detailRows = opts.details
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding: 4px 0; font-size: 13px; color: #666; width: 130px;">${label}</td>
          <td style="padding: 4px 0; font-size: 13px; font-weight: 500;">${value}</td>
        </tr>`
    )
    .join("");

  const descriptionBlock = opts.description
    ? `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 24px;">
        <p style="margin: 0 0 6px; font-size: 12px; color: #475569; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Description</p>
        <p style="margin: 0; font-size: 14px; color: #1e293b; white-space: pre-wrap;">${opts.description}</p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 24px 30px; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 20px;">${opts.heading}</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 14px;">Honey Lake Clinic Support</p>
    </div>
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
      <p style="font-size: 15px; margin-bottom: 24px;">${opts.preheader}</p>

      <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          ${detailRows}
        </table>
      </div>

      ${descriptionBlock}

      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${opts.ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: white; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px;">
          ${opts.ctaLabel} &rarr;
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
      <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
        This notification was sent by the Honey Lake Clinic support system.
      </p>
    </div>
  </body>
</html>`;
}
