import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SOPReviewCheck {
  id: string;
  company_id: string;
  department_id: string;
  title: string;
  next_review_at: string;
  review_reminder_sent_at: string | null;
  overdue_reminder_sent_at: string | null;
  created_by: string | null;
}

interface SOPReminderRequest {
  dry_run?: boolean;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requiredSecret = Deno.env.get("SOP_REVIEW_SCHEDULER_SECRET") || "";
    if (requiredSecret) {
      const providedSecret = req.headers.get("x-scheduler-secret") || "";
      if (providedSecret !== requiredSecret) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ success: false, error: "Missing Supabase configuration" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let body: SOPReminderRequest = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const dryRun = body.dry_run ?? false;

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    console.log("Checking SOP review reminders at:", now.toISOString());

    // Fetch SOPs that need review reminders
    const { data: sops, error: fetchError } = await supabase
      .from("sops")
      .select(`
        id,
        company_id,
        department_id,
        title,
        next_review_at,
        review_reminder_sent_at,
        overdue_reminder_sent_at,
        created_by
      `)
      .eq("is_archived", false)
      .eq("status", "active")
      .not("next_review_at", "is", null) as { data: SOPReviewCheck[] | null; error: any };

    if (fetchError) {
      console.error("Error fetching SOPs:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!sops || sops.length === 0) {
      console.log("No SOPs with review dates found");
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let remindersCreated = 0;
    let escalationsCreated = 0;
    let reminderCandidates = 0;
    let escalationCandidates = 0;

    for (const sop of sops) {
      const reviewDate = new Date(sop.next_review_at);
      const daysUntilReview = Math.floor((reviewDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      // Get department admins for escalation
      const getDepartmentAdmins = async () => {
        const { data: members } = await supabase
          .from("department_members")
          .select("user_id")
          .eq("department_id", sop.department_id)
          .eq("role", "manager");
        return members?.map(m => m.user_id) || [];
      };

      // Case 1: 30 days before review - send initial reminder to owner
      if (daysUntilReview <= 30 && daysUntilReview > 0 && !sop.review_reminder_sent_at) {
        if (sop.created_by) {
          reminderCandidates++;
          if (!dryRun) {
            await supabase.from("in_app_notifications").insert({
              company_id: sop.company_id,
              user_id: sop.created_by,
              type: "sop_review_reminder",
              title: "SOP Review Due Soon",
              message: `"${sop.title}" is due for review in ${daysUntilReview} days.`,
              entity_type: "sop",
              entity_id: sop.id,
              metadata: { days_until_review: daysUntilReview, reminder_type: "30_day" }
            });

            await supabase
              .from("sops")
              .update({ review_reminder_sent_at: now.toISOString() })
              .eq("id", sop.id);

            remindersCreated++;
            console.log(`Sent 30-day reminder for SOP: ${sop.title}`);
          }
        }
      }

      // Case 2: At due date - send follow-up reminder
      if (daysUntilReview <= 0 && daysUntilReview > -1 && sop.review_reminder_sent_at) {
        if (sop.created_by) {
          reminderCandidates++;
          if (!dryRun) {
            await supabase.from("in_app_notifications").insert({
              company_id: sop.company_id,
              user_id: sop.created_by,
              type: "sop_review_due",
              title: "SOP Review Due Today",
              message: `"${sop.title}" is due for review today.`,
              entity_type: "sop",
              entity_id: sop.id,
              metadata: { reminder_type: "due_date" }
            });

            remindersCreated++;
            console.log(`Sent due-date reminder for SOP: ${sop.title}`);
          }
        }
      }

      // Case 3: 30 days overdue - escalate to department admins
      if (daysUntilReview <= -30 && !sop.overdue_reminder_sent_at) {
        const adminIds = await getDepartmentAdmins();
        
        // Also notify the owner
        if (sop.created_by) {
          adminIds.push(sop.created_by);
        }

        const uniqueAdminIds = [...new Set(adminIds)];

        escalationCandidates++;
        if (!dryRun) {
          for (const adminId of uniqueAdminIds) {
            await supabase.from("in_app_notifications").insert({
              company_id: sop.company_id,
              user_id: adminId,
              type: "sop_review_overdue",
              title: "SOP Review Overdue",
              message: `"${sop.title}" is ${Math.abs(daysUntilReview)} days overdue for review. Immediate action required.`,
              entity_type: "sop",
              entity_id: sop.id,
              metadata: { days_overdue: Math.abs(daysUntilReview), reminder_type: "escalation" }
            });
          }

          await supabase
            .from("sops")
            .update({ 
              overdue_reminder_sent_at: now.toISOString(),
              status: "review_due"
            })
            .eq("id", sop.id);

          escalationsCreated++;
          console.log(`Escalated overdue SOP: ${sop.title} to ${uniqueAdminIds.length} admins`);
        }
      }
    }

    console.log(`Processed ${sops.length} SOPs. Created ${remindersCreated} reminders and ${escalationsCreated} escalations.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: sops.length,
        dry_run: dryRun,
        reminder_candidates: reminderCandidates,
        escalation_candidates: escalationCandidates,
        reminders_created: remindersCreated,
        escalations_created: escalationsCreated
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in sop-review-reminders function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
