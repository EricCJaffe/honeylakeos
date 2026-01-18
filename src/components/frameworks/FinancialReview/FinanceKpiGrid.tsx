import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Eye
} from "lucide-react";
import { 
  MetricValue, 
  formatMetricValue, 
  MetricKey 
} from "@/hooks/useFinanceMetrics";
import { FinanceTargets } from "@/hooks/useFrameworkFinanceTargets";
import { cn } from "@/lib/utils";

interface KpiTileProps {
  label: string;
  metric: MetricValue | undefined;
  periodLabel: string;
  previousValue?: number | null;
  target?: number | null;
  targetType?: "min" | "max" | "target";
  formatType?: "currency" | "percent";
  isLoading?: boolean;
}

type TargetStatus = "on_track" | "watch" | "off_track" | null;

function getTargetStatus(
  value: number | null | undefined,
  target: number | null | undefined,
  targetType: "min" | "max" | "target"
): TargetStatus {
  if (value === null || value === undefined || target === null || target === undefined) {
    return null;
  }

  if (targetType === "min") {
    if (value >= target) return "on_track";
    if (value >= target * 0.9) return "watch";
    return "off_track";
  }

  if (targetType === "max") {
    if (value <= target) return "on_track";
    if (value <= target * 1.1) return "watch";
    return "off_track";
  }

  // target type
  if (value >= target) return "on_track";
  if (value >= target * 0.9) return "watch";
  return "off_track";
}

function StatusBadge({ status }: { status: TargetStatus }) {
  if (!status) return null;

  const config = {
    on_track: { label: "On Track", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
    watch: { label: "Watch", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: Eye },
    off_track: { label: "Off Track", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: AlertTriangle },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <Badge variant="outline" className={cn("text-xs gap-1", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function TrendIndicator({ current, previous }: { current?: number | null; previous?: number | null }) {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return null;
  }

  const diff = current - previous;
  const percentChange = previous !== 0 ? (diff / Math.abs(previous)) * 100 : 0;

  if (Math.abs(percentChange) < 0.5) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        No change
      </span>
    );
  }

  const isPositive = diff > 0;

  return (
    <span className={cn(
      "flex items-center gap-1 text-xs",
      isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
    )}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? "+" : ""}{percentChange.toFixed(1)}% vs prior
    </span>
  );
}

function KpiTile({
  label,
  metric,
  periodLabel,
  previousValue,
  target,
  targetType = "target",
  formatType = "currency",
  isLoading,
}: KpiTileProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  const value = metric?.value;
  const status = getTargetStatus(value, target, targetType);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              {metric?.source === "builtin_books" ? "Accounting" : "Insights"}
            </Badge>
            {metric?.confidence === "medium" && (
              <Badge variant="secondary" className="text-xs">~</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">
            {formatMetricValue(metric, formatType)}
          </span>
          <span className="text-xs text-muted-foreground">{periodLabel}</span>
        </div>
        
        <div className="mt-2 flex flex-col gap-1">
          <TrendIndicator current={value} previous={previousValue} />
          
          {target !== null && target !== undefined && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                Target: {formatType === "percent" ? `${target}%` : formatMetricValue({ value: target, period_start: null, period_end: null, source: "builtin_books", confidence: "high", notes: null }, formatType)}
              </span>
              <StatusBadge status={status} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface FinanceKpiGridProps {
  metrics: Record<MetricKey, MetricValue> | undefined;
  targets: FinanceTargets | null;
  previousPeriodMetrics?: Record<MetricKey, MetricValue> | null;
  isLoading?: boolean;
  financeMode?: "builtin_books" | "external_reporting";
}

export function FinanceKpiGrid({
  metrics,
  targets,
  previousPeriodMetrics,
  isLoading,
  financeMode,
}: FinanceKpiGridProps) {
  // Hide gross margin if not available
  const showGrossMargin = metrics?.gross_margin_mtd?.value !== null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiTile
        label="Revenue (MTD)"
        metric={metrics?.revenue_mtd}
        periodLabel="MTD"
        previousValue={previousPeriodMetrics?.revenue_mtd?.value}
        target={targets?.revenue_target_mtd}
        targetType="target"
        isLoading={isLoading}
      />
      <KpiTile
        label="Revenue (YTD)"
        metric={metrics?.revenue_ytd}
        periodLabel="YTD"
        target={targets?.revenue_target_ytd}
        targetType="target"
        isLoading={isLoading}
      />
      <KpiTile
        label="Net Income (MTD)"
        metric={metrics?.net_income_mtd}
        periodLabel="MTD"
        previousValue={previousPeriodMetrics?.net_income_mtd?.value}
        target={targets?.net_income_target_mtd}
        targetType="target"
        isLoading={isLoading}
      />
      <KpiTile
        label="Cash on Hand"
        metric={metrics?.cash_on_hand}
        periodLabel="Current"
        previousValue={previousPeriodMetrics?.cash_on_hand?.value}
        target={targets?.cash_minimum}
        targetType="min"
        isLoading={isLoading}
      />
      <KpiTile
        label="Open AR"
        metric={metrics?.open_ar_total}
        periodLabel="Current"
        previousValue={previousPeriodMetrics?.open_ar_total?.value}
        target={targets?.ar_max}
        targetType="max"
        isLoading={isLoading}
      />
      <KpiTile
        label="Open AP"
        metric={metrics?.open_ap_total}
        periodLabel="Current"
        previousValue={previousPeriodMetrics?.open_ap_total?.value}
        target={targets?.ap_max}
        targetType="max"
        isLoading={isLoading}
      />
      {showGrossMargin && (
        <KpiTile
          label="Gross Margin"
          metric={metrics?.gross_margin_mtd}
          periodLabel="MTD"
          previousValue={previousPeriodMetrics?.gross_margin_mtd?.value}
          target={targets?.gross_margin_minimum}
          targetType="min"
          formatType="percent"
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
