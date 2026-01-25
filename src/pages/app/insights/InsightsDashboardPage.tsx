import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAvailablePeriods, usePeriodComparison } from "@/hooks/useFinancialDashboard";
import { useFinancialCategories } from "@/hooks/useFinancialInsights";
import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { TrendingUp, TrendingDown, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight, Wallet, Receipt, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function InsightsDashboardPage() {
  const { data: periods, isLoading: periodsLoading } = useAvailablePeriods();
  const { categories, isLoading: categoriesLoading, seedCategories, isSeeding } = useFinancialCategories();
  const [selectedPeriod, setSelectedPeriod] = useState<string | undefined>();

  useEffect(() => {
    if (periods && periods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(periods[0].end);
    }
  }, [periods, selectedPeriod]);

  const { currentPeriod, previousPeriod, ytd, momRevenueChange, momNetIncomeChange, isLoading } = usePeriodComparison(selectedPeriod);

  const hasData = periods && periods.length > 0;
  const hasCategories = categories && categories.length > 0;

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
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  if (periodsLoading || categoriesLoading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Financial Insights" description="Overview of your financial health" />
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
      </div>
    );
  }

  // Setup prompt if no categories
  if (!hasCategories) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Financial Insights" description="Overview of your financial health" />
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Set Up Financial Categories</CardTitle>
            <CardDescription>
              Before importing financial data, you need to set up categories to map your statement line items.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => seedCategories()} disabled={isSeeding}>
              {isSeeding ? "Creating..." : "Create Default Categories"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No data prompt
  if (!hasData) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Financial Insights" description="Overview of your financial health" />
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Import Financial Data</CardTitle>
            <CardDescription>
              Import your P&L, Balance Sheet, and AR/AP data to see insights and metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/app/insights/imports">Go to Imports</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Financial Insights" description="Overview of your financial health" />
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
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(currentPeriod?.revenue || 0)}</div>
                {momRevenueChange !== null && (
                  <p className={cn("text-xs flex items-center gap-1", momRevenueChange >= 0 ? "text-green-600" : "text-red-600")}>
                    {momRevenueChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {formatPercent(momRevenueChange)} from last month
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(currentPeriod?.expenses || 0)}</div>
                <p className="text-xs text-muted-foreground">This period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Income</CardTitle>
                {(currentPeriod?.netIncome || 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={cn("text-2xl font-bold", (currentPeriod?.netIncome || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatCurrency(currentPeriod?.netIncome || 0)}
                </div>
                {momNetIncomeChange !== null && (
                  <p className={cn("text-xs flex items-center gap-1", momNetIncomeChange >= 0 ? "text-green-600" : "text-red-600")}>
                    {momNetIncomeChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {formatPercent(momNetIncomeChange)} from last month
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash on Hand</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(currentPeriod?.cashOnHand || 0)}</div>
                <p className="text-xs text-muted-foreground">From balance sheet</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open AR</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(currentPeriod?.openArTotal || 0)}</div>
                <p className="text-xs text-muted-foreground">Outstanding receivables</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open AP</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(currentPeriod?.openApTotal || 0)}</div>
                <p className="text-xs text-muted-foreground">Outstanding payables</p>
              </CardContent>
            </Card>
          </div>

          {/* YTD Summary */}
          {ytd && (
            <Card>
              <CardHeader>
                <CardTitle>Year-to-Date Summary</CardTitle>
                <CardDescription>Cumulative performance for the current year</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">YTD Revenue</p>
                    <p className="text-xl font-semibold">{formatCurrency(ytd.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">YTD Expenses</p>
                    <p className="text-xl font-semibold">{formatCurrency(ytd.expenses)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">YTD Net Income</p>
                    <p className={cn("text-xl font-semibold", ytd.netIncome >= 0 ? "text-green-600" : "text-red-600")}>
                      {formatCurrency(ytd.netIncome)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Links */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:bg-accent/50 transition-colors">
              <Link to="/app/insights/imports" className="block p-4">
                <h3 className="font-medium">Import Data</h3>
                <p className="text-sm text-muted-foreground">Upload P&L, Balance Sheet, AR/AP</p>
              </Link>
            </Card>
            <Card className="hover:bg-accent/50 transition-colors">
              <Link to="/app/insights/statements" className="block p-4">
                <h3 className="font-medium">View Statements</h3>
                <p className="text-sm text-muted-foreground">P&L and Balance Sheet details</p>
              </Link>
            </Card>
            <Card className="hover:bg-accent/50 transition-colors">
              <Link to="/app/insights/arap" className="block p-4">
                <h3 className="font-medium">AR/AP Summary</h3>
                <p className="text-sm text-muted-foreground">Open receivables and payables</p>
              </Link>
            </Card>
            <Card className="hover:bg-accent/50 transition-colors">
              <Link to="/app/insights/metrics" className="block p-4">
                <h3 className="font-medium">Metrics</h3>
                <p className="text-sm text-muted-foreground">Key financial ratios</p>
              </Link>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
