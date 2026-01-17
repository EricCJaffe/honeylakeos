import * as React from "react";
import { Link } from "react-router-dom";
import {
  Download,
  FileText,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { ModuleGuard } from "@/components/ModuleGuard";
import { useReports } from "@/hooks/useReports";
import { EmptyState } from "@/components/EmptyState";

function ExportsContent() {
  const { data: reports = [], isLoading } = useReports();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Exports"
        description="Export data from your saved reports"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" />
            How Exports Work
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            1. Navigate to any saved report and click <strong>"Export CSV"</strong> to download the data.
          </p>
          <p>
            2. Each export includes all rows from the report with the current date/time filters applied.
          </p>
          <p>
            3. CSV files can be opened in Excel, Google Sheets, or any spreadsheet application.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Reports</CardTitle>
          <CardDescription>
            Select a report to run and export
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
          ) : reports.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No reports created yet"
              description="Create a report first, then you can export its data"
              action={
                <Button asChild>
                  <Link to="/app/reports/new">Create Report</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {reports.map((report) => (
                <Link
                  key={report.id}
                  to={`/app/reports/${report.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{report.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {report.is_personal ? "Personal" : "Company"} Report
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ExportsPage() {
  return (
    <ModuleGuard moduleKey="reports" moduleName="Reports">
      <ExportsContent />
    </ModuleGuard>
  );
}
