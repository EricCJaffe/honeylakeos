import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useCompanyActiveFramework, FrameworkHealthMetric } from "./useFrameworks";

// Types
export type HealthStatus = "green" | "yellow" | "red";
export type TrendDirection = "improving" | "stable" | "declining";

export interface MetricScore {
  metric: FrameworkHealthMetric & { weight_percent: number };
  currentValue: number;
  normalizedScore: number; // 0-100
  status: HealthStatus;
  trend: TrendDirection;
  trendExplanation: string;
}

export interface OverallHealthScore {
  weightedScore: number;
  status: HealthStatus;
  topContributors: MetricScore[];
  atRiskMetrics: MetricScore[];
  allMetrics: MetricScore[];
}

export interface HealthThresholds {
  green: number;
  yellow: number;
}

// Default thresholds
const DEFAULT_THRESHOLDS: HealthThresholds = { green: 80, yellow: 50 };

// Metric calculation functions by data_source_type and calculation_key
type MetricCalculator = (companyId: string, windowDays: number) => Promise<{ current: number; previous: number }>;

const metricCalculators: Record<string, MetricCalculator> = {
  // Tasks metrics
  "tasks.completion_rate": async (companyId, windowDays) => {
    const now = new Date();
    const currentStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const previousStart = new Date(currentStart.getTime() - windowDays * 24 * 60 * 60 * 1000);

    const { data: currentData } = await supabase
      .from("tasks")
      .select("status")
      .eq("company_id", companyId)
      .gte("created_at", currentStart.toISOString())
      .is("archived_at", null);

    const { data: previousData } = await supabase
      .from("tasks")
      .select("status")
      .eq("company_id", companyId)
      .gte("created_at", previousStart.toISOString())
      .lt("created_at", currentStart.toISOString())
      .is("archived_at", null);

    const calcRate = (data: { status: string }[] | null) => {
      if (!data || data.length === 0) return 100;
      const completed = data.filter(t => t.status === "done").length;
      return Math.round((completed / data.length) * 100);
    };

    return { current: calcRate(currentData), previous: calcRate(previousData) };
  },

  "tasks.overdue_count": async (companyId) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const { count: currentOverdue } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .neq("status", "done")
      .lt("due_date", now.toISOString())
      .is("archived_at", null);

    const { count: previousOverdue } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .neq("status", "done")
      .lt("due_date", thirtyDaysAgo.toISOString())
      .gte("created_at", sixtyDaysAgo.toISOString())
      .is("archived_at", null);

    // Invert for scoring (fewer overdue = better)
    const normalize = (count: number | null) => Math.max(0, 100 - (count || 0) * 10);
    return { current: normalize(currentOverdue), previous: normalize(previousOverdue) };
  },

  // Projects metrics
  "projects.on_track_rate": async (companyId, windowDays) => {
    const now = new Date();
    
    const { data } = await supabase
      .from("projects")
      .select("status, due_date")
      .eq("company_id", companyId)
      .is("archived_at", null)
      .in("status", ["in_progress", "planning"]);

    const calcOnTrack = (projects: { status: string; due_date: string | null }[] | null) => {
      if (!projects || projects.length === 0) return 100;
      const onTrack = projects.filter(p => {
        if (!p.due_date) return true;
        return new Date(p.due_date) >= now;
      }).length;
      return Math.round((onTrack / projects.length) * 100);
    };

    // For previous, we'd need historical data - approximate with current
    return { current: calcOnTrack(data), previous: calcOnTrack(data) };
  },

  // Events/Cadences metrics
  "events.meeting_adherence": async (companyId, windowDays) => {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const previousStart = new Date(windowStart.getTime() - windowDays * 24 * 60 * 60 * 1000);

    const { count: currentEvents } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("start_at", windowStart.toISOString())
      .lte("start_at", now.toISOString());

    const { count: previousEvents } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("start_at", previousStart.toISOString())
      .lt("start_at", windowStart.toISOString());

    // Score based on having regular meetings
    const normalize = (count: number | null) => Math.min(100, (count || 0) * 20);
    return { current: normalize(currentEvents), previous: normalize(previousEvents) };
  },

  // Generic fallback
  "default": async () => ({ current: 75, previous: 75 }),
};

