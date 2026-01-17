import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { ReportType, ReportConfig } from "./useReports";
import { subDays, subMonths, isAfter, parseISO } from "date-fns";

export interface ReportResult {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  summary?: Record<string, number | string>;
  generatedAt: string;
  metadata?: {
    dateRange?: { start: string; end: string };
    filters?: Record<string, unknown>;
    totalRows: number;
  };
}

export interface WorkReportFilters {
  assignee?: string;
  listId?: string;
  projectId?: string;
  status?: string;
  unassignedOnly?: boolean;
  owner?: string;
  activeOnly?: boolean;
  completedOnly?: boolean;
}

// Date range validation - max 24 months
const MAX_DATE_RANGE_MONTHS = 24;
const DEFAULT_DATE_RANGE_DAYS = 30;

function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = subDays(end, DEFAULT_DATE_RANGE_DAYS);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function validateDateRange(start?: string, end?: string): { start: string; end: string } {
  const defaults = getDefaultDateRange();
  
  if (!start || !end) {
    return defaults;
  }
  
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const maxStart = subMonths(endDate, MAX_DATE_RANGE_MONTHS);
  
  // If range exceeds max, cap it
  if (isAfter(maxStart, startDate)) {
    return { start: maxStart.toISOString().split("T")[0], end };
  }
  
  return { start, end };
}

/**
 * Execute a report query based on type and config.
 * All queries respect existing RLS policies.
 */
