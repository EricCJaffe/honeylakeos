import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOpenArItems, useOpenApItems, useFinancialImports } from "@/hooks/useFinancialInsights";
import { useMemo } from "react";
import { format, parseISO, differenceInDays } from "date-fns";

export default function InsightsArapPage() {
  const { imports, isLoading: importsLoading } = useFinancialImports();
  const { items: arItems, isLoading: arLoading } = useOpenArItems();
  const { items: apItems, isLoading: apLoading } = useOpenApItems();

  // Get latest AR and AP batches
  const latestArBatch = useMemo(() => {
    return imports
      .filter((i) => i.import_type === "open_ar" && i.status === "completed")
      .sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime())[0];
  }, [imports]);

  const latestApBatch = useMemo(() => {
    return imports
      .filter((i) => i.import_type === "open_ap" && i.status === "completed")
      .sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime())[0];
  }, [imports]);

  // Filter to latest batch
  const currentArItems = useMemo(() => {
    if (!latestArBatch) return [];
    return arItems.filter((item) => item.batch_id === latestArBatch.id);
  }, [arItems, latestArBatch]);

  const currentApItems = useMemo(() => {
    if (!latestApBatch) return [];
    return apItems.filter((item) => item.batch_id === latestApBatch.id);
  }, [apItems, latestApBatch]);

  // Calculate aging buckets
  const getAgingBucket = (dueDate: string | null): string => {
    if (!dueDate) return "No Due Date";
    const days = differenceInDays(new Date(), parseISO(dueDate));
    if (days <= 0) return "Current";
    if (days <= 30) return "1-30 Days";
    if (days <= 60) return "31-60 Days";
    if (days <= 90) return "61-90 Days";
    return "90+ Days";
  };

  const arAging = useMemo(() => {
    const buckets: Record<string, { count: number; amount: number }> = {
      "Current": { count: 0, amount: 0 },
      "1-30 Days": { count: 0, amount: 0 },
      "31-60 Days": { count: 0, amount: 0 },
      "61-90 Days": { count: 0, amount: 0 },
      "90+ Days": { count: 0, amount: 0 },
      "No Due Date": { count: 0, amount: 0 },
    };

    for (const item of currentArItems) {
      const bucket = getAgingBucket(item.due_date);
      buckets[bucket].count++;
      buckets[bucket].amount += Number(item.amount_due);
    }

    return buckets;
  }, [currentArItems]);

  const apAging = useMemo(() => {
    const buckets: Record<string, { count: number; amount: number }> = {
      "Current": { count: 0, amount: 0 },
      "1-30 Days": { count: 0, amount: 0 },
      "31-60 Days": { count: 0, amount: 0 },
      "61-90 Days": { count: 0, amount: 0 },
      "90+ Days": { count: 0, amount: 0 },
      "No Due Date": { count: 0, amount: 0 },
    };

    for (const item of currentApItems) {
      const bucket = getAgingBucket(item.due_date);
      buckets[bucket].count++;
      buckets[bucket].amount += Number(item.amount_due);
    }

    return buckets;
  }, [currentApItems]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const arTotal = currentArItems.reduce((sum, item) => sum + Number(item.amount_due), 0);
  const apTotal = currentApItems.reduce((sum, item) => sum + Number(item.amount_due), 0);

  const isLoading = importsLoading || arLoading || apLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="AR/AP Summary" description="Accounts Receivable and Payable overview" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="AR/AP Summary" description="Accounts Receivable and Payable overview" />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total Open AR</CardTitle>
            <CardDescription>
              {latestArBatch
                ? `As of ${format(parseISO(latestArBatch.period_end), "MMM d, yyyy")}`
                : "No data imported"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(arTotal)}</div>
            <p className="text-sm text-muted-foreground">{currentArItems.length} open invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total Open AP</CardTitle>
            <CardDescription>
              {latestApBatch
                ? `As of ${format(parseISO(latestApBatch.period_end), "MMM d, yyyy")}`
                : "No data imported"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(apTotal)}</div>
            <p className="text-sm text-muted-foreground">{currentApItems.length} open bills</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <Tabs defaultValue="ar">
          <CardHeader>
            <TabsList>
              <TabsTrigger value="ar">Accounts Receivable</TabsTrigger>
              <TabsTrigger value="ap">Accounts Payable</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="ar" className="m-0 space-y-6">
              {/* AR Aging */}
              <div>
                <h3 className="font-semibold mb-3">Aging Summary</h3>
                <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                  {Object.entries(arAging).map(([bucket, data]) => (
                    <Card key={bucket} className="p-3">
                      <p className="text-xs text-muted-foreground">{bucket}</p>
                      <p className="font-semibold">{formatCurrency(data.amount)}</p>
                      <p className="text-xs text-muted-foreground">{data.count} items</p>
                    </Card>
                  ))}
                </div>
              </div>

              {/* AR Detail */}
              {currentArItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No open AR items.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Aging</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentArItems.map((item) => {
                      const bucket = getAgingBucket(item.due_date);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.customer_name}</TableCell>
                          <TableCell>{item.invoice_number || "—"}</TableCell>
                          <TableCell>
                            {item.due_date ? format(parseISO(item.due_date), "MMM d, yyyy") : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                bucket === "Current" ? "default" :
                                bucket === "1-30 Days" ? "secondary" :
                                bucket.includes("90") ? "destructive" : "outline"
                              }
                            >
                              {bucket}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(item.amount_due)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="font-semibold bg-muted/50">
                      <TableCell colSpan={4}>Total</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(arTotal)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="ap" className="m-0 space-y-6">
              {/* AP Aging */}
              <div>
                <h3 className="font-semibold mb-3">Aging Summary</h3>
                <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                  {Object.entries(apAging).map(([bucket, data]) => (
                    <Card key={bucket} className="p-3">
                      <p className="text-xs text-muted-foreground">{bucket}</p>
                      <p className="font-semibold">{formatCurrency(data.amount)}</p>
                      <p className="text-xs text-muted-foreground">{data.count} items</p>
                    </Card>
                  ))}
                </div>
              </div>

              {/* AP Detail */}
              {currentApItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No open AP items.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Aging</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentApItems.map((item) => {
                      const bucket = getAgingBucket(item.due_date);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.vendor_name}</TableCell>
                          <TableCell>{item.bill_number || "—"}</TableCell>
                          <TableCell>
                            {item.due_date ? format(parseISO(item.due_date), "MMM d, yyyy") : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                bucket === "Current" ? "default" :
                                bucket === "1-30 Days" ? "secondary" :
                                bucket.includes("90") ? "destructive" : "outline"
                              }
                            >
                              {bucket}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(item.amount_due)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="font-semibold bg-muted/50">
                      <TableCell colSpan={4}>Total</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(apTotal)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