// Calculate trend from current vs previous values
function calculateTrend(current: number, previous: number): { direction: TrendDirection; explanation: string } {
  const diff = current - previous;
  const threshold = 5; // 5% change threshold

  if (diff > threshold) {
    return { direction: "improving", explanation: `Up ${diff.toFixed(0)}% from previous period` };
  } else if (diff < -threshold) {
    return { direction: "declining", explanation: `Down ${Math.abs(diff).toFixed(0)}% from previous period` };
  }
  return { direction: "stable", explanation: "Consistent with previous period" };
}

// Determine status from value and thresholds
function getMetricStatus(value: number, thresholds: { green?: number | null; yellow?: number | null; red?: number | null }): HealthStatus {
  const green = thresholds.green ?? 80;
  const yellow = thresholds.yellow ?? 50;
  
  if (value >= green) return "green";
  if (value >= yellow) return "yellow";
  return "red";
}

// Main health scoring hook
export function useCompanyHealthScore() {
  const { activeCompanyId } = useActiveCompany();
  const { data: activeFramework } = useCompanyActiveFramework();

  return useQuery({
    queryKey: ["company-health-score", activeCompanyId, activeFramework?.active_framework_id],
    queryFn: async (): Promise<OverallHealthScore | null> => {
      if (!activeCompanyId || !activeFramework?.active_framework_id) return null;

      // Fetch enabled metrics with weights
      const { data: metrics, error } = await supabase
        .from("framework_health_metrics")
        .select("*")
        .eq("framework_id", activeFramework.active_framework_id)
        .eq("enabled", true)
        .order("sort_order");

      if (error) throw error;
      if (!metrics || metrics.length === 0) return null;

      // Get framework thresholds
      const { data: framework } = await supabase
        .from("frameworks")
        .select("health_thresholds")
        .eq("id", activeFramework.active_framework_id)
        .single();

      const rawThresholds = framework?.health_thresholds as Record<string, unknown> | null;
      const overallThresholds: HealthThresholds = {
        green: typeof rawThresholds?.green === 'number' ? rawThresholds.green : DEFAULT_THRESHOLDS.green,
        yellow: typeof rawThresholds?.yellow === 'number' ? rawThresholds.yellow : DEFAULT_THRESHOLDS.yellow,
      };

      // Calculate each metric (with hard limit of 10 metrics)
      const limitedMetrics = metrics.slice(0, 10);
      const metricScores: MetricScore[] = [];

      for (const metric of limitedMetrics) {
        try {
          const calculator = metricCalculators[metric.calculation_key] || metricCalculators["default"];
          const { current, previous } = await calculator(activeCompanyId, 30);
          const { direction, explanation } = calculateTrend(current, previous);
          const thresholds = (metric.thresholds || {}) as { green?: number | null; yellow?: number | null; red?: number | null };

          metricScores.push({
            metric: { ...metric, weight_percent: metric.weight_percent || 0 } as FrameworkHealthMetric & { weight_percent: number },
            currentValue: current,
            normalizedScore: current,
            status: getMetricStatus(current, thresholds),
            trend: direction,
            trendExplanation: explanation,
          });
        } catch {
          // Skip metrics that error
          continue;
        }
      }

      // Calculate weighted overall score
      const totalWeight = metricScores.reduce((sum, m) => sum + m.metric.weight_percent, 0);
      const weightedScore = totalWeight > 0
        ? metricScores.reduce((sum, m) => sum + m.normalizedScore * (m.metric.weight_percent / totalWeight), 0)
        : metricScores.reduce((sum, m) => sum + m.normalizedScore, 0) / metricScores.length;

      const overallStatus: HealthStatus = 
        weightedScore >= overallThresholds.green ? "green" :
        weightedScore >= overallThresholds.yellow ? "yellow" : "red";

      // Sort for top contributors and at-risk
      const sortedByContribution = [...metricScores].sort((a, b) => 
        (b.normalizedScore * b.metric.weight_percent) - (a.normalizedScore * a.metric.weight_percent)
      );
      const atRisk = metricScores.filter(m => m.status !== "green").sort((a, b) => a.normalizedScore - b.normalizedScore);

      return {
        weightedScore: Math.round(weightedScore),
        status: overallStatus,
        topContributors: sortedByContribution.slice(0, 3),
        atRiskMetrics: atRisk.slice(0, 3),
        allMetrics: metricScores,
      };
    },
    enabled: !!activeCompanyId && !!activeFramework?.active_framework_id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
