import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { useAuth } from "@/lib/auth";
import { ReportType, ReportConfig, Report } from "./useReports";
import type { Json } from "@/integrations/supabase/types";

// ==================== RECENT RUNS ====================

export interface ReportRecentRun {
  id: string;
  user_id: string;
  company_id: string;
  report_type: ReportType;
  config_hash: string;
  config_json: ReportConfig;
  last_run_at: string;
  run_count: number;
  created_at: string;
}

function hashConfig(config: ReportConfig): string {
  return btoa(JSON.stringify(config)).slice(0, 32);
}

export function useRecentRuns(limit = 10) {
  const { activeCompanyId } = useMembership();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["report-recent-runs", activeCompanyId, user?.id, limit],
    queryFn: async () => {
      if (!activeCompanyId || !user?.id) return [];

      const { data, error } = await supabase
        .from("report_recent_runs")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("user_id", user.id)
        .order("last_run_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ReportRecentRun[];
    },
    enabled: !!activeCompanyId && !!user?.id,
  });
}

export function useTrackReportRun() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useMembership();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      reportType,
      config,
    }: {
      reportType: ReportType;
      config: ReportConfig;
    }) => {
      if (!activeCompanyId || !user?.id) return null;

      const configHash = hashConfig(config);

      // Check if exists
      const { data: existing } = await supabase
        .from("report_recent_runs")
        .select("id, run_count")
        .eq("user_id", user.id)
        .eq("company_id", activeCompanyId)
        .eq("config_hash", configHash)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("report_recent_runs")
          .update({
            last_run_at: new Date().toISOString(),
            run_count: existing.run_count + 1,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new, but first check count and remove oldest if needed
        const { data: countData } = await supabase
          .from("report_recent_runs")
          .select("id")
          .eq("user_id", user.id)
          .eq("company_id", activeCompanyId)
          .order("last_run_at", { ascending: true });

        if (countData && countData.length >= 25) {
          // Remove oldest
          const toDelete = countData.slice(0, countData.length - 24);
          await supabase
            .from("report_recent_runs")
            .delete()
            .in("id", toDelete.map((d) => d.id));
        }

        const { data, error } = await supabase
          .from("report_recent_runs")
          .insert({
            user_id: user.id,
            company_id: activeCompanyId,
            report_type: reportType,
            config_hash: configHash,
            config_json: config as Json,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-recent-runs", activeCompanyId] });
    },
  });
}

// ==================== USER DEFAULTS ====================

export interface ReportUserDefaults {
  id: string;
  user_id: string;
  company_id: string;
  report_type: ReportType;
  defaults_json: ReportConfig;
  updated_at: string;
}

export function useReportUserDefaults(reportType: ReportType | undefined) {
  const { activeCompanyId } = useMembership();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["report-user-defaults", activeCompanyId, user?.id, reportType],
    queryFn: async () => {
      if (!activeCompanyId || !user?.id || !reportType) return null;

      const { data, error } = await supabase
        .from("report_user_defaults")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("user_id", user.id)
        .eq("report_type", reportType)
        .maybeSingle();

      if (error) throw error;
      return data as ReportUserDefaults | null;
    },
    enabled: !!activeCompanyId && !!user?.id && !!reportType,
  });
}

export function useSaveReportUserDefaults() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useMembership();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      reportType,
      defaults,
    }: {
      reportType: ReportType;
      defaults: ReportConfig;
    }) => {
      if (!activeCompanyId || !user?.id) return null;

      const { data: existing } = await supabase
        .from("report_user_defaults")
        .select("id")
        .eq("user_id", user.id)
        .eq("company_id", activeCompanyId)
        .eq("report_type", reportType)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("report_user_defaults")
          .update({ defaults_json: defaults as Json })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("report_user_defaults")
          .insert({
            user_id: user.id,
            company_id: activeCompanyId,
            report_type: reportType,
            defaults_json: defaults as Json,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, { reportType }) => {
      queryClient.invalidateQueries({
        queryKey: ["report-user-defaults", activeCompanyId, user?.id, reportType],
      });
    },
  });
}

// ==================== DASHBOARD KPIs ====================

export interface DashboardKPIs {
  work: {
    tasksOverdue: number;
    tasksDueSoon: number;
    activeProjects: number;
  };
  relationships: {
    pipelineTotal: number;
    donationsThisPeriod: number;
  };
  finance: {
    invoicesOverdue: number;
    receiptsThisPeriod: number;
  };
}