export function useReportExecution(
  reportType: ReportType | undefined,
  config: ReportConfig = {},
  options?: { enabled?: boolean; cacheKey?: string }
) {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["report-execution", activeCompanyId, reportType, config, options?.cacheKey],
    queryFn: async (): Promise<ReportResult> => {
      if (!activeCompanyId || !reportType) {
        return { columns: [], rows: [], generatedAt: new Date().toISOString() };
      }

      const { dateRange, filters } = config;
      const validatedRange = validateDateRange(dateRange?.start, dateRange?.end);
      const typedFilters = filters as WorkReportFilters | undefined;

      switch (reportType) {
        case "tasks_by_status":
          return executeTasksByStatus(activeCompanyId, validatedRange, typedFilters);

        case "tasks_by_assignee":
          return executeTasksByAssignee(activeCompanyId, validatedRange, typedFilters);

        case "tasks_due_soon":
          return executeTasksDueSoon(activeCompanyId, typedFilters);

        case "tasks_overdue":
          return executeTasksOverdue(activeCompanyId, typedFilters);

        case "projects_by_phase":
          return executeProjectsByPhase(activeCompanyId, validatedRange, typedFilters);

        case "projects_active_completed":
          return executeProjectsActiveCompleted(activeCompanyId, validatedRange, typedFilters);

        case "crm_pipeline_totals":
          return executeCrmPipelineTotals(activeCompanyId, filters);

        case "crm_opportunities_won_lost":
          return executeCrmOpportunitiesWonLost(activeCompanyId, validatedRange.start, validatedRange.end);

        case "donors_by_campaign":
          return executeDonorsByCampaign(activeCompanyId, validatedRange.start, validatedRange.end);

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
    enabled: options?.enabled !== false && !!activeCompanyId && !!reportType,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

// ==================== WORK REPORTS ====================

async function executeTasksByStatus(
  companyId: string,
  dateRange: { start: string; end: string },
  filters?: WorkReportFilters
): Promise<ReportResult> {
  let query = supabase
    .from("tasks")
    .select("id, title, status, due_date, created_at, created_by, assigned_by, list_id, project_id")
    .eq("company_id", companyId)
    .eq("is_recurring_template", false)
    .gte("created_at", dateRange.start)
    .lte("created_at", dateRange.end);

  // Apply filters
  if (filters?.listId) {
    query = query.eq("list_id", filters.listId);
  }
  if (filters?.projectId) {
    query = query.eq("project_id", filters.projectId);
  }
  if (filters?.assignee) {
    query = query.eq("assigned_by", filters.assignee);
  }
  if (filters?.unassignedOnly) {
    query = query.is("assigned_by", null);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Group by status
  const statusCounts: Record<string, { count: number; tasks: Array<{ id: string; title: string; due_date: string | null }> }> = {};
  const statusOrder = ["todo", "in_progress", "blocked", "completed", "archived"];
  
  statusOrder.forEach(s => {
    statusCounts[s] = { count: 0, tasks: [] };
  });

  (data || []).forEach((task) => {
    const status = task.status || "unknown";
    if (!statusCounts[status]) {
      statusCounts[status] = { count: 0, tasks: [] };
    }
    statusCounts[status].count++;
    statusCounts[status].tasks.push({
      id: task.id,
      title: task.title,
      due_date: task.due_date,
    });
  });

  const rows = Object.entries(statusCounts)
    .filter(([_, { count }]) => count > 0)
    .map(([status, { count, tasks }]) => ({
      status,
      count,
      percentage: data?.length ? Math.round((count / data.length) * 100) : 0,
    }));

  return {
    columns: ["status", "count", "percentage"],
    rows,
    summary: {
      total: data?.length || 0,
      todo: statusCounts.todo?.count || 0,
      in_progress: statusCounts.in_progress?.count || 0,
      completed: statusCounts.completed?.count || 0,
    },
    metadata: {
      dateRange,
      filters: filters as Record<string, unknown>,
      totalRows: data?.length || 0,
    },
    generatedAt: new Date().toISOString(),
  };
}

async function executeTasksByAssignee(
  companyId: string,
  dateRange: { start: string; end: string },
  filters?: WorkReportFilters
): Promise<ReportResult> {
  let query = supabase
    .from("tasks")
    .select("id, title, status, due_date, created_at, assigned_by, list_id, project_id")
    .eq("company_id", companyId)
    .eq("is_recurring_template", false)
    .gte("created_at", dateRange.start)
    .lte("created_at", dateRange.end);

  if (filters?.listId) {
    query = query.eq("list_id", filters.listId);
  }
  if (filters?.projectId) {
    query = query.eq("project_id", filters.projectId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Group by assignee
  const assigneeCounts: Record<string, { count: number; completed: number; pending: number }> = {};
  
  (data || []).forEach((task) => {
    const assignee = task.assigned_by || "unassigned";
    if (!assigneeCounts[assignee]) {
      assigneeCounts[assignee] = { count: 0, completed: 0, pending: 0 };
    }
    assigneeCounts[assignee].count++;
    if (task.status === "completed") {
      assigneeCounts[assignee].completed++;
    } else {
      assigneeCounts[assignee].pending++;
    }
  });

  const rows = Object.entries(assigneeCounts).map(([assignee_id, stats]) => ({
    assignee_id,
    assignee: assignee_id === "unassigned" ? "Unassigned" : assignee_id,
    total: stats.count,
    completed: stats.completed,
    pending: stats.pending,
    completion_rate: stats.count > 0 ? Math.round((stats.completed / stats.count) * 100) : 0,
  }));

  // Sort by total tasks descending
  rows.sort((a, b) => b.total - a.total);

  return {
    columns: ["assignee", "total", "completed", "pending", "completion_rate"],
    rows,
    summary: {
      total_tasks: data?.length || 0,
      total_assignees: Object.keys(assigneeCounts).length,
      unassigned: assigneeCounts["unassigned"]?.count || 0,
    },
    metadata: {
      dateRange,
      filters: filters as Record<string, unknown>,
      totalRows: data?.length || 0,
    },
    generatedAt: new Date().toISOString(),
  };
}

async function executeTasksDueSoon(
  companyId: string,
  filters?: WorkReportFilters
): Promise<ReportResult> {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayStr = now.toISOString().split("T")[0];
  const nextWeekStr = nextWeek.toISOString().split("T")[0];

  let query = supabase
    .from("tasks")
    .select("id, title, due_date, status, assigned_by, project_id, list_id, priority")
    .eq("company_id", companyId)
    .eq("is_recurring_template", false)
    .neq("status", "completed")
    .neq("status", "archived")
    .not("due_date", "is", null)
    .gte("due_date", todayStr)
    .lte("due_date", nextWeekStr)
    .order("due_date", { ascending: true });

  if (filters?.assignee) {
    query = query.eq("assigned_by", filters.assignee);
  }
  if (filters?.projectId) {
    query = query.eq("project_id", filters.projectId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []).map((task) => ({
    id: task.id,
    title: task.title,
    due_date: task.due_date,
    status: task.status,
    priority: task.priority,
    assignee_id: task.assigned_by || "Unassigned",
    days_until_due: Math.ceil(
      (new Date(task.due_date!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));

  // Split by urgency
  const dueToday = rows.filter((r) => r.days_until_due === 0).length;
  const dueTomorrow = rows.filter((r) => r.days_until_due === 1).length;
  const dueThisWeek = rows.filter((r) => r.days_until_due > 1 && r.days_until_due <= 7).length;

  return {
    columns: ["title", "due_date", "status", "priority", "days_until_due"],
    rows,
    summary: {
      total: rows.length,
      due_today: dueToday,
      due_tomorrow: dueTomorrow,
      due_this_week: dueThisWeek,
    },
    metadata: {
      totalRows: rows.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

async function executeTasksOverdue(
  companyId: string,
  filters?: WorkReportFilters
): Promise<ReportResult> {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  let query = supabase
    .from("tasks")
    .select("id, title, due_date, status, assigned_by, project_id, list_id, priority")
    .eq("company_id", companyId)
    .eq("is_recurring_template", false)
    .neq("status", "completed")
    .neq("status", "archived")
    .not("due_date", "is", null)
    .lt("due_date", todayStr)
    .order("due_date", { ascending: true });

  if (filters?.assignee) {
    query = query.eq("assigned_by", filters.assignee);
  }
  if (filters?.projectId) {
    query = query.eq("project_id", filters.projectId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []).map((task) => ({
    id: task.id,
    title: task.title,
    due_date: task.due_date,
    status: task.status,
    priority: task.priority,
    assignee_id: task.assigned_by || "Unassigned",
    days_overdue: Math.ceil(
      (now.getTime() - new Date(task.due_date!).getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));

  // Group by severity
  const critical = rows.filter((r) => r.days_overdue > 7).length;
  const warning = rows.filter((r) => r.days_overdue > 1 && r.days_overdue <= 7).length;
  const recent = rows.filter((r) => r.days_overdue === 1).length;

  return {
    columns: ["title", "due_date", "status", "priority", "days_overdue"],
    rows,
    summary: {
      total_overdue: rows.length,
      critical_over_7_days: critical,
      warning_2_7_days: warning,
      recent_1_day: recent,
    },
    metadata: {
      totalRows: rows.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

async function executeProjectsByPhase(
  companyId: string,
  dateRange: { start: string; end: string },
  filters?: WorkReportFilters
): Promise<ReportResult> {
  let query = supabase
    .from("projects")
    .select("id, name, status, progress, owner_user_id, phases, created_at, start_date, due_date")
    .eq("company_id", companyId)
    .eq("is_template", false)
    .gte("created_at", dateRange.start)
    .lte("created_at", dateRange.end);

  if (filters?.activeOnly) {
    query = query.in("status", ["active", "in_progress"]);
  }
  if (filters?.completedOnly) {
    query = query.eq("status", "completed");
  }
  if (filters?.owner) {
    query = query.eq("owner_user_id", filters.owner);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Also fetch project_phases for this company
  const { data: phases } = await supabase
    .from("project_phases")
    .select("id, project_id, name, status")
    .eq("company_id", companyId);

  // Group projects by their current phase status
  const phaseCounts: Record<string, { count: number; projects: string[] }> = {
    not_started: { count: 0, projects: [] },
    in_progress: { count: 0, projects: [] },
    completed: { count: 0, projects: [] },
  };

  // Count phases across all projects
  (phases || []).forEach((phase) => {
    const status = phase.status || "not_started";
    if (!phaseCounts[status]) {
      phaseCounts[status] = { count: 0, projects: [] };
    }
    phaseCounts[status].count++;
  });

  // Also create project-level summary by status
  const projectsByStatus: Record<string, number> = {};
  (data || []).forEach((project) => {
    const status = project.status || "unknown";
    projectsByStatus[status] = (projectsByStatus[status] || 0) + 1;
  });

  const rows = Object.entries(projectsByStatus).map(([status, count]) => ({
    status,
    count,
    percentage: data?.length ? Math.round((count / data.length) * 100) : 0,
  }));

  return {
    columns: ["status", "count", "percentage"],
    rows,
    summary: {
      total_projects: data?.length || 0,
      total_phases: phases?.length || 0,
      phases_in_progress: phaseCounts.in_progress?.count || 0,
      phases_completed: phaseCounts.completed?.count || 0,
    },
    metadata: {
      dateRange,
      filters: filters as Record<string, unknown>,
      totalRows: data?.length || 0,
    },
    generatedAt: new Date().toISOString(),
  };
}

async function executeProjectsActiveCompleted(
  companyId: string,
  dateRange: { start: string; end: string },
  filters?: WorkReportFilters
): Promise<ReportResult> {
  let query = supabase
    .from("projects")
    .select("id, name, status, progress, owner_user_id, start_date, due_date, created_at")
    .eq("company_id", companyId)
    .eq("is_template", false)
    .gte("created_at", dateRange.start)
    .lte("created_at", dateRange.end);

  if (filters?.owner) {
    query = query.eq("owner_user_id", filters.owner);
  }

  const { data, error } = await query;
  if (error) throw error;

  const active = (data || []).filter(
    (p) => p.status === "active" || p.status === "in_progress"
  );
  const completed = (data || []).filter((p) => p.status === "completed");
  const onHold = (data || []).filter((p) => p.status === "on_hold");
  const other = (data || []).filter(
    (p) => !["active", "in_progress", "completed", "on_hold"].includes(p.status)
  );

  const avgProgress = data?.length
    ? Math.round(data.reduce((sum, p) => sum + (p.progress || 0), 0) / data.length)
    : 0;

  return {
    columns: ["status", "count", "percentage"],
    rows: [
      { status: "Active", count: active.length, percentage: data?.length ? Math.round((active.length / data.length) * 100) : 0 },
      { status: "Completed", count: completed.length, percentage: data?.length ? Math.round((completed.length / data.length) * 100) : 0 },
      { status: "On Hold", count: onHold.length, percentage: data?.length ? Math.round((onHold.length / data.length) * 100) : 0 },
      { status: "Other", count: other.length, percentage: data?.length ? Math.round((other.length / data.length) * 100) : 0 },
    ].filter((r) => r.count > 0),
    summary: {
      total: data?.length || 0,
      active: active.length,
      completed: completed.length,
      average_progress: avgProgress,
    },
    metadata: {
      dateRange,
      filters: filters as Record<string, unknown>,
      totalRows: data?.length || 0,
    },
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
  return {
    columns: ["status", "count", "total_amount"],
    rows: [],
    summary: { totalInvoices: 0, totalValue: 0 },
    generatedAt: new Date().toISOString(),
  };
}

async function executeReceiptsByTag(): Promise<ReportResult> {
  return {
    columns: ["tag", "count", "total_amount"],
    rows: [],
    summary: { totalReceipts: 0, totalValue: 0 },
    generatedAt: new Date().toISOString(),
  };
}
