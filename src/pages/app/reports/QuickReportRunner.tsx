import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Save,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { WorkReportFilters } from "./WorkReportFilters";
import {
  useCreateReport,
  getReportLabel,
  ReportType,
  ReportConfig,
} from "@/hooks/useReports";
import { useReportExecution, ReportResult } from "@/hooks/useReportExecution";
import { useAuditLog } from "@/hooks/useAuditLog";
import { format, subDays } from "date-fns";
import { toast } from "sonner";

interface QuickReportRunnerProps {
  reportType: ReportType;
  initialConfig?: ReportConfig;
  onBack: () => void;
}

function formatCellValue(value: unknown, column: string): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") {
    if (column.includes("amount") || column.includes("total")) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
      }).format(value);
    }
    if (column.includes("rate") || column.includes("percentage")) {
      return `${value}%`;
    }
    return value.toLocaleString();
  }
  if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    try {
      return format(new Date(value), "MMM d, yyyy");
    } catch {
      return value;
    }
  }
  return String(value);
}

function exportToCSV(result: ReportResult, reportName: string) {
  const { columns, rows } = result;
  if (!columns.length || !rows.length) {
    toast.error("No data to export");
    return;
  }

  const csvContent = [
    columns.join(","),
    ...rows.map((row) =>
      columns.map((col) => {
        const value = row[col];
        if (typeof value === "string" && value.includes(",")) {
          return `"${value}"`;
        }
        return value ?? "";
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${reportName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.success("Report exported to CSV");
}

export function QuickReportRunner({ reportType, initialConfig, onBack }: QuickReportRunnerProps) {
  const navigate = useNavigate();
  const createReport = useCreateReport();
  const { log } = useAuditLog();

  const [config, setConfig] = React.useState<ReportConfig>(() => {
    if (initialConfig) return initialConfig;
    // Default to last 30 days
    const end = new Date();
    const start = subDays(end, 30);
    return {
      dateRange: {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      },
      filters: {},
    };
  });

  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [saveName, setSaveName] = React.useState("");
  const [saveDescription, setSaveDescription] = React.useState("");
  const [saveIsPersonal, setSaveIsPersonal] = React.useState(false);

  const {
    data: result,
    isLoading,
    refetch,
    isFetching,
  } = useReportExecution(reportType, config);

  const reportLabel = getReportLabel(reportType);

  const handleExport = () => {
    if (!result) return;
    exportToCSV(result, reportLabel);
    log("report.exported" as any, "report" as any, undefined, { 
      type: reportType,
      format: "csv",
    });
  };

  const handleSave = async () => {
    if (!saveName.trim()) {
      toast.error("Please enter a report name");
      return;
    }

    try {
      const created = await createReport.mutateAsync({
        name: saveName.trim(),
        description: saveDescription.trim() || null,
        is_personal: saveIsPersonal,
        report_type: reportType,
        config_json: config,
        owner_user_id: null,
      });

      setSaveDialogOpen(false);
      setSaveName("");
      setSaveDescription("");
      navigate(`/app/reports/${created.id}`);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleOpenSaveDialog = () => {
    setSaveName(reportLabel);
    setSaveDialogOpen(true);
  };

  // Summary section with icons based on report type
  const renderSummary = () => {
    if (!result?.summary) return null;

    const summaryItems = Object.entries(result.summary).map(([key, value]) => {
      let icon = <CheckCircle2 className="h-5 w-5 text-primary" />;
      
      if (key.includes("overdue") || key.includes("critical")) {
        icon = <AlertTriangle className="h-5 w-5 text-destructive" />;
      } else if (key.includes("due") || key.includes("pending") || key.includes("warning")) {
        icon = <Clock className="h-5 w-5 text-warning" />;
      }

      const formattedValue = typeof value === "number" && value > 100
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
          }).format(value)
        : value;

      return (
        <Card key={key}>
          <CardContent className="pt-4 flex items-center gap-3">
            {icon}
            <div>
              <p className="text-sm text-muted-foreground capitalize">
                {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
              </p>
              <p className="text-xl font-semibold">
                {typeof formattedValue === 'number' ? formattedValue.toLocaleString() : formattedValue}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    });

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryItems}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={reportLabel}
        description="Run this report with custom filters"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleOpenSaveDialog}>
            <Save className="h-4 w-4 mr-2" />
            Save Report
          </Button>
          <Button onClick={handleExport} disabled={!result || result.rows.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <WorkReportFilters
        reportType={reportType}
        config={config}
        onChange={setConfig}
      />

      {/* Summary */}
      {renderSummary()}

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Results</CardTitle>
              <CardDescription>
                {result?.rows.length || 0} rows
                {result?.generatedAt && (
                  <span className="ml-2">
                    • Generated {format(new Date(result.generatedAt), "h:mm a")}
                  </span>
                )}
              </CardDescription>
            </div>
            {result?.metadata?.dateRange && (
              <Badge variant="outline" className="text-xs">
                {format(new Date(result.metadata.dateRange.start), "MMM d")} -{" "}
                {format(new Date(result.metadata.dateRange.end), "MMM d, yyyy")}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !result || result.rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No data available for the selected filters
            </div>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {result.columns.map((col) => (
                      <TableHead key={col} className="capitalize whitespace-nowrap">
                        {col.replace(/_/g, " ")}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((row, i) => (
                    <TableRow key={i}>
                      {result.columns.map((col) => (
                        <TableCell key={col} className="whitespace-nowrap">
                          {formatCellValue(row[col], col)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Report</DialogTitle>
            <DialogDescription>
              Save this report configuration for quick access later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="save-name">Report Name *</Label>
              <Input
                id="save-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g., Weekly Task Summary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="save-description">Description</Label>
              <Textarea
                id="save-description"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="Optional description"
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Personal Report</Label>
                <p className="text-sm text-muted-foreground">
                  Only you can see this report
                </p>
              </div>
              <Switch
                checked={saveIsPersonal}
                onCheckedChange={setSaveIsPersonal}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!saveName.trim() || createReport.isPending}>
              {createReport.isPending ? "Saving..." : "Save Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
