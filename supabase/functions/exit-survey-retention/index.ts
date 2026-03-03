import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-scheduler-secret",
};

type RetentionRequest = {
  company_id?: string;
  dry_run?: boolean;
  apply?: boolean;
};

type CompanyResult = {
  company_id: string;
  mode: string;
  submissions_cutoff: string;
  alerts_cutoff: string;
  submissions_candidates: number;
  alerts_candidates: number;
  submissions_archived: number;
  alerts_archived: number;
  applied: boolean;
  note?: string;
};

function parsePositiveInt(value: string | null | undefined, fallbackValue: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackValue;
  return parsed;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ success: false, error: "Missing Supabase configuration" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const requiredSecret = Deno.env.get("EXIT_SURVEY_RETENTION_SECRET") || "";
    if (requiredSecret) {
      const providedSecret = req.headers.get("x-scheduler-secret") || "";
      if (providedSecret !== requiredSecret) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    let body: RetentionRequest = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const dryRun = body.dry_run ?? true;
    const apply = body.apply ?? false;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let companyIds: string[] = [];
    if (body.company_id) {
      companyIds = [body.company_id];
    } else {
      const { data: settingRows, error: settingsError } = await supabase
        .from("exit_survey_settings")
        .select("company_id")
        .eq("key", "retention_mode")
        .neq("value", "off");

      if (settingsError) throw settingsError;
      companyIds = Array.from(new Set((settingRows || []).map((row) => row.company_id))).filter(Boolean);
    }

    const results: CompanyResult[] = [];

    for (const companyId of companyIds) {
      const { data: settingsRows, error: companySettingsError } = await supabase
        .from("exit_survey_settings")
        .select("key, value")
        .eq("company_id", companyId)
        .in("key", [
          "retention_mode",
          "retention_submissions_days",
          "retention_alerts_days",
          "retention_exports_days",
        ]);

      if (companySettingsError) throw companySettingsError;

      const settingsMap = new Map((settingsRows || []).map((row) => [row.key, row.value]));
      const mode = settingsMap.get("retention_mode") || "off";

      if (mode === "off") {
        results.push({
          company_id: companyId,
          mode,
          submissions_cutoff: new Date().toISOString(),
          alerts_cutoff: new Date().toISOString(),
          submissions_candidates: 0,
          alerts_candidates: 0,
          submissions_archived: 0,
          alerts_archived: 0,
          applied: false,
          note: "Retention mode is off",
        });
        continue;
      }

      // Default to 90-day archive window
      const submissionsDays = parsePositiveInt(settingsMap.get("retention_submissions_days"), 90);
      const alertsDays = parsePositiveInt(settingsMap.get("retention_alerts_days"), 90);

      const submissionsCutoff = new Date();
      submissionsCutoff.setDate(submissionsCutoff.getDate() - submissionsDays);
      const alertsCutoff = new Date();
      alertsCutoff.setDate(alertsCutoff.getDate() - alertsDays);

      // Count candidates (not yet archived, older than cutoff)
      const [{ count: submissionsCount, error: submissionsError }, { count: alertsCount, error: alertsError }] = await Promise.all([
        supabase
          .from("exit_survey_submissions")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .is("archived_at", null)
          .lte("submitted_at", submissionsCutoff.toISOString()),
        supabase
          .from("exit_survey_alerts")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .is("archived_at", null)
          .lte("created_at", alertsCutoff.toISOString()),
      ]);

      if (submissionsError) throw submissionsError;
      if (alertsError) throw alertsError;

      const candidateSubmissions = submissionsCount || 0;
      const candidateAlerts = alertsCount || 0;

      // Apply archive if requested and mode allows
      const canApply = apply && !dryRun && mode === "archive_only";
      let archivedSubmissions = 0;
      let archivedAlerts = 0;

      if (canApply) {
        const archiveTimestamp = new Date().toISOString();

        // Archive submissions older than cutoff that haven't been archived yet
        if (candidateSubmissions > 0) {
          const { data: archivedSubs, error: archSubError } = await supabase
            .from("exit_survey_submissions")
            .update({ archived_at: archiveTimestamp })
            .eq("company_id", companyId)
            .is("archived_at", null)
            .lte("submitted_at", submissionsCutoff.toISOString())
            .select("id");

          if (archSubError) {
            console.error("Error archiving submissions:", archSubError);
          } else {
            archivedSubmissions = archivedSubs?.length || 0;
          }
        }

        // Archive alerts older than cutoff that haven't been archived yet
        if (candidateAlerts > 0) {
          const { data: archivedAlts, error: archAltError } = await supabase
            .from("exit_survey_alerts")
            .update({ archived_at: archiveTimestamp })
            .eq("company_id", companyId)
            .is("archived_at", null)
            .lte("created_at", alertsCutoff.toISOString())
            .select("id");

          if (archAltError) {
            console.error("Error archiving alerts:", archAltError);
          } else {
            archivedAlerts = archivedAlts?.length || 0;
          }
        }

        console.log(`[retention] company=${companyId} archived ${archivedSubmissions} submissions, ${archivedAlerts} alerts`);
      }

      let note: string;
      if (canApply) {
        note = `Archive applied: ${archivedSubmissions} submissions, ${archivedAlerts} alerts archived.`;
      } else if (mode === "dry_run") {
        note = `Dry-run scan: ${candidateSubmissions} submissions, ${candidateAlerts} alerts eligible for archiving.`;
      } else if (!apply || dryRun) {
        note = "Dry-run candidate scan completed.";
      } else {
        note = `Mode "${mode}" does not support apply. Use archive_only.`;
      }

      results.push({
        company_id: companyId,
        mode,
        submissions_cutoff: submissionsCutoff.toISOString(),
        alerts_cutoff: alertsCutoff.toISOString(),
        submissions_candidates: candidateSubmissions,
        alerts_candidates: candidateAlerts,
        submissions_archived: archivedSubmissions,
        alerts_archived: archivedAlerts,
        applied: canApply,
        note,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: dryRun,
        apply_requested: apply,
        companies: results,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
