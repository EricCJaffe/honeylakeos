import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { MetricTrendData } from "@/hooks/useFinanceMetricsTrend";
import { cn } from "@/lib/utils";

interface TrendChartProps {
  title: string;
  trend: MetricTrendData;
  formatValue?: (value: number) => string;
}

function SimpleTrendChart({ title, trend, formatValue }: TrendChartProps) {
  if (!trend.hasEnoughData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Need 2+ periods for trend
          </div>
        </CardContent>
      </Card>
    );
  }

  const dataPoints = trend.data.filter((d) => d.value !== null);
  const maxValue = Math.max(...dataPoints.map((d) => d.value!));
  const minValue = Math.min(...dataPoints.map((d) => d.value!));
  const range = maxValue - minValue || 1;

  // Calculate overall trend
  const firstValue = dataPoints[0]?.value ?? 0;
  const lastValue = dataPoints[dataPoints.length - 1]?.value ?? 0;
  const overallChange = lastValue - firstValue;
  const overallChangePercent = firstValue !== 0 ? (overallChange / Math.abs(firstValue)) * 100 : 0;

  const format = formatValue || ((v: number) => 
    new Intl.NumberFormat("en-US", { 
      style: "currency", 
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1
    }).format(v)
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className={cn(
            "flex items-center gap-1 text-xs",
            overallChange > 0 ? "text-green-600 dark:text-green-400" : 
            overallChange < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
          )}>
            {overallChange > 0 ? <TrendingUp className="h-3 w-3" /> : 
             overallChange < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {overallChange >= 0 ? "+" : ""}{overallChangePercent.toFixed(1)}%
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Simple bar chart */}
        <div className="flex items-end gap-1 h-16">
          {trend.data.map((point, idx) => {
            const value = point.value ?? 0;
            const height = ((value - minValue) / range) * 100;
            const isLast = idx === trend.data.length - 1;
            
            return (
              <div key={point.periodEnd} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className={cn(
                    "w-full rounded-t transition-all",
                    isLast ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                  style={{ height: `${Math.max(height, 5)}%` }}
                  title={`${point.periodLabel}: ${format(value)}`}
                />
              </div>
            );
          })}
        </div>
        {/* Labels */}
        <div className="flex gap-1 mt-1">
          {trend.data.map((point) => (
            <div key={point.periodEnd} className="flex-1 text-center">
              <span className="text-[10px] text-muted-foreground">{point.periodLabel}</span>
            </div>
          ))}
        </div>
        {/* Current value */}
        <div className="mt-2 text-center">
          <span className="text-lg font-semibold">
            {format(lastValue)}
          </span>
          <span className="text-xs text-muted-foreground ml-1">current</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface FinanceTrendPanelProps {
  revenueTrend: MetricTrendData;
  netIncomeTrend: MetricTrendData;
  cashTrend: MetricTrendData;
  isLoading?: boolean;
}

export function FinanceTrendPanel({
  revenueTrend,
  netIncomeTrend,
  cashTrend,
  isLoading,
}: FinanceTrendPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Trends (Last 6 Periods)</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Trends (Last 6 Periods)</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <SimpleTrendChart title="Revenue" trend={revenueTrend} />
        <SimpleTrendChart title="Net Income" trend={netIncomeTrend} />
        <SimpleTrendChart title="Cash on Hand" trend={cashTrend} />
      </div>
    </div>
  );
}
