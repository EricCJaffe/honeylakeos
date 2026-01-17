import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { ReportType, ReportConfig } from "./useReports";

export interface ReportResult {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  summary?: Record<string, number>;
  generatedAt: string;
}

/**
 * Execute a report query based on type and config.
 * All queries respect existing RLS policies.
 */
export function useReportExecution(
  reportType: ReportType | undefined,
  config: ReportConfig = {}
) {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["report-execution", activeCompanyId, reportType, config],
    queryFn: async (): Promise<ReportResult> => {
      if (!activeCompanyId || !reportType) {
        return { columns: [], rows: [], generatedAt: new Date().toISOString() };
      }

      const { dateRange, filters } = config;
      const startDate = dateRange?.start;
      const endDate = dateRange?.end;

      switch (reportType) {
        case "tasks_by_status":
          return executeTasksByStatus(activeCompanyId, filters);

        case "tasks_by_assignee":
          return executeTasksByAssignee(activeCompanyId, filters);

        case "tasks_due_soon":
          return executeTasksDueSoon(activeCompanyId);

        case "tasks_overdue":
          return executeTasksOverdue(activeCompanyId);

        case "projects_by_phase":
          return executeProjectsByPhase(activeCompanyId);

        case "projects_active_completed":
          return executeProjectsActiveCompleted(activeCompanyId);

        case "crm_pipeline_totals":
          return executeCrmPipelineTotals(activeCompanyId, filters);

        case "crm_opportunities_won_lost":
          return executeCrmOpportunitiesWonLost(activeCompanyId, startDate, endDate);

        case "donors_by_campaign":
          return executeDonorsByCampaign(activeCompanyId, startDate, endDate);

        case "donor_retention":
          return executeDonorRetention(activeCompanyId);

        case "invoices_by_status":
          return executeInvoicesByStatus();

        case "receipts_by_tag":
          return executeReceiptsByTag();

        default:
          return { columns: [], rows: [], generatedAt: new Date().toISOString() };
      }
    },
    enabled: !!activeCompanyId && !!reportType,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ==================== WORK REPORTS ====================

async function executeTasksByStatus(
  companyId: string,
  filters?: Record<string, unknown>
): Promise<ReportResult> {
  const query = supabase
    .from("tasks")
    .select("id, status")
    .eq("company_id", companyId)
    .eq("is_recurring_template", false);

  const { data, error } = await query;
  if (error) throw error;

  const statusCounts: Record<string, number> = {};
  (data || []).forEach((task) => {
    const status = task.status || "unknown";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const rows = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  return {
    columns: ["status", "count"],
    rows,
    summary: { total: data?.length || 0 },
    generatedAt: new Date().toISOString(),
  };
}

async function executeTasksByAssignee(
  companyId: string,
  filters?: Record<string, unknown>
): Promise<ReportResult> {
  // Tasks don't have assignee column - group by created_by instead
  const query = supabase
    .from("tasks")
    .select("id, created_by")
    .eq("company_id", companyId)
    .eq("is_recurring_template", false);

  const { data, error } = await query;
  if (error) throw error;

  const creatorCounts: Record<string, number> = {};
  (data || []).forEach((task) => {
    const id = task.created_by || "unknown";
    creatorCounts[id] = (creatorCounts[id] || 0) + 1;
  });

  const rows = Object.entries(creatorCounts).map(([id, count]) => ({
    creator_id: id,
    count,
  }));

  return {
    columns: ["creator_id", "count"],
    rows,
    summary: { total: data?.length || 0 },
    generatedAt: new Date().toISOString(),
  };
}

async function executeTasksDueSoon(companyId: string): Promise<ReportResult> {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, due_date, status, created_by")
    .eq("company_id", companyId)
    .eq("is_recurring_template", false)
    .neq("status", "done")
    .not("due_date", "is", null)
    .gte("due_date", now.toISOString().split("T")[0])
    .lte("due_date", nextWeek.toISOString().split("T")[0])
    .order("due_date", { ascending: true });

  if (error) throw error;

  const rows = (data || []).map((task) => ({
    id: task.id,
    title: task.title,
    due_date: task.due_date,
    status: task.status,
    creator_id: task.created_by || "Unknown",
  }));

  return {
    columns: ["title", "due_date", "status", "creator_id"],
    rows,
    summary: { total: rows.length },
    generatedAt: new Date().toISOString(),
  };
}

async function executeTasksOverdue(companyId: string): Promise<ReportResult> {
  const now = new Date();

  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, due_date, status, created_by")
    .eq("company_id", companyId)
    .eq("is_recurring_template", false)
    .neq("status", "done")
    .not("due_date", "is", null)
    .lt("due_date", now.toISOString().split("T")[0])
    .order("due_date", { ascending: true });

  if (error) throw error;

  const rows = (data || []).map((task) => ({
    id: task.id,
    title: task.title,
    due_date: task.due_date,
    status: task.status,
    creator_id: task.created_by || "Unknown",
  }));

  return {
    columns: ["title", "due_date", "status", "creator_id"],
    rows,
    summary: { total: rows.length },
    generatedAt: new Date().toISOString(),
  };
}

async function executeProjectsByPhase(companyId: string): Promise<ReportResult> {
  // Projects store phases as JSONB array, not as a separate column
  const { data, error } = await supabase
    .from("projects")
    .select("id, status, phases")
    .eq("company_id", companyId)
    .eq("is_template", false);

  if (error) throw error;

  // Count projects by status instead (since phases is complex)
  const statusCounts: Record<string, number> = {};
  (data || []).forEach((project) => {
    const status = project.status || "unknown";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const rows = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));

  return {
    columns: ["status", "count"],
    rows,
    summary: { total: data?.length || 0 },
    generatedAt: new Date().toISOString(),
  };
}

async function executeProjectsActiveCompleted(
  companyId: string
): Promise<ReportResult> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, status")
    .eq("company_id", companyId)
    .eq("is_template", false);

  if (error) throw error;

  const active = (data || []).filter(
    (p) => p.status === "active" || p.status === "in_progress"
  ).length;
  const completed = (data || []).filter((p) => p.status === "completed").length;
  const other = (data || []).length - active - completed;

  return {
    columns: ["status", "count"],
    rows: [
      { status: "Active", count: active },
      { status: "Completed", count: completed },
      { status: "Other", count: other },
    ],
    summary: { total: data?.length || 0 },
    generatedAt: new Date().toISOString(),
  };
}

// ==================== RELATIONSHIPS REPORTS ====================

async function executeCrmPipelineTotals(
  companyId: string,
  filters?: Record<string, unknown>
): Promise<ReportResult> {
  let query = supabase
    .from("sales_opportunities")
    .select("id, value_amount, stage_id, status")
    .eq("company_id", companyId)
    .is("archived_at", null);

  if (filters?.pipelineId) {
    query = query.eq("pipeline_id", filters.pipelineId as string);
  }

  const { data, error } = await query;
  if (error) throw error;

  const stageTotals: Record<string, { count: number; total: number }> = {};
  (data || []).forEach((opp) => {
    const stageId = opp.stage_id || "no-stage";
    if (!stageTotals[stageId]) {
      stageTotals[stageId] = { count: 0, total: 0 };
    }
    stageTotals[stageId].count++;
    stageTotals[stageId].total += opp.value_amount || 0;
  });

  const rows = Object.entries(stageTotals).map(([id, { count, total }]) => ({
    stage_id: id,
    count,
    total_amount: total,
  }));

  const grandTotal = rows.reduce((sum, r) => sum + (r.total_amount as number), 0);

  return {
    columns: ["stage_id", "count", "total_amount"],
    rows,
    summary: { totalOpportunities: data?.length || 0, totalValue: grandTotal },
    generatedAt: new Date().toISOString(),
  };
}

async function executeCrmOpportunitiesWonLost(
  companyId: string,
  startDate?: string,
  endDate?: string
): Promise<ReportResult> {
  let query = supabase
    .from("sales_opportunities")
    .select("id, value_amount, status, closed_at")
    .eq("company_id", companyId)
    .in("status", ["won", "lost"]);

  if (startDate) {
    query = query.gte("closed_at", startDate);
  }
  if (endDate) {
    query = query.lte("closed_at", endDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  const won = (data || []).filter((o) => o.status === "won");
  const lost = (data || []).filter((o) => o.status === "lost");

  const wonTotal = won.reduce((sum, o) => sum + (o.value_amount || 0), 0);
  const lostTotal = lost.reduce((sum, o) => sum + (o.value_amount || 0), 0);

  return {
    columns: ["outcome", "count", "total_amount"],
    rows: [
      { outcome: "Won", count: won.length, total_amount: wonTotal },
      { outcome: "Lost", count: lost.length, total_amount: lostTotal },
    ],
    summary: { wonCount: won.length, lostCount: lost.length, wonTotal, lostTotal },
    generatedAt: new Date().toISOString(),
  };
}

async function executeDonorsByCampaign(
  companyId: string,
  startDate?: string,
  endDate?: string
): Promise<ReportResult> {
  let query = supabase
    .from("donations")
    .select("id, amount, campaign_id")
    .eq("company_id", companyId);

  if (startDate) {
    query = query.gte("donation_date", startDate);
  }
  if (endDate) {
    query = query.lte("donation_date", endDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  const campaignTotals: Record<string, { count: number; total: number }> = {};
  (data || []).forEach((donation) => {
    const campaignId = donation.campaign_id || "no-campaign";
    if (!campaignTotals[campaignId]) {
      campaignTotals[campaignId] = { count: 0, total: 0 };
    }
    campaignTotals[campaignId].count++;
    campaignTotals[campaignId].total += donation.amount || 0;
  });

  const rows = Object.entries(campaignTotals).map(([id, { count, total }]) => ({
    campaign_id: id,
    donation_count: count,
    total_amount: total,
  }));

  const grandTotal = rows.reduce((sum, r) => sum + (r.total_amount as number), 0);

  return {
    columns: ["campaign_id", "donation_count", "total_amount"],
    rows,
    summary: { totalDonations: data?.length || 0, totalValue: grandTotal },
    generatedAt: new Date().toISOString(),
  };
}

async function executeDonorRetention(companyId: string): Promise<ReportResult> {
  // Simple retention: donors who gave in both last year and this year
  const thisYear = new Date().getFullYear();
  const lastYear = thisYear - 1;

  const { data: thisYearDonations } = await supabase
    .from("donations")
    .select("donor_profile_id")
    .eq("company_id", companyId)
    .gte("donation_date", `${thisYear}-01-01`)
    .lte("donation_date", `${thisYear}-12-31`);

  const { data: lastYearDonations } = await supabase
    .from("donations")
    .select("donor_profile_id")
    .eq("company_id", companyId)
    .gte("donation_date", `${lastYear}-01-01`)
    .lte("donation_date", `${lastYear}-12-31`);

  const thisYearDonors = new Set((thisYearDonations || []).map((d) => d.donor_profile_id));
  const lastYearDonors = new Set((lastYearDonations || []).map((d) => d.donor_profile_id));

  const retained = [...lastYearDonors].filter((d) => thisYearDonors.has(d)).length;
  const newDonors = [...thisYearDonors].filter((d) => !lastYearDonors.has(d)).length;
  const lapsed = [...lastYearDonors].filter((d) => !thisYearDonors.has(d)).length;

  const retentionRate = lastYearDonors.size > 0 
    ? Math.round((retained / lastYearDonors.size) * 100) 
    : 0;

  return {
    columns: ["metric", "value"],
    rows: [
      { metric: "Retained Donors", value: retained },
      { metric: "New Donors (This Year)", value: newDonors },
      { metric: "Lapsed Donors", value: lapsed },
      { metric: "Retention Rate", value: `${retentionRate}%` },
    ],
    summary: {
      retained,
      newDonors,
      lapsed,
      retentionRate,
      lastYearTotal: lastYearDonors.size,
      thisYearTotal: thisYearDonors.size,
    },
    generatedAt: new Date().toISOString(),
  };
}

// ==================== FINANCE REPORTS ====================
// Note: invoices and receipts tables don't exist yet, return placeholder data

async function executeInvoicesByStatus(): Promise<ReportResult> {
  // Placeholder - invoices table not yet implemented
  return {
    columns: ["status", "count", "total_amount"],
    rows: [],
    summary: { totalInvoices: 0, totalValue: 0 },
    generatedAt: new Date().toISOString(),
  };
}

async function executeReceiptsByTag(): Promise<ReportResult> {
  // Placeholder - receipts table not yet implemented
  return {
    columns: ["tag", "count", "total_amount"],
    rows: [],
    summary: { totalReceipts: 0, totalValue: 0 },
    generatedAt: new Date().toISOString(),
  };
}
