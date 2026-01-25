import { useQueries } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { FinanceMetricsResponse, MetricKey } from "@/hooks/useFinanceMetrics";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export interface TrendDataPoint {
  periodLabel: string;
  periodEnd: string;
  value: number | null;
}

export interface MetricTrendData {
  metric: MetricKey;
  data: TrendDataPoint[];
  hasEnoughData: boolean;
}

/**
 * Fetches last N periods of metrics for trend analysis
 */
export function useFinanceMetricsTrend(periods: number = 6, enabled: boolean = true) {
  const { activeCompanyId } = useActiveCompany();

  // Generate period end dates for last N months
  const periodDates = Array.from({ length: periods }, (_, i) => {
    const date = subMonths(new Date(), i);
    return format(endOfMonth(date), "yyyy-MM-dd");
  }).reverse();

  const queries = useQueries({
    queries: periodDates.map((periodEnd) => ({
      queryKey: ["finance-metrics-trend", activeCompanyId, periodEnd],
      queryFn: async (): Promise<FinanceMetricsResponse | null> => {
        if (!activeCompanyId) return null;

        const { data, error } = await supabase.functions.invoke("get-finance-metrics", {
          body: {
            company_id: activeCompanyId,
            period_end_date: periodEnd,
            period_granularity: "month",
          },
        });

        if (error) return null;
        if (data?.error) return null;
        return data as FinanceMetricsResponse;
      },
      enabled: enabled && !!activeCompanyId,
      staleTime: 10 * 60 * 1000, // 10 minutes
      retry: 0,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const results = queries.map((q) => q.data).filter(Boolean) as FinanceMetricsResponse[];

  // Transform into trend data for specific metrics
  const getTrendForMetric = (metricKey: MetricKey): MetricTrendData => {
    const data: TrendDataPoint[] = results.map((r) => ({
      periodLabel: format(new Date(r.period_end), "MMM yy"),
      periodEnd: r.period_end,
      value: r.metrics[metricKey]?.value ?? null,
    }));

    return {
      metric: metricKey,
      data,
      hasEnoughData: data.filter((d) => d.value !== null).length >= 2,
    };
  };

  return {
    isLoading,
    results,
    getTrendForMetric,
    revenueTrend: getTrendForMetric("revenue_mtd"),
    netIncomeTrend: getTrendForMetric("net_income_mtd"),
    cashTrend: getTrendForMetric("cash_on_hand"),
    previousPeriodMetrics: results.length >= 2 ? results[results.length - 2]?.metrics : null,
  };
}
