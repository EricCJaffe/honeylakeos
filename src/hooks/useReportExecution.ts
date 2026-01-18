import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { ReportType, ReportConfig } from "./useReports";
import { subDays, subMonths, isAfter, parseISO, startOfWeek, startOfMonth, format, subQuarters, subYears } from "date-fns";

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

export interface RelationshipsReportFilters {
  pipelineId?: string;
  campaignId?: string;
  donorId?: string;
  owner?: string;
  useDateUpdated?: boolean;
  groupInterval?: "week" | "month";
  period?: "month" | "quarter" | "year";
}

// Date range validation - max 36 months for relationships reports
const MAX_DATE_RANGE_MONTHS = 36;
const DEFAULT_DATE_RANGE_DAYS = 90;

function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = subDays(end, DEFAULT_DATE_RANGE_DAYS);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function validateDateRange(start?: string, end?: string, maxMonths = MAX_DATE_RANGE_MONTHS): { start: string; end: string } {
  const defaults = getDefaultDateRange();
  
  if (!start || !end) {
    return defaults;
  }
  
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const maxStart = subMonths(endDate, maxMonths);
  
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
      const relationshipsFilters = filters as RelationshipsReportFilters | undefined;

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
          return executeCrmPipelineTotals(activeCompanyId, validatedRange, relationshipsFilters);

        case "crm_opportunities_won_lost":
          return executeCrmOpportunitiesWonLost(activeCompanyId, validatedRange, relationshipsFilters);

        case "donors_by_campaign":
          return executeDonorsByCampaign(activeCompanyId, validatedRange, relationshipsFilters);

        case "donor_retention":
          return executeDonorRetention(activeCompanyId, relationshipsFilters);

        case "invoices_by_status":
          return executeInvoicesByStatus(activeCompanyId, validatedRange, filters);

        case "payments_summary":
          return executePaymentsSummary(activeCompanyId, validatedRange, filters);

        case "receipts_by_tag":
          return executeReceiptsByTag(activeCompanyId, validatedRange, filters);

        case "ar_aging":
          return executeArAging(activeCompanyId, filters);

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
  dateRange: { start: string; end: string },
  filters?: RelationshipsReportFilters
): Promise<ReportResult> {
  if (!filters?.pipelineId) {
    return { 
      columns: ["stage_id", "stage_name", "count", "total_amount"], 
      rows: [], 
      summary: { totalOpportunities: 0, totalValue: 0 },
      generatedAt: new Date().toISOString() 
    };
  }

  // Fetch stages for this pipeline
  const { data: stages } = await supabase
    .from("sales_pipeline_stages")
    .select("id, name, sort_order, is_closed_won, is_closed_lost")
    .eq("pipeline_id", filters.pipelineId)
    .is("archived_at", null)
    .order("sort_order");

  const stageMap = new Map((stages || []).map(s => [s.id, s]));

  const dateField = filters.useDateUpdated ? "updated_at" : "created_at";
  
  let query = supabase
    .from("sales_opportunities")
    .select("id, value_amount, stage_id, status, owner_user_id")
    .eq("company_id", companyId)
    .eq("pipeline_id", filters.pipelineId)
    .gte(dateField, dateRange.start)
    .lte(dateField, dateRange.end);

  if (filters.owner) {
    query = query.eq("owner_user_id", filters.owner);
  }

  const { data, error } = await query;
  if (error) throw error;

  const stageTotals: Record<string, { count: number; total: number; name: string; sortOrder: number }> = {};
  
  // Initialize with all stages
  (stages || []).forEach(stage => {
    stageTotals[stage.id] = { count: 0, total: 0, name: stage.name, sortOrder: stage.sort_order };
  });

  (data || []).forEach((opp) => {
    const stageId = opp.stage_id;
    if (stageTotals[stageId]) {
      stageTotals[stageId].count++;
      stageTotals[stageId].total += opp.value_amount || 0;
    }
  });

  const rows = Object.entries(stageTotals)
    .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
    .map(([id, { count, total, name }]) => ({
      stage_id: id,
      stage_name: name,
      count,
      total_amount: total,
      avg_amount: count > 0 ? Math.round(total / count) : 0,
    }));

  const grandTotal = rows.reduce((sum, r) => sum + (r.total_amount as number), 0);

  return {
    columns: ["stage_name", "count", "total_amount", "avg_amount"],
    rows,
    summary: { 
      totalOpportunities: data?.length || 0, 
      totalValue: grandTotal,
      totalStages: stages?.length || 0,
    },
    metadata: {
      dateRange,
      filters: filters as Record<string, unknown>,
      totalRows: rows.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

async function executeCrmOpportunitiesWonLost(
  companyId: string,
  dateRange: { start: string; end: string },
  filters?: RelationshipsReportFilters
): Promise<ReportResult> {
  if (!filters?.pipelineId) {
    return { 
      columns: ["period", "won_count", "won_amount", "lost_count", "lost_amount"], 
      rows: [], 
      summary: { wonCount: 0, lostCount: 0, wonTotal: 0, lostTotal: 0 },
      generatedAt: new Date().toISOString() 
    };
  }

  let query = supabase
    .from("sales_opportunities")
    .select("id, value_amount, status, closed_at, owner_user_id")
    .eq("company_id", companyId)
    .eq("pipeline_id", filters.pipelineId)
    .in("status", ["won", "lost"])
    .not("closed_at", "is", null)
    .gte("closed_at", dateRange.start)
    .lte("closed_at", dateRange.end);

  if (filters.owner) {
    query = query.eq("owner_user_id", filters.owner);
  }

  const { data, error } = await query;
  if (error) throw error;

  const groupInterval = filters?.groupInterval || "month";
  const periodTotals: Record<string, { won_count: number; won_amount: number; lost_count: number; lost_amount: number }> = {};

  (data || []).forEach((opp) => {
    if (!opp.closed_at) return;
    const closedDate = new Date(opp.closed_at);
    let periodKey: string;
    
    if (groupInterval === "week") {
      const weekStart = startOfWeek(closedDate, { weekStartsOn: 1 });
      periodKey = format(weekStart, "yyyy-MM-dd");
    } else {
      periodKey = format(startOfMonth(closedDate), "yyyy-MM");
    }

    if (!periodTotals[periodKey]) {
      periodTotals[periodKey] = { won_count: 0, won_amount: 0, lost_count: 0, lost_amount: 0 };
    }

    if (opp.status === "won") {
      periodTotals[periodKey].won_count++;
      periodTotals[periodKey].won_amount += opp.value_amount || 0;
    } else if (opp.status === "lost") {
      periodTotals[periodKey].lost_count++;
      periodTotals[periodKey].lost_amount += opp.value_amount || 0;
    }
  });

  const rows = Object.entries(periodTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, totals]) => ({
      period,
      ...totals,
    }));

  const won = (data || []).filter((o) => o.status === "won");
  const lost = (data || []).filter((o) => o.status === "lost");
  const wonTotal = won.reduce((sum, o) => sum + (o.value_amount || 0), 0);
  const lostTotal = lost.reduce((sum, o) => sum + (o.value_amount || 0), 0);

  return {
    columns: ["period", "won_count", "won_amount", "lost_count", "lost_amount"],
    rows,
    summary: { 
      wonCount: won.length, 
      lostCount: lost.length, 
      wonTotal, 
      lostTotal,
      winRate: won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0,
    },
    metadata: {
      dateRange,
      filters: filters as Record<string, unknown>,
      totalRows: rows.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

async function executeDonorsByCampaign(
  companyId: string,
  dateRange: { start: string; end: string },
  filters?: RelationshipsReportFilters
): Promise<ReportResult> {
  let query = supabase
    .from("donations")
    .select("id, amount, campaign_id, donor_profile_id")
    .eq("company_id", companyId)
    .gte("donation_date", dateRange.start)
    .lte("donation_date", dateRange.end);

  if (filters?.campaignId) {
    query = query.eq("campaign_id", filters.campaignId);
  }
  if (filters?.donorId) {
    query = query.eq("donor_profile_id", filters.donorId);
  }

  const { data: donations, error } = await query;
  if (error) throw error;

  // Fetch campaigns for names
  const { data: campaigns } = await supabase
    .from("donor_campaigns")
    .select("id, name")
    .eq("company_id", companyId);

  const campaignMap = new Map((campaigns || []).map(c => [c.id, c.name]));

  const campaignTotals: Record<string, { count: number; total: number; donors: Set<string> }> = {};
  
  (donations || []).forEach((donation) => {
    const campaignId = donation.campaign_id || "no-campaign";
    if (!campaignTotals[campaignId]) {
      campaignTotals[campaignId] = { count: 0, total: 0, donors: new Set() };
    }
    campaignTotals[campaignId].count++;
    campaignTotals[campaignId].total += donation.amount || 0;
    if (donation.donor_profile_id) {
      campaignTotals[campaignId].donors.add(donation.donor_profile_id);
    }
  });

  const rows = Object.entries(campaignTotals).map(([id, { count, total, donors }]) => ({
    campaign_id: id,
    campaign_name: id === "no-campaign" ? "No Campaign" : (campaignMap.get(id) || id),
    donation_count: count,
    total_amount: total,
    avg_amount: count > 0 ? Math.round(total / count) : 0,
    unique_donors: donors.size,
  }));

  // Sort by total amount descending
  rows.sort((a, b) => (b.total_amount as number) - (a.total_amount as number));

  const grandTotal = rows.reduce((sum, r) => sum + (r.total_amount as number), 0);
  const totalDonors = new Set((donations || []).map(d => d.donor_profile_id).filter(Boolean));

  return {
    columns: ["campaign_name", "donation_count", "total_amount", "avg_amount", "unique_donors"],
    rows,
    summary: { 
      totalDonations: donations?.length || 0, 
      totalValue: grandTotal,
      totalCampaigns: rows.length,
      uniqueDonors: totalDonors.size,
    },
    metadata: {
      dateRange,
      filters: filters as Record<string, unknown>,
      totalRows: rows.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

async function executeDonorRetention(
  companyId: string,
  filters?: RelationshipsReportFilters
): Promise<ReportResult> {
  const period = filters?.period || "quarter";
  const now = new Date();
  
  let currentStart: Date;
  let currentEnd: Date = now;
  let priorStart: Date;
  let priorEnd: Date;

  if (period === "month") {
    currentStart = subMonths(now, 1);
    priorStart = subMonths(now, 2);
    priorEnd = subMonths(now, 1);
  } else if (period === "quarter") {
    currentStart = subQuarters(now, 1);
    priorStart = subQuarters(now, 2);
    priorEnd = subQuarters(now, 1);
  } else {
    currentStart = subYears(now, 1);
    priorStart = subYears(now, 2);
    priorEnd = subYears(now, 1);
  }

  const currentStartStr = currentStart.toISOString().split("T")[0];
  const currentEndStr = currentEnd.toISOString().split("T")[0];
  const priorStartStr = priorStart.toISOString().split("T")[0];
  const priorEndStr = priorEnd.toISOString().split("T")[0];

  // Build queries
  let currentQuery = supabase
    .from("donations")
    .select("donor_profile_id")
    .eq("company_id", companyId)
    .gte("donation_date", currentStartStr)
    .lte("donation_date", currentEndStr);

  let priorQuery = supabase
    .from("donations")
    .select("donor_profile_id")
    .eq("company_id", companyId)
    .gte("donation_date", priorStartStr)
    .lte("donation_date", priorEndStr);

  if (filters?.campaignId) {
    currentQuery = currentQuery.eq("campaign_id", filters.campaignId);
    priorQuery = priorQuery.eq("campaign_id", filters.campaignId);
  }

  const [{ data: currentDonations }, { data: priorDonations }] = await Promise.all([
    currentQuery,
    priorQuery,
  ]);

  const currentDonors = new Set((currentDonations || []).map((d) => d.donor_profile_id).filter(Boolean));
  const priorDonors = new Set((priorDonations || []).map((d) => d.donor_profile_id).filter(Boolean));

  const retained = [...priorDonors].filter((d) => currentDonors.has(d)).length;
  const newDonors = [...currentDonors].filter((d) => !priorDonors.has(d)).length;
  const lapsed = [...priorDonors].filter((d) => !currentDonors.has(d)).length;

  const retentionRate = priorDonors.size > 0
    ? Math.round((retained / priorDonors.size) * 100)
    : 0;

  const periodLabel = period === "month" ? "Monthly" : period === "quarter" ? "Quarterly" : "Yearly";

  return {
    columns: ["metric", "value"],
    rows: [
      { metric: "Prior Period Donors", value: priorDonors.size },
      { metric: "Current Period Donors", value: currentDonors.size },
      { metric: "Retained Donors", value: retained },
      { metric: "New Donors", value: newDonors },
      { metric: "Lapsed Donors", value: lapsed },
      { metric: "Retention Rate", value: `${retentionRate}%` },
    ],
    summary: {
      retained,
      newDonors,
      lapsed,
      retentionRate,
      lastYearTotal: priorDonors.size,
      thisYearTotal: currentDonors.size,
      period: periodLabel,
    },
    metadata: {
      dateRange: { start: priorStartStr, end: currentEndStr },
      filters: filters as Record<string, unknown>,
      totalRows: 6,
    },
    generatedAt: new Date().toISOString(),
  };
}

// ==================== FINANCE REPORTS ====================

async function executeInvoicesByStatus(
  companyId: string,
  dateRange: { start: string; end: string },
  filters?: Record<string, unknown>
): Promise<ReportResult> {
  let query = supabase
    .from("invoices")
    .select("id, status, total_amount, balance_due, issue_date")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .gte("issue_date", dateRange.start)
    .lte("issue_date", dateRange.end);

  if (filters?.customerId) {
    query = query.eq("crm_client_id", filters.customerId as string);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status as string);
  }

  const { data, error } = await query;
  if (error) throw error;

  const statusTotals: Record<string, { count: number; total: number; balance: number }> = {};
  (data || []).forEach((inv) => {
    const status = inv.status || "unknown";
    if (!statusTotals[status]) {
      statusTotals[status] = { count: 0, total: 0, balance: 0 };
    }
    statusTotals[status].count++;
    statusTotals[status].total += Number(inv.total_amount) || 0;
    statusTotals[status].balance += Number(inv.balance_due) || 0;
  });

  const rows = Object.entries(statusTotals).map(([status, { count, total, balance }]) => ({
    status,
    count,
    total_amount: total,
    balance_due: balance,
  }));

  const totalAmount = rows.reduce((s, r) => s + (r.total_amount as number), 0);
  const totalBalance = rows.reduce((s, r) => s + (r.balance_due as number), 0);
  const paidAmount = statusTotals.paid?.total || 0;

  return {
    columns: ["status", "count", "total_amount", "balance_due"],
    rows,
    summary: { totalInvoices: data?.length || 0, totalAmount, totalBalanceDue: totalBalance, paidAmount },
    metadata: { dateRange, totalRows: rows.length },
    generatedAt: new Date().toISOString(),
  };
}

async function executePaymentsSummary(
  companyId: string,
  dateRange: { start: string; end: string },
  filters?: Record<string, unknown>
): Promise<ReportResult> {
  let query = supabase
    .from("payments")
    .select("id, amount, payment_date, payment_method")
    .eq("company_id", companyId)
    .gte("payment_date", dateRange.start)
    .lte("payment_date", dateRange.end);

  if (filters?.customerId) {
    query = query.eq("crm_client_id", filters.customerId as string);
  }
  if (filters?.paymentMethod) {
    query = query.eq("payment_method", filters.paymentMethod as string);
  }

  const { data, error } = await query;
  if (error) throw error;

  const methodTotals: Record<string, { count: number; total: number }> = {};
  (data || []).forEach((p) => {
    const method = p.payment_method || "other";
    if (!methodTotals[method]) methodTotals[method] = { count: 0, total: 0 };
    methodTotals[method].count++;
    methodTotals[method].total += Number(p.amount) || 0;
  });

  const rows = Object.entries(methodTotals).map(([method, { count, total }]) => ({
    payment_method: method,
    count,
    total_amount: total,
  }));

  const totalAmount = rows.reduce((s, r) => s + (r.total_amount as number), 0);
  const avgPayment = data?.length ? Math.round(totalAmount / data.length) : 0;

  return {
    columns: ["payment_method", "count", "total_amount"],
    rows,
    summary: { totalPayments: data?.length || 0, totalAmount, avgPayment },
    metadata: { dateRange, totalRows: rows.length },
    generatedAt: new Date().toISOString(),
  };
}

async function executeReceiptsByTag(
  companyId: string,
  dateRange: { start: string; end: string },
  filters?: Record<string, unknown>
): Promise<ReportResult> {
  let query = supabase
    .from("receipts")
    .select("id, amount, category, receipt_date")
    .eq("company_id", companyId)
    .gte("receipt_date", dateRange.start)
    .lte("receipt_date", dateRange.end);

  if (filters?.tag) {
    query = query.eq("category", filters.tag as string);
  }

  const { data, error } = await query;
  if (error) throw error;

  const catTotals: Record<string, { count: number; total: number }> = {};
  (data || []).forEach((r) => {
    const cat = r.category || "Uncategorized";
    if (!catTotals[cat]) catTotals[cat] = { count: 0, total: 0 };
    catTotals[cat].count++;
    catTotals[cat].total += Number(r.amount) || 0;
  });

  const rows = Object.entries(catTotals).map(([category, { count, total }]) => ({
    category,
    count,
    total_amount: total,
  }));

  const totalAmount = rows.reduce((s, r) => s + (r.total_amount as number), 0);

  return {
    columns: ["category", "count", "total_amount"],
    rows,
    summary: { totalReceipts: data?.length || 0, totalAmount, totalCategories: rows.length },
    metadata: { dateRange, totalRows: rows.length },
    generatedAt: new Date().toISOString(),
  };
}

async function executeArAging(
  companyId: string,
  filters?: Record<string, unknown>
): Promise<ReportResult> {
  const asOfDate = (filters?.asOfDate as string) || new Date().toISOString().split("T")[0];
  const asOf = new Date(asOfDate);

  let query = supabase
    .from("invoices")
    .select("id, invoice_number, balance_due, due_date, crm_client_id")
    .eq("company_id", companyId)
    .is("archived_at", null)
    .gt("balance_due", 0);

  if (filters?.customerId) {
    query = query.eq("crm_client_id", filters.customerId as string);
  }

  const { data, error } = await query;
  if (error) throw error;

  const buckets = { current: 0, bucket31_60: 0, bucket61_90: 0, bucket90plus: 0 };
  const bucketCounts = { current: 0, bucket31_60: 0, bucket61_90: 0, bucket90plus: 0 };

  (data || []).forEach((inv) => {
    if (!inv.due_date) return;
    const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor((asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const balance = Number(inv.balance_due) || 0;

    if (daysOverdue <= 30) {
      buckets.current += balance;
      bucketCounts.current++;
    } else if (daysOverdue <= 60) {
      buckets.bucket31_60 += balance;
      bucketCounts.bucket31_60++;
    } else if (daysOverdue <= 90) {
      buckets.bucket61_90 += balance;
      bucketCounts.bucket61_90++;
    } else {
      buckets.bucket90plus += balance;
      bucketCounts.bucket90plus++;
    }
  });

  const rows = [
    { bucket: "Current (0-30)", count: bucketCounts.current, balance_due: buckets.current },
    { bucket: "31-60 Days", count: bucketCounts.bucket31_60, balance_due: buckets.bucket31_60 },
    { bucket: "61-90 Days", count: bucketCounts.bucket61_90, balance_due: buckets.bucket61_90 },
    { bucket: "90+ Days", count: bucketCounts.bucket90plus, balance_due: buckets.bucket90plus },
  ];

  const totalOutstanding = buckets.current + buckets.bucket31_60 + buckets.bucket61_90 + buckets.bucket90plus;

  return {
    columns: ["bucket", "count", "balance_due"],
    rows,
    summary: { totalOutstanding, currentAmount: buckets.current, bucket31_60: buckets.bucket31_60, bucket61_90: buckets.bucket61_90, bucket90plus: buckets.bucket90plus },
    metadata: { totalRows: 4 },
    generatedAt: new Date().toISOString(),
  };
}
