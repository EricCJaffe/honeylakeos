import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  useFinanceMetrics, 
  formatMetricValue, 
  getConfidenceBadgeVariant,
  getMetricDisplayName,
  MetricKey,
  MetricValue,
  PeriodGranularity 
} from "@/hooks/useFinanceMetrics";
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Info, Wallet, Receipt, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface FinanceMetricsWidgetProps {
  /** Which metrics to display. If not provided, shows key metrics. */
  metricKeys?: MetricKey[];
  /** Period end date (YYYY-MM-DD). Defaults to today. */
  periodEndDate?: string;
  /** Period granularity */
  periodGranularity?: PeriodGranularity;
  /** Card title */
  title?: string;
  /** Show source badge */
  showSource?: boolean;
  /** Show confidence indicators */
  showConfidence?: boolean;
  /** Compact mode for embedding in other views */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

const defaultMetricKeys: MetricKey[] = [
  "revenue_mtd",
  "net_income_mtd",
  "cash_on_hand",
  "open_ar_total",
  "open_ap_total",
];

function MetricCard({ 
  metricKey, 
  metric, 
  showConfidence,
  compact 
}: { 
  metricKey: MetricKey; 
  metric: MetricValue | undefined;
  showConfidence: boolean;
  compact: boolean;
}) {
  const isPositive = (metric?.value ?? 0) >= 0;
  const isIncomeMetric = metricKey.includes("income") || metricKey.includes("profit");
  const isCurrency = !metricKey.includes("margin");
  
  const getIcon = () => {
    if (metricKey.includes("revenue") || metricKey.includes("income") || metricKey.includes("profit")) {
      return isPositive ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    if (metricKey.includes("cash")) {
      return <Wallet className="h-4 w-4 text-muted-foreground" />;
    }
    if (metricKey.includes("ar")) {
      return <Receipt className="h-4 w-4 text-muted-foreground" />;
    }
    if (metricKey.includes("ap")) {
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
    return <DollarSign className="h-4 w-4 text-muted-foreground" />;
  };

  const valueColorClass = isIncomeMetric
    ? isPositive ? "text-green-600" : "text-red-600"
    : "";

  if (compact) {
    return (
      <div className="flex items-center justify-between py-2 border-b last:border-b-0">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="text-sm font-medium">{getMetricDisplayName(metricKey)}</span>
          {metric?.notes && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{metric.notes}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("font-semibold", valueColorClass)}>
            {formatMetricValue(metric, isCurrency ? "currency" : "percent")}
          </span>
          {showConfidence && metric && (
            <Badge variant={getConfidenceBadgeVariant(metric.confidence)} className="text-xs">
              {metric.confidence}
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{getMetricDisplayName(metricKey)}</CardTitle>
        {getIcon()}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", valueColorClass)}>
          {formatMetricValue(metric, isCurrency ? "currency" : "percent")}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {showConfidence && metric && (
            <Badge variant={getConfidenceBadgeVariant(metric.confidence)} className="text-xs">
              {metric.confidence}
            </Badge>
          )}
          {metric?.notes && (
            <span className="text-xs text-muted-foreground">{metric.notes}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function FinanceMetricsWidget({
  metricKeys = defaultMetricKeys,
  periodEndDate,
  periodGranularity = "month",
  title = "Financial Metrics",
  showSource = true,
  showConfidence = true,
  compact = false,
  className,
}: FinanceMetricsWidgetProps) {
  const { data, isLoading, error } = useFinanceMetrics({
    periodEndDate,
    periodGranularity,
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className={compact ? "space-y-2" : "grid gap-4 md:grid-cols-2 lg:grid-cols-3"}>
            {metricKeys.map((key) => (
              <Skeleton key={key} className={compact ? "h-10 w-full" : "h-24 w-full"} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error instanceof Error ? error.message : "Failed to load finance metrics"}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Configure finance mode in company settings to view metrics.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const sourceLabel = data.finance_mode === "builtin_books" ? "Accounting" : "Financial Insights";

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {data.period_start && data.period_end && (
                <>
                  {format(parseISO(data.period_start), "MMM d")} - {format(parseISO(data.period_end), "MMM d, yyyy")}
                </>
              )}
            </CardDescription>
          </div>
          {showSource && (
            <Badge variant="outline">{sourceLabel}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {compact ? (
          <div className="space-y-0">
            {metricKeys.map((key) => (
              <MetricCard
                key={key}
                metricKey={key}
                metric={data.metrics[key]}
                showConfidence={showConfidence}
                compact={true}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {metricKeys.map((key) => (
              <MetricCard
                key={key}
                metricKey={key}
                metric={data.metrics[key]}
                showConfidence={showConfidence}
                compact={false}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Standalone component for displaying a single metric.
 * Useful for embedding in framework dashboards.
 */
export function SingleFinanceMetric({
  metricKey,
  periodEndDate,
  periodGranularity = "month",
  showConfidence = false,
  className,
}: {
  metricKey: MetricKey;
  periodEndDate?: string;
  periodGranularity?: PeriodGranularity;
  showConfidence?: boolean;
  className?: string;
}) {
  const { data, isLoading, error } = useFinanceMetrics({
    periodEndDate,
    periodGranularity,
  });

  if (isLoading) {
    return <Skeleton className={cn("h-16 w-32", className)} />;
  }

  if (error || !data) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        —
      </div>
    );
  }

  const metric = data.metrics[metricKey];
  const isCurrency = !metricKey.includes("margin");

  return (
    <div className={className}>
      <div className="text-2xl font-bold">
        {formatMetricValue(metric, isCurrency ? "currency" : "percent")}
      </div>
      {showConfidence && metric && (
        <Badge variant={getConfidenceBadgeVariant(metric.confidence)} className="text-xs mt-1">
          {metric.confidence}
        </Badge>
      )}
    </div>
  );
}
