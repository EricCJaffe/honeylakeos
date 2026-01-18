import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MetricValue } from "@/hooks/useFinanceMetrics";
import { FinanceTargets } from "@/hooks/useFrameworkFinanceTargets";

export interface FrameworkFinancePlaybookItem {
  id: string;
  framework_id: string;
  condition_key: string;
  title: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export type ConditionKey =
  | "revenue_down"
  | "ar_high"
  | "ap_high"
  | "cash_low"
  | "gross_margin_low"
  | "net_income_low";

export function useFrameworkFinancePlaybook(frameworkId: string | null) {
  return useQuery({
    queryKey: ["framework-finance-playbook", frameworkId],
    queryFn: async (): Promise<FrameworkFinancePlaybookItem[]> => {
      if (!frameworkId) return [];

      const { data, error } = await supabase
        .from("framework_finance_playbook_items")
        .select("*")
        .eq("framework_id", frameworkId)
        .order("sort_order");

      if (error) throw error;
      return (data || []) as FrameworkFinancePlaybookItem[];
    },
    enabled: !!frameworkId,
  });
}

interface MetricsData {
  revenue_mtd?: MetricValue;
  revenue_ytd?: MetricValue;
  net_income_mtd?: MetricValue;
  net_income_ytd?: MetricValue;
  cash_on_hand?: MetricValue;
  open_ar_total?: MetricValue;
  open_ap_total?: MetricValue;
  gross_margin_mtd?: MetricValue;
}

interface PreviousPeriodData {
  revenue_mtd?: MetricValue;
}

/**
 * Evaluates which playbook conditions are triggered based on metrics and targets
 */
export function evaluateTriggeredConditions(
  metrics: MetricsData,
  targets: FinanceTargets | null,
  previousPeriod?: PreviousPeriodData | null
): ConditionKey[] {
  const triggered: ConditionKey[] = [];

  // Revenue down MoM
  if (previousPeriod?.revenue_mtd?.value && metrics.revenue_mtd?.value) {
    if (metrics.revenue_mtd.value < previousPeriod.revenue_mtd.value) {
      triggered.push("revenue_down");
    }
  }

  // AR high (above max target)
  if (targets?.ar_max && metrics.open_ar_total?.value) {
    if (metrics.open_ar_total.value > targets.ar_max) {
      triggered.push("ar_high");
    }
  }

  // AP high (above max target)
  if (targets?.ap_max && metrics.open_ap_total?.value) {
    if (metrics.open_ap_total.value > targets.ap_max) {
      triggered.push("ap_high");
    }
  }

  // Cash low (below minimum)
  if (targets?.cash_minimum && metrics.cash_on_hand?.value) {
    if (metrics.cash_on_hand.value < targets.cash_minimum) {
      triggered.push("cash_low");
    }
  }

  // Gross margin low
  if (targets?.gross_margin_minimum && metrics.gross_margin_mtd?.value) {
    if (metrics.gross_margin_mtd.value < targets.gross_margin_minimum) {
      triggered.push("gross_margin_low");
    }
  }

  // Net income below target
  if (targets?.net_income_target_mtd && metrics.net_income_mtd?.value) {
    if (metrics.net_income_mtd.value < targets.net_income_target_mtd) {
      triggered.push("net_income_low");
    }
  }

  return triggered;
}