export function useDashboardKPIs() {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["report-dashboard-kpis", activeCompanyId],
    queryFn: async (): Promise<DashboardKPIs> => {
      if (!activeCompanyId) {
        return {
          work: { tasksOverdue: 0, tasksDueSoon: 0, activeProjects: 0 },
          relationships: { pipelineTotal: 0, donationsThisPeriod: 0 },
          finance: { invoicesOverdue: 0, receiptsThisPeriod: 0 },
        };
      }

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nextWeekStr = nextWeek.toISOString().split("T")[0];
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Parallel queries
      const [
        overdueTasksResult,
        dueSoonTasksResult,
        activeProjectsResult,
        opportunitiesResult,
        donationsResult,
        overdueInvoicesResult,
        receiptsResult,
      ] = await Promise.all([
        // Overdue tasks
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("company_id", activeCompanyId)
          .eq("is_recurring_template", false)
          .neq("status", "completed")
          .neq("status", "archived")
          .not("due_date", "is", null)
          .lt("due_date", todayStr),

        // Due soon tasks
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("company_id", activeCompanyId)
          .eq("is_recurring_template", false)
          .neq("status", "completed")
          .neq("status", "archived")
          .not("due_date", "is", null)
          .gte("due_date", todayStr)
          .lte("due_date", nextWeekStr),

        // Active projects
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("company_id", activeCompanyId)
          .eq("is_template", false)
          .in("status", ["active", "in_progress"]),

        // Pipeline total (sum of all open opportunities)
        supabase
          .from("sales_opportunities")
          .select("value_amount")
          .eq("company_id", activeCompanyId)
          .eq("status", "open"),

        // Donations this period
        supabase
          .from("donations")
          .select("amount")
          .eq("company_id", activeCompanyId)
          .gte("donation_date", thirtyDaysAgo.toISOString().split("T")[0]),

        // Overdue invoices
        supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("company_id", activeCompanyId)
          .eq("status", "sent")
          .not("due_date", "is", null)
          .lt("due_date", todayStr),

        // Receipts this period
        supabase
          .from("receipts")
          .select("amount")
          .eq("company_id", activeCompanyId)
          .gte("receipt_date", thirtyDaysAgo.toISOString().split("T")[0]),
      ]);

      // Calculate pipeline total
      const pipelineTotal = (opportunitiesResult.data || []).reduce(
        (sum, opp) => sum + (opp.value_amount || 0),
        0
      );

      // Calculate donations total
      const donationsTotal = (donationsResult.data || []).reduce(
        (sum, d) => sum + (d.amount || 0),
        0
      );

      // Calculate receipts total
      const receiptsTotal = (receiptsResult.data || []).reduce(
        (sum, r) => sum + (r.amount || 0),
        0
      );

      return {
        work: {
          tasksOverdue: overdueTasksResult.count || 0,
          tasksDueSoon: dueSoonTasksResult.count || 0,
          activeProjects: activeProjectsResult.count || 0,
        },
        relationships: {
          pipelineTotal,
          donationsThisPeriod: donationsTotal,
        },
        finance: {
          invoicesOverdue: overdueInvoicesResult.count || 0,
          receiptsThisPeriod: receiptsTotal,
        },
      };
    },
    enabled: !!activeCompanyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ==================== VISIBILITY & SHARING ====================

export type ReportVisibility = "personal" | "company_shared" | "company_restricted";

export interface ReportVisibilityRole {
  id: string;
  report_id: string;
  role_id: string;
  created_at: string;
  created_by: string | null;
}

export function useReportVisibilityRoles(reportId: string | undefined) {
  return useQuery({
    queryKey: ["report-visibility-roles", reportId],
    queryFn: async () => {
      if (!reportId) return [];

      const { data, error } = await supabase
        .from("report_visibility_roles")
        .select("*")
        .eq("report_id", reportId);

      if (error) throw error;
      return data as ReportVisibilityRole[];
    },
    enabled: !!reportId,
  });
}

export function useUpdateReportVisibility() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useMembership();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      reportId,
      visibility,
      roleIds,
    }: {
      reportId: string;
      visibility: ReportVisibility;
      roleIds?: string[];
    }) => {
      // Update report visibility
      const { error: updateError } = await supabase
        .from("reports")
        .update({ visibility })
        .eq("id", reportId);

      if (updateError) throw updateError;

      // Handle roles for restricted visibility
      if (visibility === "company_restricted" && roleIds) {
        // Delete existing roles
        await supabase
          .from("report_visibility_roles")
          .delete()
          .eq("report_id", reportId);

        // Insert new roles
        if (roleIds.length > 0) {
          const { error: insertError } = await supabase
            .from("report_visibility_roles")
            .insert(
              roleIds.map((roleId) => ({
                report_id: reportId,
                role_id: roleId,
                created_by: user?.id,
              }))
            );

          if (insertError) throw insertError;
        }
      } else if (visibility !== "company_restricted") {
        // Clear roles if not restricted
        await supabase
          .from("report_visibility_roles")
          .delete()
          .eq("report_id", reportId);
      }

      return { reportId, visibility };
    },
    onSuccess: ({ reportId }) => {
      queryClient.invalidateQueries({ queryKey: ["reports", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["report", reportId] });
      queryClient.invalidateQueries({ queryKey: ["report-visibility-roles", reportId] });
    },
  });
}
