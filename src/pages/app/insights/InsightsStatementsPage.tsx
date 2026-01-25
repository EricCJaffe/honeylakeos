import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useFinancialStatementLines, useFinancialCategories, FinancialStatementLine } from "@/hooks/useFinancialInsights";
import { useAvailablePeriods } from "@/hooks/useFinancialDashboard";
import { useState, useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";

export default function InsightsStatementsPage() {
  const { data: periods, isLoading: periodsLoading } = useAvailablePeriods();
  const { categories } = useFinancialCategories();
  const [selectedPeriod, setSelectedPeriod] = useState<string | undefined>();
  const [selectedTab, setSelectedTab] = useState<"pl" | "balance_sheet">("pl");

  const { lines, isLoading: linesLoading } = useFinancialStatementLines(undefined, selectedTab);

  useEffect(() => {
    if (periods && periods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(periods[0].end);
    }
  }, [periods, selectedPeriod]);

  // Filter lines by selected period
  const filteredLines = useMemo(() => {
    if (!selectedPeriod) return [];
    return lines.filter((line) => line.period_end === selectedPeriod);
  }, [lines, selectedPeriod]);

  // Group lines by category type
  const groupedLines = useMemo(() => {
    const groups: Record<string, FinancialStatementLine[]> = {};
    
    for (const line of filteredLines) {
      const categoryType = line.mapped_category?.category_type || "unmapped";
      if (!groups[categoryType]) {
        groups[categoryType] = [];
      }
      groups[categoryType].push(line);
    }

    return groups;
  }, [filteredLines]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getCategoryTypeLabel = (type: string) => {
    switch (type) {
      case "income": return "Income";
      case "expense": return "Expenses";
      case "asset": return "Assets";
      case "liability": return "Liabilities";
      case "equity": return "Equity";
      case "unmapped": return "Unmapped";
      default: return type;
    }
  };

  const getCategoryTypeOrder = (type: string) => {
    switch (type) {
      case "income": return 1;
      case "expense": return 2;
      case "asset": return 1;
      case "liability": return 2;
      case "equity": return 3;
      case "unmapped": return 99;
      default: return 50;
    }
  };

  const sortedGroups = useMemo(() => {
    return Object.entries(groupedLines).sort(
      ([a], [b]) => getCategoryTypeOrder(a) - getCategoryTypeOrder(b)
    );
  }, [groupedLines]);

  // Calculate totals
  const totals = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [type, typeLines] of Object.entries(groupedLines)) {
      result[type] = typeLines.reduce((sum, line) => sum + Number(line.amount), 0);
    }
    return result;
  }, [groupedLines]);

  const grandTotal = useMemo(() => {
    if (selectedTab === "pl") {
      const income = totals.income || 0;
      const expenses = totals.expense || 0;
      return income - expenses;
    }
    // For balance sheet, assets = liabilities + equity
    return (totals.asset || 0) - (totals.liability || 0) - (totals.equity || 0);
  }, [totals, selectedTab]);

  if (periodsLoading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Financial Statements" description="View P&L and Balance Sheet" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!periods || periods.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Financial Statements" description="View P&L and Balance Sheet" />
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
        <PageHeader title="Financial Statements" description="View P&L and Balance Sheet" />
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

      <Card>
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as "pl" | "balance_sheet")}>
          <CardHeader>
            <TabsList>
              <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
              <TabsTrigger value="balance_sheet">Balance Sheet</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="pl" className="m-0">
              {linesLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : filteredLines.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No P&L data for this period.</p>
              ) : (
                <div className="space-y-6">
                  {sortedGroups.map(([type, typeLines]) => (
                    <div key={type}>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        {getCategoryTypeLabel(type)}
                        <Badge variant="outline">{typeLines.length}</Badge>
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead>Mapped To</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {typeLines.map((line) => (
                            <TableRow key={line.id}>
                              <TableCell>{line.original_category}</TableCell>
                              <TableCell>
                                {line.mapped_category?.name || (
                                  <span className="text-muted-foreground">Unmapped</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(line.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-semibold bg-muted/50">
                            <TableCell colSpan={2}>Total {getCategoryTypeLabel(type)}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(totals[type] || 0)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  ))}

                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Net Income</span>
                      <span className={grandTotal >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="balance_sheet" className="m-0">
              {linesLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : filteredLines.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No Balance Sheet data for this period.</p>
              ) : (
                <div className="space-y-6">
                  {sortedGroups.map(([type, typeLines]) => (
                    <div key={type}>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        {getCategoryTypeLabel(type)}
                        <Badge variant="outline">{typeLines.length}</Badge>
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account</TableHead>
                            <TableHead>Mapped To</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {typeLines.map((line) => (
                            <TableRow key={line.id}>
                              <TableCell>{line.original_category}</TableCell>
                              <TableCell>
                                {line.mapped_category?.name || (
                                  <span className="text-muted-foreground">Unmapped</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(line.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-semibold bg-muted/50">
                            <TableCell colSpan={2}>Total {getCategoryTypeLabel(type)}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(totals[type] || 0)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
