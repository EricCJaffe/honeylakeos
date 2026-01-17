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
          return executeProjectsByPhase(activeCompanyId, filters);

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
          return executeInvoicesByStatus(activeCompanyId);

        case "receipts_by_tag":
          return executeReceiptsByTag(activeCompanyId);

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
  let query = supabase
    .from("tasks")
    .select("id, status")
    .eq("company_id", companyId)
    .is("archived_at", null);

  if (filters?.assigneeId) {
    query = query.eq("assignee_user_id", filters.assigneeId as string);
  }

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
  let query = supabase
    .from("tasks")
    .select("id, assignee_user_id, profiles:assignee_user_id(full_name)")
    .eq("company_id", companyId)
    .is("archived_at", null);

  if (filters?.status) {
    query = query.eq("status", filters.status as string);
  }

  const { data, error } = await query;
  if (error) throw error;

  const assigneeCounts: Record<string, { name: string; count: number }> = {};
  (data || []).forEach((task: any) => {
    const id = task.assignee_user_id || "unassigned";
    const name = task.profiles?.full_name || "Unassigned";
    if (!assigneeCounts[id]) {
      assigneeCounts[id] = { name, count: 0 };
    }
    assigneeCounts[id].count++;
  });

  const rows = Object.entries(assigneeCounts).map(([id, { name, count }]) => ({
    assignee_id: id,
    assignee_name: name,
    count,
  }));

  return {
    columns: ["assignee_name", "count"],
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
    .select("id, title, due_at, status, assignee_user_id, profiles:assignee_user_id(full_name)")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .neq("status", "done")
    .gte("due_at", now.toISOString())
    .lte("due_at", nextWeek.toISOString())
    .order("due_at", { ascending: true });

  if (error) throw error;

  const rows = (data || []).map((task: any) => ({
    id: task.id,
    title: task.title,
    due_at: task.due_at,
    status: task.status,
    assignee: task.profiles?.full_name || "Unassigned",
  }));

  return {
    columns: ["title", "due_at", "status", "assignee"],
    rows,
    summary: { total: rows.length },
    generatedAt: new Date().toISOString(),
  };
}

async function executeTasksOverdue(companyId: string): Promise<ReportResult> {
  const now = new Date();

  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, due_at, status, assignee_user_id, profiles:assignee_user_id(full_name)")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .neq("status", "done")
    .lt("due_at", now.toISOString())
    .order("due_at", { ascending: true });

  if (error) throw error;

  const rows = (data || []).map((task: any) => ({
    id: task.id,
    title: task.title,
    due_at: task.due_at,
    status: task.status,
    assignee: task.profiles?.full_name || "Unassigned",
  }));

  return {
    columns: ["title", "due_at", "status", "assignee"],
    rows,
    summary: { total: rows.length },
    generatedAt: new Date().toISOString(),
  };
}

