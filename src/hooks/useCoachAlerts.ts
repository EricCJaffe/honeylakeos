import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export type AlertSeverity = "low" | "medium" | "high";

export interface CoachAlert {
  id: string;
  coach_company_id: string;
  client_company_id: string;
  alert_type: string;
  severity: AlertSeverity;
  message: string;
  suggested_action: string | null;
  data_snapshot: Record<string, unknown>;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  // Joined data
  client_company?: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

export interface HealthScoreRecord {
  id: string;
  company_id: string;
  framework_id: string;
  score: number;
  status: "green" | "yellow" | "red";
  breakdown_json: {
    task_completion?: { score: number; weight: number; total: number; completed: number; overdue: number };
    project_health?: { score: number; weight: number; active: number; stalled: number };
    activity?: { score: number; weight: number; last_activity_at: string | null };
  };
  calculated_at: string;
  created_at: string;
}

// Get all active alerts for the coach company
export function useCoachAlerts(severity?: AlertSeverity) {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["coach-alerts", activeCompanyId, severity],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      let query = supabase
        .from("coach_alerts")
        .select(`
          *,
          client_company:companies!coach_alerts_client_company_id_fkey(id, name, logo_url)
        `)
        .eq("coach_company_id", activeCompanyId)
        .is("resolved_at", null)
        .order("created_at", { ascending: false });

      if (severity) {
        query = query.eq("severity", severity);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CoachAlert[];
    },
    enabled: !!activeCompanyId,
  });
}

// Get alerts for a specific client
export function useClientAlerts(clientCompanyId: string | undefined) {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["client-alerts", activeCompanyId, clientCompanyId],
    queryFn: async () => {
      if (!activeCompanyId || !clientCompanyId) return [];

      const { data, error } = await supabase
        .from("coach_alerts")
        .select("*")
        .eq("coach_company_id", activeCompanyId)
        .eq("client_company_id", clientCompanyId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as CoachAlert[];
    },
    enabled: !!activeCompanyId && !!clientCompanyId,
  });
}

// Resolve an alert
export function useResolveAlert() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (alertId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("coach_alerts")
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq("id", alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["client-alerts"] });
      toast.success("Alert resolved");
    },
    onError: (error) => {
      toast.error("Failed to resolve alert", { description: error.message });
    },
  });
}

// Get stored health scores for a client
export function useClientHealthHistory(clientCompanyId: string | undefined, limit = 30) {
  return useQuery({
    queryKey: ["client-health-history", clientCompanyId, limit],
    queryFn: async () => {
      if (!clientCompanyId) return [];

      const { data, error } = await supabase
        .from("framework_health_scores")
        .select("*")
        .eq("company_id", clientCompanyId)
        .order("calculated_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as HealthScoreRecord[];
    },
    enabled: !!clientCompanyId,
  });
}

// Get the latest health score for a client
export function useLatestHealthScore(clientCompanyId: string | undefined) {
  return useQuery({
    queryKey: ["latest-health-score", clientCompanyId],
    queryFn: async () => {
      if (!clientCompanyId) return null;

      const { data, error } = await supabase
        .from("framework_health_scores")
        .select("*")
        .eq("company_id", clientCompanyId)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as HealthScoreRecord | null;
    },
    enabled: !!clientCompanyId,
  });
}

// Compute health score on-demand
export function useComputeHealthScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, frameworkId }: { companyId: string; frameworkId: string }) => {
      const { data, error } = await supabase.rpc("compute_health_score", {
        _company_id: companyId,
        _framework_id: frameworkId,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["latest-health-score", variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ["client-health-history", variables.companyId] });
      toast.success("Health score recalculated");
    },
    onError: (error) => {
      toast.error("Failed to compute health score", { description: error.message });
    },
  });
}

// Get alert counts by severity
export function useAlertCounts() {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["alert-counts", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return { high: 0, medium: 0, low: 0, total: 0 };

      const { data, error } = await supabase
        .from("coach_alerts")
        .select("severity")
        .eq("coach_company_id", activeCompanyId)
        .is("resolved_at", null);

      if (error) throw error;

      const counts = { high: 0, medium: 0, low: 0, total: 0 };
      data?.forEach((alert) => {
        counts[alert.severity as AlertSeverity]++;
        counts.total++;
      });

      return counts;
    },
    enabled: !!activeCompanyId,
  });
}
