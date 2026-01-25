import * as React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  BarChart3,
  ArrowLeft,
  Download,
  RefreshCw,
  Calendar,
  User,
  Building2,
  Clock,
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
import { PageHeader } from "@/components/PageHeader";
import { ModuleGuard } from "@/components/ModuleGuard";
import { useReport, getReportLabel, getReportCategory } from "@/hooks/useReports";
import { useReportExecution, ReportResult } from "@/hooks/useReportExecution";
import { useAuditLog } from "@/hooks/useAuditLog";
import { format } from "date-fns";
import { toast } from "sonner";

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") {
    // Format currency-like numbers
    if (value > 100) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
      }).format(value);
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

function ReportDetailContent() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { data: report, isLoading: reportLoading } = useReport(reportId);
  const { log } = useAuditLog();
  
  const {
    data: result,
    isLoading: executionLoading,
    refetch,
    isFetching,
  } = useReportExecution(report?.report_type, report?.config_json);

  const handleExport = () => {
    if (!result || !report) return;
    exportToCSV(result, report.name);
    log("report.exported" as any, "report" as any, report.id, { format: "csv" });
  };

  const handleRefresh = () => {
    refetch();
  };

  if (reportLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold">Report not found</h2>
            <p className="text-muted-foreground text-sm mt-2">
              This report may have been deleted or you don't have access.
            </p>
            <Button asChild className="mt-4">
              <Link to="/app/reports">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Reports
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const category = getReportCategory(report.report_type);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title={report.name}
        description={report.description || getReportLabel(report.report_type)}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/app/reports")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleExport} disabled={!result || result.rows.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </PageHeader>

      {/* Report Info */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Badge variant="secondary">{getReportLabel(report.report_type)}</Badge>
        </div>
        {report.is_personal ? (
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            Personal Report
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            Company Report
          </div>
        )}
        {report.config_json.dateRange?.start && (
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {format(new Date(report.config_json.dateRange.start), "MMM d")} - {" "}
            {report.config_json.dateRange.end
              ? format(new Date(report.config_json.dateRange.end), "MMM d, yyyy")
              : "Present"}
          </div>
        )}
        {result?.generatedAt && (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Generated {format(new Date(result.generatedAt), "h:mm a")}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {result?.summary && Object.keys(result.summary).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(result.summary).map(([key, value]) => (
            <Card key={key}>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}
                </p>
                <p className="text-2xl font-bold">
                  {typeof value === "number" && value > 100
                    ? new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 0,
                      }).format(value)
                    : value?.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Results</CardTitle>
          <CardDescription>
            {result?.rows.length || 0} rows
          </CardDescription>
        </CardHeader>
        <CardContent>
          {executionLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !result || result.rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No data available for this report
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
                          {formatCellValue(row[col])}
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
    </div>
  );
}

export default function ReportDetailPage() {
  return (
    <ModuleGuard moduleKey="reports" moduleName="Reports">
      <ReportDetailContent />
    </ModuleGuard>
  );
}