async function executeProjectsByPhase(
  companyId: string,
  filters?: Record<string, unknown>
): Promise<ReportResult> {
  let query = supabase
    .from("projects")
    .select("id, current_phase_id, project_phases(id, name)")
    .eq("company_id", companyId)
    .is("archived_at", null);

  const { data, error } = await query;
  if (error) throw error;

  const phaseCounts: Record<string, { name: string; count: number }> = {};
  (data || []).forEach((project: any) => {
    const phaseId = project.current_phase_id || "no-phase";
    const phaseName = project.project_phases?.name || "No Phase";
    if (!phaseCounts[phaseId]) {
      phaseCounts[phaseId] = { name: phaseName, count: 0 };
    }
    phaseCounts[phaseId].count++;
  });

  const rows = Object.entries(phaseCounts).map(([id, { name, count }]) => ({
    phase_id: id,
    phase_name: name,
    count,
  }));

  return {
    columns: ["phase_name", "count"],
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
    .is("archived_at", null);

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
    .select("id, amount, stage_id, sales_stages(id, name)")
    .eq("company_id", companyId)
    .is("archived_at", null);

  if (filters?.pipelineId) {
    query = query.eq("pipeline_id", filters.pipelineId as string);
  }

  const { data, error } = await query;
  if (error) throw error;

  const stageTotals: Record<string, { name: string; count: number; total: number }> = {};
  (data || []).forEach((opp: any) => {
    const stageId = opp.stage_id || "no-stage";
    const stageName = opp.sales_stages?.name || "No Stage";
    if (!stageTotals[stageId]) {
      stageTotals[stageId] = { name: stageName, count: 0, total: 0 };
    }
    stageTotals[stageId].count++;
    stageTotals[stageId].total += opp.amount || 0;
  });

  const rows = Object.entries(stageTotals).map(([id, { name, count, total }]) => ({
    stage_id: id,
    stage_name: name,
    count,
    total_amount: total,
  }));

  const grandTotal = rows.reduce((sum, r) => sum + (r.total_amount as number), 0);

  return {
    columns: ["stage_name", "count", "total_amount"],
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
    .select("id, amount, status, closed_at")
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

  const wonTotal = won.reduce((sum, o) => sum + (o.amount || 0), 0);
  const lostTotal = lost.reduce((sum, o) => sum + (o.amount || 0), 0);

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
    .select("id, amount, campaign_id, donor_campaigns(id, name)")
    .eq("company_id", companyId);

  if (startDate) {
    query = query.gte("donation_date", startDate);
  }
  if (endDate) {
    query = query.lte("donation_date", endDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  const campaignTotals: Record<string, { name: string; count: number; total: number }> = {};
  (data || []).forEach((donation: any) => {
    const campaignId = donation.campaign_id || "no-campaign";
    const campaignName = donation.donor_campaigns?.name || "No Campaign";
    if (!campaignTotals[campaignId]) {
      campaignTotals[campaignId] = { name: campaignName, count: 0, total: 0 };
    }
    campaignTotals[campaignId].count++;
    campaignTotals[campaignId].total += donation.amount || 0;
  });

  const rows = Object.entries(campaignTotals).map(([id, { name, count, total }]) => ({
    campaign_id: id,
    campaign_name: name,
    donation_count: count,
    total_amount: total,
  }));

  const grandTotal = rows.reduce((sum, r) => sum + (r.total_amount as number), 0);

  return {
    columns: ["campaign_name", "donation_count", "total_amount"],
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

async function executeInvoicesByStatus(companyId: string): Promise<ReportResult> {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, status, total_amount")
    .eq("company_id", companyId);

  if (error) throw error;

  const statusTotals: Record<string, { count: number; total: number }> = {};
  (data || []).forEach((invoice: any) => {
    const status = invoice.status || "unknown";
    if (!statusTotals[status]) {
      statusTotals[status] = { count: 0, total: 0 };
    }
    statusTotals[status].count++;
    statusTotals[status].total += invoice.total_amount || 0;
  });

  const rows = Object.entries(statusTotals).map(([status, { count, total }]) => ({
    status,
    count,
    total_amount: total,
  }));

  const grandTotal = rows.reduce((sum, r) => sum + (r.total_amount as number), 0);

  return {
    columns: ["status", "count", "total_amount"],
    rows,
    summary: { totalInvoices: data?.length || 0, totalValue: grandTotal },
    generatedAt: new Date().toISOString(),
  };
}

async function executeReceiptsByTag(companyId: string): Promise<ReportResult> {
  const { data, error } = await supabase
    .from("receipts")
    .select("id, amount, tags")
    .eq("company_id", companyId);

  if (error) throw error;

  const tagTotals: Record<string, { count: number; total: number }> = {};
  (data || []).forEach((receipt: any) => {
    const tags = Array.isArray(receipt.tags) ? receipt.tags : [];
    if (tags.length === 0) {
      if (!tagTotals["Untagged"]) {
        tagTotals["Untagged"] = { count: 0, total: 0 };
      }
      tagTotals["Untagged"].count++;
      tagTotals["Untagged"].total += receipt.amount || 0;
    } else {
      tags.forEach((tag: string) => {
        if (!tagTotals[tag]) {
          tagTotals[tag] = { count: 0, total: 0 };
        }
        tagTotals[tag].count++;
        tagTotals[tag].total += receipt.amount || 0;
      });
    }
  });

  const rows = Object.entries(tagTotals).map(([tag, { count, total }]) => ({
    tag,
    count,
    total_amount: total,
  }));

  const grandTotal = (data || []).reduce((sum, r: any) => sum + (r.amount || 0), 0);

  return {
    columns: ["tag", "count", "total_amount"],
    rows,
    summary: { totalReceipts: data?.length || 0, totalValue: grandTotal },
    generatedAt: new Date().toISOString(),
  };
}
