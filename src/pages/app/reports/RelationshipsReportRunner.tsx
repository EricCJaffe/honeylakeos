import * as React from "react";
import { ArrowLeft, Download, Save, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { ReportType, ReportConfig, useCreateReport, getReportLabel } from "@/hooks/useReports";
import { useReportExecution } from "@/hooks/useReportExecution";
import { useAuditLog } from "@/hooks/useAuditLog";
import { RelationshipsReportFilters } from "./RelationshipsReportFilters";
import { RELATIONSHIPS_REPORT_TEMPLATES } from "./RelationshipsReportTemplates";

interface RelationshipsReportRunnerProps {
  reportType: ReportType;
  onBack: () => void;
}

function SummaryTile({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export function RelationshipsReportRunner({ reportType, onBack }: RelationshipsReportRunnerProps) {
  const [config, setConfig] = React.useState<ReportConfig>({
    dateRange: {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      end: new Date().toISOString().split("T")[0],
    },
    filters: {},
  });
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [reportName, setReportName] = React.useState("");
  const [isPersonal, setIsPersonal] = React.useState(true);

  const template = RELATIONSHIPS_REPORT_TEMPLATES.find(t => t.type === reportType);
  const { data: result, isLoading, error, refetch } = useReportExecution(reportType, config);
  const createReport = useCreateReport();
  const { log } = useAuditLog();

  // Check if CRM reports have required pipeline
  const needsPipeline = template?.requiresPipeline && !config.filters?.pipelineId;

  const handleSave = () => {
    if (!reportName.trim()) {
      toast.error("Please enter a report name");
      return;
    }

    createReport.mutate(
      {
        name: reportName,
        description: template?.description || null,
        is_personal: isPersonal,
        report_type: reportType,
        config_json: config,
        owner_user_id: null,
      },
      {
        onSuccess: () => {
          setSaveDialogOpen(false);
          setReportName("");
          toast.success("Report saved successfully");
        },
      }
    );
  };

  const handleExport = () => {
    if (!result?.rows?.length) {
      toast.error("No data to export");
      return;
    }

    // Generate CSV
    const headers = result.columns.join(",");
    const rows = result.rows.map((row) =>
      result.columns.map((col) => {
        const val = row[col];
        if (typeof val === "string" && val.includes(",")) {
          return `"${val}"`;
        }
        return val ?? "";
      }).join(",")
    );
    const csv = [headers, ...rows].join("\n");

    // Download
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    // Audit log
    log("report.exported" as any, "report" as any, undefined, {
      report_type: reportType,
      row_count: result.rows.length,
    });

    toast.success("Report exported");
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "number") {
      if (Number.isInteger(value)) return value.toLocaleString();
      return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(value);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{getReportLabel(reportType)}</h2>
            <p className="text-sm text-muted-foreground">{template?.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading || needsPipeline}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!result?.rows?.length}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => setSaveDialogOpen(true)}>
            <Save className="h-4 w-4 mr-2" />
            Save Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <RelationshipsReportFilters
        reportType={reportType}
        config={config}
        onChange={setConfig}
      />

      {/* Pipeline Required Warning */}
      {needsPipeline && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a pipeline to run this report.
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {!needsPipeline && (
        <>
          {/* Summary Tiles */}
          {result?.summary && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {reportType === "crm_pipeline_totals" && (
                <>
                  <SummaryTile label="Total Opportunities" value={result.summary.totalOpportunities as number} />
                  <SummaryTile label="Total Value" value={formatCurrency(result.summary.totalValue as number)} />
                </>
              )}
              {reportType === "crm_opportunities_won_lost" && (
                <>
                  <SummaryTile label="Won" value={result.summary.wonCount as number} className="border-l-4 border-l-green-500" />
                  <SummaryTile label="Won Value" value={formatCurrency(result.summary.wonTotal as number)} />
                  <SummaryTile label="Lost" value={result.summary.lostCount as number} className="border-l-4 border-l-red-500" />
                  <SummaryTile label="Lost Value" value={formatCurrency(result.summary.lostTotal as number)} />
                </>
              )}
              {reportType === "donors_by_campaign" && (
                <>
                  <SummaryTile label="Total Donations" value={result.summary.totalDonations as number} />
                  <SummaryTile label="Total Raised" value={formatCurrency(result.summary.totalValue as number)} />
                </>
              )}
              {reportType === "donor_retention" && (
                <>
                  <SummaryTile label="Last Period Donors" value={result.summary.lastYearTotal as number} />
                  <SummaryTile label="Current Period Donors" value={result.summary.thisYearTotal as number} />
                  <SummaryTile 
                    label="Retained" 
                    value={result.summary.retained as number} 
                    className="border-l-4 border-l-green-500" 
                  />
                  <SummaryTile 
                    label="Retention Rate" 
                    value={`${result.summary.retentionRate}%`} 
                    className="border-l-4 border-l-primary" 
                  />
                </>
              )}
            </div>
          )}

          {/* Data Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Results</span>
                {result?.metadata?.totalRows !== undefined && (
                  <Badge variant="secondary">{result.metadata.totalRows} rows</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load report: {error.message}
                  </AlertDescription>
                </Alert>
              ) : result?.rows?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No data found for the selected filters
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {result?.columns.map((col) => (
                        <TableHead key={col} className="capitalize">
                          {col.replace(/_/g, " ")}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result?.rows.map((row, idx) => (
                      <TableRow key={idx}>
                        {result.columns.map((col) => (
                          <TableCell key={col}>{formatValue(row[col])}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Report</DialogTitle>
            <DialogDescription>
              Save this report configuration for quick access later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Report Name</Label>
              <Input
                id="name"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder={`My ${getReportLabel(reportType)}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="personal"
                checked={isPersonal}
                onCheckedChange={setIsPersonal}
              />
              <Label htmlFor="personal" className="cursor-pointer">
                Personal report (only visible to you)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createReport.isPending}>
              Save Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
