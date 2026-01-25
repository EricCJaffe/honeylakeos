import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAvailablePeriods, useFinancialKPIs, useYtdKPIs } from "@/hooks/useFinancialDashboard";
import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { TrendingUp, TrendingDown, Percent, DollarSign, ArrowRightLeft, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export default function InsightsMetricsPage() {
  const { data: periods, isLoading: periodsLoading } = useAvailablePeriods();
  const [selectedPeriod, setSelectedPeriod] = useState<string | undefined>();

  useEffect(() => {
    if (periods && periods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(periods[0].end);
    }
  }, [periods, selectedPeriod]);

  const { data: kpis, isLoading: kpisLoading } = useFinancialKPIs(selectedPeriod);
  const { data: ytdKpis, isLoading: ytdLoading } = useYtdKPIs();

  const isLoading = periodsLoading || kpisLoading || ytdLoading;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return "—";
    return `${value.toFixed(1)}%`;
  };

  if (periodsLoading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Financial Metrics" description="Key performance indicators and ratios" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!periods || periods.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Financial Metrics" description="Key performance indicators and ratios" />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No financial data imported yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Financial Metrics" description="Key performance indicators and ratios" />
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {periods?.map((period) => (
              <SelectItem key={period.end} value={period.end}>
                {format(parseISO(period.end), "MMMM yyyy")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Profitability Metrics */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Profitability</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {kpis?.grossMarginPercent !== null ? formatPercent(kpis?.grossMarginPercent ?? null) : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {kpis?.grossMarginPercent !== null
                      ? "(Revenue - COGS) / Revenue"
                      : "Requires COGS mapping"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Margin</CardTitle>
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "text-2xl font-bold",
                    (kpis?.netMarginPercent ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatPercent(kpis?.netMarginPercent ?? null)}
                  </div>
                  <p className="text-xs text-muted-foreground">Net Income / Revenue</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Income</CardTitle>
                  {(kpis?.netIncome ?? 0) >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "text-2xl font-bold",
                    (kpis?.netIncome ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatCurrency(kpis?.netIncome ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">This period</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Liquidity Metrics */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Liquidity</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cash on Hand</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(kpis?.cashOnHand ?? 0)}</div>
                  <p className="text-xs text-muted-foreground">From balance sheet</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net AR/AP Position</CardTitle>
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "text-2xl font-bold",
                    ((kpis?.openArTotal ?? 0) - (kpis?.openApTotal ?? 0)) >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatCurrency((kpis?.openArTotal ?? 0) - (kpis?.openApTotal ?? 0))}
                  </div>
                  <p className="text-xs text-muted-foreground">AR - AP (positive = net receivable)</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cash Ratio</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(kpis?.openApTotal ?? 0) > 0
                      ? ((kpis?.cashOnHand ?? 0) / (kpis?.openApTotal ?? 1)).toFixed(2)
                      : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">Cash / Current Liabilities (AP)</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* AR/AP Summary */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Working Capital</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Open Receivables (AR)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(kpis?.openArTotal ?? 0)}</div>
                  <p className="text-xs text-muted-foreground">Money owed to you</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Open Payables (AP)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(kpis?.openApTotal ?? 0)}</div>
                  <p className="text-xs text-muted-foreground">Money you owe</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* YTD Summary */}
          {ytdKpis && (
            <Card>
              <CardHeader>
                <CardTitle>Year-to-Date Performance</CardTitle>
                <CardDescription>Cumulative metrics for the current year</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">YTD Revenue</p>
                    <p className="text-xl font-semibold">{formatCurrency(ytdKpis.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">YTD Expenses</p>
                    <p className="text-xl font-semibold">{formatCurrency(ytdKpis.expenses)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">YTD Net Income</p>
                    <p className={cn(
                      "text-xl font-semibold",
                      ytdKpis.netIncome >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(ytdKpis.netIncome)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">YTD Net Margin</p>
                    <p className={cn(
                      "text-xl font-semibold",
                      (ytdKpis.netMarginPercent ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatPercent(ytdKpis.netMarginPercent)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
