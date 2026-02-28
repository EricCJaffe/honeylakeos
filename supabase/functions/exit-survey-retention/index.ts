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
          applied: false,
          note: "Retention mode is off",
        });
        continue;
      }

      const submissionsDays = parsePositiveInt(settingsMap.get("retention_submissions_days"), 365);
      const alertsDays = parsePositiveInt(settingsMap.get("retention_alerts_days"), 180);

      const submissionsCutoff = new Date();
      submissionsCutoff.setDate(submissionsCutoff.getDate() - submissionsDays);
      const alertsCutoff = new Date();
      alertsCutoff.setDate(alertsCutoff.getDate() - alertsDays);

      const [{ count: submissionsCount, error: submissionsError }, { count: alertsCount, error: alertsError }] = await Promise.all([
        supabase
          .from("exit_survey_submissions")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .lte("submitted_at", submissionsCutoff.toISOString()),
        supabase
          .from("exit_survey_alerts")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .lte("created_at", alertsCutoff.toISOString()),
      ]);

      if (submissionsError) throw submissionsError;
      if (alertsError) throw alertsError;

      // Safety scaffold: this function only reports candidates for now.
      const canApply = apply && !dryRun && mode !== "off";

      results.push({
        company_id: companyId,
        mode,
        submissions_cutoff: submissionsCutoff.toISOString(),
        alerts_cutoff: alertsCutoff.toISOString(),
        submissions_candidates: submissionsCount || 0,
        alerts_candidates: alertsCount || 0,
        applied: false,
        note: canApply
          ? "Apply requested; destructive retention actions are intentionally disabled in this scaffold."
          : "Dry-run candidate scan completed.",
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
