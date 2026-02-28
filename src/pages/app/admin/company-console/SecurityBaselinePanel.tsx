import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ShieldAlert, Mail, KeyRound, Clock3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { useExitSurveySettings } from "@/hooks/useExitSurvey";
import { useCompanyIntegrations } from "@/hooks/useIntegrations";

function StatusBadge({ ok, okLabel = "Enabled", badLabel = "Disabled" }: { ok: boolean; okLabel?: string; badLabel?: string }) {
  return ok ? (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{okLabel}</Badge>
  ) : (
    <Badge variant="destructive">{badLabel}</Badge>
  );
}

export default function SecurityBaselinePanel() {
  const { activeCompanyId } = useMembership();
  const { data: settings } = useExitSurveySettings();
  const { data: companyIntegrations } = useCompanyIntegrations(activeCompanyId || undefined);

  const phiSafeMode = settings?.phi_safe_email_mode === "true";

  const { data: viewAuditCount = 0, isLoading: loadingViewAudit } = useQuery({
    queryKey: ["security-baseline-submission-view-audit", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return 0;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count, error } = await supabase
        .from("audit_logs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", activeCompanyId)
        .eq("action", "exit_survey.submission_viewed")
        .gte("created_at", sevenDaysAgo.toISOString());

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!activeCompanyId,
  });

  const ssoConfigured = useMemo(() => {
    const ssoKeys = new Set(["microsoft", "google", "okta", "saml"]);
    return (companyIntegrations || []).some(
      (integration) => integration.is_enabled && ssoKeys.has(integration.provider_key)
    );
  }, [companyIntegrations]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5" />
            Minimum Security Baseline
          </CardTitle>
          <CardDescription>
            Operational checks for HIPAA-sensitive workflows. This panel helps verify required controls are in place.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mail className="h-4 w-4" /> PHI-safe email mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <StatusBadge ok={phiSafeMode} okLabel="Enabled" badLabel="Disabled" />
            <p className="text-xs text-muted-foreground">
              Redacts patient-identifying details in exit survey emails.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock3 className="h-4 w-4" /> Submission read audit logging
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <StatusBadge ok={viewAuditCount > 0} okLabel="Active" badLabel="No recent events" />
            <p className="text-xs text-muted-foreground">
              {loadingViewAudit
                ? "Checking events..."
                : `${viewAuditCount} submission view events in the last 7 days.`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> SSO provider configured
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <StatusBadge ok={ssoConfigured} okLabel="Configured" badLabel="Not configured" />
            <p className="text-xs text-muted-foreground">
              Checks enabled company integration keys: microsoft, google, okta, or saml.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Manual verification items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>Confirm MFA enforcement for all admin users.</p>
            <p>Confirm leaked password protection is enabled in Supabase Auth settings.</p>
            <p>Confirm production secrets rotation policy is documented and active.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
