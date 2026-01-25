import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Clock,
  User,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Users,
  CreditCard,
  TrendingUp,
  Play,
  ArrowRight,
  History,
  Heart,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useReports,
  ReportConfig,
  getReportLabel,
  Report,
  ReportType,
} from "@/hooks/useReports";
import {
  useRecentRuns,
  useDashboardKPIs,
  ReportRecentRun,
} from "@/hooks/useReportDashboard";
import { useAuth } from "@/lib/auth";
import { format, formatDistanceToNow } from "date-fns";

interface ReportsDashboardProps {
  onRunReport: (reportType: ReportType, config?: ReportConfig) => void;
}

function KPITile({
  icon: Icon,
  label,
  value,
  variant = "default",
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  variant?: "default" | "warning" | "success" | "muted";
  onClick?: () => void;
}) {
  const variantClasses = {
    default: "bg-primary/10 text-primary",
    warning: "bg-destructive/10 text-destructive",
    success: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    muted: "bg-muted text-muted-foreground",
  };

  return (
    <Card
      className={`cursor-pointer hover:border-primary/50 transition-colors ${onClick ? "" : "cursor-default"}`}
      onClick={onClick}
    >
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${variantClasses[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            <p className="text-xl font-semibold">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentRunItem({
  run,
  onClick,
}: {
  run: ReportRecentRun;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 min-w-0">
        <History className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {getReportLabel(run.report_type)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(run.last_run_at), { addSuffix: true })}
            {run.run_count > 1 && ` • ${run.run_count} runs`}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="shrink-0">
        <Play className="h-4 w-4" />
      </Button>
    </div>
  );
}

function SavedReportItem({
  report,
  onClick,
}: {
  report: Report;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{report.name}</p>
          <p className="text-xs text-muted-foreground">
            {getReportLabel(report.report_type)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {report.is_personal && (
          <Badge variant="outline" className="text-xs">
            <User className="h-3 w-3 mr-1" />
            Personal
          </Badge>
        )}
        <Button variant="ghost" size="icon">
          <Play className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ReportsDashboard({ onRunReport }: ReportsDashboardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: reports = [], isLoading: reportsLoading } = useReports();
  const { data: recentRuns = [], isLoading: recentsLoading } = useRecentRuns(10);
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();

  const personalReports = reports.filter((r) => r.is_personal && r.owner_user_id === user?.id);
  const companyReports = reports.filter((r) => !r.is_personal);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* KPI Section */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Work KPIs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Work
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {kpisLoading ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            ) : (
              <>
                <KPITile
                  icon={AlertTriangle}
                  label="Overdue Tasks"
                  value={kpis?.work.tasksOverdue || 0}
                  variant={kpis?.work.tasksOverdue ? "warning" : "muted"}
                  onClick={() => onRunReport("tasks_overdue")}
                />
                <KPITile
                  icon={Clock}
                  label="Due This Week"
                  value={kpis?.work.tasksDueSoon || 0}
                  variant={kpis?.work.tasksDueSoon ? "default" : "muted"}
                  onClick={() => onRunReport("tasks_due_soon")}
                />
                <KPITile
                  icon={TrendingUp}
                  label="Active Projects"
                  value={kpis?.work.activeProjects || 0}
                  variant="success"
                  onClick={() => onRunReport("projects_active_completed")}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Relationships KPIs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Relationships
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {kpisLoading ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            ) : (
              <>
                <KPITile
                  icon={TrendingUp}
                  label="Pipeline Total"
                  value={formatCurrency(kpis?.relationships.pipelineTotal || 0)}
                  variant="success"
                  onClick={() => onRunReport("crm_pipeline_totals")}
                />
                <KPITile
                  icon={Heart}
                  label="Donations (30 Days)"
                  value={formatCurrency(kpis?.relationships.donationsThisPeriod || 0)}
                  variant="default"
                  onClick={() => onRunReport("donors_by_campaign")}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Finance KPIs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Finance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {kpisLoading ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            ) : (
              <>
                <KPITile
                  icon={AlertTriangle}
                  label="Overdue Invoices"
                  value={kpis?.finance.invoicesOverdue || 0}
                  variant={kpis?.finance.invoicesOverdue ? "warning" : "muted"}
                  onClick={() => onRunReport("ar_aging")}
                />
                <KPITile
                  icon={FileText}
                  label="Receipts (30 Days)"
                  value={formatCurrency(kpis?.finance.receiptsThisPeriod || 0)}
                  variant="default"
                  onClick={() => onRunReport("receipts_by_tag")}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reports Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* My Saved Reports */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                My Saved Reports
              </CardTitle>
              <Badge variant="secondary">{personalReports.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : personalReports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No personal reports saved yet
              </p>
            ) : (
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {personalReports.slice(0, 5).map((report) => (
                  <SavedReportItem
                    key={report.id}
                    report={report}
                    onClick={() => navigate(`/app/reports/${report.id}`)}
                  />
                ))}
              </div>
            )}
            {personalReports.length > 5 && (
              <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                <Link to="/app/reports?tab=personal">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Company Saved Reports */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company Reports
              </CardTitle>
              <Badge variant="secondary">{companyReports.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : companyReports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No company reports saved yet
              </p>
            ) : (
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {companyReports.slice(0, 5).map((report) => (
                  <SavedReportItem
                    key={report.id}
                    report={report}
                    onClick={() => navigate(`/app/reports/${report.id}`)}
                  />
                ))}
              </div>
            )}
            {companyReports.length > 5 && (
              <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                <Link to="/app/reports?tab=saved">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Recently Run */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <History className="h-4 w-4" />
                Recently Run
              </CardTitle>
              <Badge variant="secondary">{recentRuns.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {recentsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : recentRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No reports run recently
              </p>
            ) : (
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {recentRuns.slice(0, 5).map((run) => (
                  <RecentRunItem
                    key={run.id}
                    run={run}
                    onClick={() => onRunReport(run.report_type, run.config_json)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
