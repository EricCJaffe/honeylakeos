import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useAuditLog } from "@/hooks/useAuditLog";

export type ReportType =
  | "tasks_by_status"
  | "tasks_by_assignee"
  | "tasks_due_soon"
  | "tasks_overdue"
  | "projects_by_phase"
  | "projects_active_completed"
  | "crm_pipeline_totals"
  | "crm_opportunities_won_lost"
  | "donors_by_campaign"
  | "donor_retention"
  | "invoices_by_status"
  | "receipts_by_tag";

export interface ReportConfig {
  dateRange?: {
    start: string;
    end: string;
  };
  groupBy?: string;
  filters?: Record<string, unknown>;
}

export interface Report {
  id: string;
  company_id: string;
  owner_user_id: string | null;
  name: string;
  description: string | null;
  is_personal: boolean;
  report_type: ReportType;
  config_json: ReportConfig;
  created_at: string;
  updated_at: string;
}

export interface ReportRun {
  id: string;
  report_id: string;
  generated_at: string;
  result_json: unknown;
  expires_at: string;
  created_by: string | null;
}

export interface ReportCategory {
  key: string;
  label: string;
  types: { value: ReportType; label: string }[];
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  {
    key: "work",
    label: "Work",
    types: [
      { value: "tasks_by_status", label: "Tasks by Status" },
      { value: "tasks_by_assignee", label: "Tasks by Assignee" },
      { value: "tasks_due_soon", label: "Tasks Due Soon" },
      { value: "tasks_overdue", label: "Overdue Tasks" },
      { value: "projects_by_phase", label: "Projects by Phase" },
      { value: "projects_active_completed", label: "Active vs Completed Projects" },
    ],
  },
  {
    key: "relationships",
    label: "Relationships",
    types: [
      { value: "crm_pipeline_totals", label: "Pipeline Totals by Stage" },
      { value: "crm_opportunities_won_lost", label: "Opportunities Won/Lost" },
      { value: "donors_by_campaign", label: "Donations by Campaign" },
      { value: "donor_retention", label: "Donor Retention" },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    types: [
      { value: "invoices_by_status", label: "Invoices by Status" },
      { value: "receipts_by_tag", label: "Receipts by Tag" },
    ],
  },
];

export function getReportCategory(type: ReportType): string {
  for (const cat of REPORT_CATEGORIES) {
    if (cat.types.some((t) => t.value === type)) {
      return cat.key;
    }
  }
  return "work";
}

export function getReportLabel(type: ReportType): string {
  for (const cat of REPORT_CATEGORIES) {
    const found = cat.types.find((t) => t.value === type);
    if (found) return found.label;
  }
  return type;
}

export function useReports() {
  const { activeCompanyId } = useMembership();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reports", activeCompanyId, user?.id],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      // Fetch both personal and company reports
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Report[];
    },
    enabled: !!activeCompanyId && !!user?.id,
  });
}

export function useReport(reportId: string | undefined) {
  return useQuery({
    queryKey: ["report", reportId],
    queryFn: async () => {
      if (!reportId) return null;

      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (error) throw error;
      return data as Report;
    },
    enabled: !!reportId,
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useMembership();
  const { user } = useAuth();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (
      input: Omit<Report, "id" | "company_id" | "created_at" | "updated_at">
    ) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data, error } = await supabase
        .from("reports")
        .insert({
          ...input,
          company_id: activeCompanyId,
          owner_user_id: input.is_personal ? user?.id : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Report;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reports", activeCompanyId] });
      logAction("report", data.id, "created", { name: data.name });
      toast.success("Report created");
    },
    onError: (error) => {
      toast.error("Failed to create report", { description: error.message });
    },
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useMembership();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Report> & { id: string }) => {
      const { data, error } = await supabase
        .from("reports")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Report;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reports", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["report", data.id] });
      logAction("report", data.id, "updated", { name: data.name });
      toast.success("Report updated");
    },
    onError: (error) => {
      toast.error("Failed to update report", { description: error.message });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useMembership();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("id", reportId);

      if (error) throw error;
      return reportId;
    },
    onSuccess: (reportId) => {
      queryClient.invalidateQueries({ queryKey: ["reports", activeCompanyId] });
      logAction("report", reportId, "deleted", {});
      toast.success("Report deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete report", { description: error.message });
    },
  });
}

export function useCacheReportRun() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      reportId,
      result,
    }: {
      reportId: string;
      result: unknown;
    }) => {
      const { data, error } = await supabase
        .from("report_runs")
        .insert({
          report_id: reportId,
          result_json: result,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ReportRun;
    },
  });
}

export function useLatestReportRun(reportId: string | undefined) {
  return useQuery({
    queryKey: ["report-run", reportId],
    queryFn: async () => {
      if (!reportId) return null;

      const { data, error } = await supabase
        .from("report_runs")
        .select("*")
        .eq("report_id", reportId)
        .gt("expires_at", new Date().toISOString())
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ReportRun | null;
    },
    enabled: !!reportId,
    staleTime: 60 * 1000, // 1 minute
  });
}
