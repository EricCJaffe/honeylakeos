import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";

// Standard metric keys
export type MetricKey =
  | "revenue_mtd" | "revenue_ytd"
  | "gross_profit_mtd" | "gross_profit_ytd"
  | "gross_margin_mtd" | "gross_margin_ytd"
  | "net_income_mtd" | "net_income_ytd"
  | "cash_on_hand"
  | "open_ar_total" | "open_ap_total"
  | "ar_aging_0_30" | "ar_aging_31_60" | "ar_aging_61_90" | "ar_aging_90_plus"
  | "ap_aging_0_30" | "ap_aging_31_60" | "ap_aging_61_90" | "ap_aging_90_plus";

export interface MetricValue {
  value: number | null;
  period_start: string | null;
  period_end: string | null;
  source: "builtin_books" | "external_reporting";
  confidence: "high" | "medium";
  notes: string | null;
}

export type FinanceMetricsResponse = {
  company_id: string;
  finance_mode: "builtin_books" | "external_reporting";
  period_start: string;
  period_end: string;
  metrics: Record<MetricKey, MetricValue>;
};

export type PeriodGranularity = "month" | "quarter" | "year";

interface UseFinanceMetricsOptions {
  periodEndDate?: string; // YYYY-MM-DD
  periodGranularity?: PeriodGranularity;
  enabled?: boolean;
}

/**
 * Hook to fetch standardized finance metrics from the adapter endpoint.
 * Works for both builtin_books and external_reporting modes.
 */
export function useFinanceMetrics(options: UseFinanceMetricsOptions = {}) {
  const { activeCompanyId } = useActiveCompany();
  const { 
    periodEndDate, 
    periodGranularity = "month", 
    enabled = true 
  } = options;

  return useQuery({
    queryKey: ["finance-metrics", activeCompanyId, periodEndDate, periodGranularity],
    queryFn: async (): Promise<FinanceMetricsResponse> => {
      if (!activeCompanyId) {
        throw new Error("No active company");
      }

      const { data, error } = await supabase.functions.invoke("get-finance-metrics", {
        body: {
          company_id: activeCompanyId,
          period_end_date: periodEndDate,
          period_granularity: periodGranularity,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to fetch finance metrics");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as FinanceMetricsResponse;
    },
    enabled: enabled && !!activeCompanyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Helper to format metric values for display
 */
export function formatMetricValue(
  metric: MetricValue | undefined,
  type: "currency" | "percent" | "number" = "currency"
): string {
  if (!metric || metric.value === null) {
    return "—";
  }

  if (type === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(metric.value);
  }

  if (type === "percent") {
    return `${metric.value.toFixed(1)}%`;
  }

  return new Intl.NumberFormat("en-US").format(metric.value);
}

/**
 * Helper to get confidence badge variant
 */
export function getConfidenceBadgeVariant(confidence: "high" | "medium"): "default" | "secondary" {
  return confidence === "high" ? "default" : "secondary";
}

/**
 * Helper to get metric display name
 */
export function getMetricDisplayName(key: MetricKey): string {
  const names: Record<MetricKey, string> = {
    revenue_mtd: "Revenue (MTD)",
    revenue_ytd: "Revenue (YTD)",
    gross_profit_mtd: "Gross Profit (MTD)",
    gross_profit_ytd: "Gross Profit (YTD)",
    gross_margin_mtd: "Gross Margin (MTD)",
    gross_margin_ytd: "Gross Margin (YTD)",
    net_income_mtd: "Net Income (MTD)",
    net_income_ytd: "Net Income (YTD)",
    cash_on_hand: "Cash on Hand",
    open_ar_total: "Open AR",
    open_ap_total: "Open AP",
    ar_aging_0_30: "AR 0-30 Days",
    ar_aging_31_60: "AR 31-60 Days",
    ar_aging_61_90: "AR 61-90 Days",
    ar_aging_90_plus: "AR 90+ Days",
    ap_aging_0_30: "AP 0-30 Days",
    ap_aging_31_60: "AP 31-60 Days",
    ap_aging_61_90: "AP 61-90 Days",
    ap_aging_90_plus: "AP 90+ Days",
  };
  return names[key] || key;
}
