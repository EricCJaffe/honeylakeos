import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BarChart3,
  Plus,
  User,
  Building2,
  CheckCircle2,
  FolderKanban,
  Users,
  Heart,
  CreditCard,
  Trash2,
  Play,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/PageHeader";
import { ModuleGuard } from "@/components/ModuleGuard";
import { EmptyState } from "@/components/EmptyState";
import {
  useReports,
  useDeleteReport,
  REPORT_CATEGORIES,
  getReportLabel,
  getReportCategory,
  Report,
  ReportType,
} from "@/hooks/useReports";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { WORK_REPORT_TEMPLATES, WorkReportTemplateCard } from "./WorkReportTemplates";
import { RELATIONSHIPS_REPORT_TEMPLATES, RelationshipsReportTemplateCard } from "./RelationshipsReportTemplates";
import { FINANCE_REPORT_TEMPLATES, FinanceReportTemplateCard } from "./FinanceReportTemplates";
import { QuickReportRunner } from "./QuickReportRunner";
import { RelationshipsReportRunner } from "./RelationshipsReportRunner";
import { FinanceReportRunner } from "./FinanceReportRunner";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  work: CheckCircle2,
  relationships: Users,
  finance: CreditCard,
};

function ReportCard({ report, onDelete }: { report: Report; onDelete: () => void }) {
  const category = getReportCategory(report.report_type);
  const CategoryIcon = CATEGORY_ICONS[category] || BarChart3;
  const deleteReport = useDeleteReport();

  const handleDelete = () => {
    deleteReport.mutate(report.id, { onSuccess: onDelete });
  };

  return (
    <Card className="group hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CategoryIcon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{report.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Report</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{report.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <CardDescription className="line-clamp-2">
          {report.description || getReportLabel(report.report_type)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {getReportLabel(report.report_type)}
            </Badge>
            {report.is_personal && (
              <Badge variant="outline" className="text-xs">
                <User className="h-3 w-3 mr-1" />
                Personal
              </Badge>
            )}
          </div>
          <Button asChild size="sm" variant="outline" className="gap-1">
            <Link to={`/app/reports/${report.id}`}>
              <Play className="h-3 w-3" />
              Run
            </Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Created {format(new Date(report.created_at), "MMM d, yyyy")}
        </p>
      </CardContent>
    </Card>
  );
}

function CategorySection({ category, reports }: { category: typeof REPORT_CATEGORIES[0]; reports: Report[] }) {
  const CategoryIcon = CATEGORY_ICONS[category.key] || BarChart3;
  const filteredReports = reports.filter((r) => getReportCategory(r.report_type) === category.key);

  if (filteredReports.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <CategoryIcon className="h-4 w-4" />
        {category.label}
        <Badge variant="secondary" className="text-xs">{filteredReports.length}</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredReports.map((report) => (
          <ReportCard key={report.id} report={report} onDelete={() => {}} />
        ))}
      </div>
    </div>
  );
}

function ReportsContent() {
  const navigate = useNavigate();
  const { data: reports = [], isLoading, refetch } = useReports();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "templates";
  const [runningReport, setRunningReport] = React.useState<ReportType | null>(null);

  const personalReports = reports.filter((r) => r.is_personal && r.owner_user_id === user?.id);
  const companyReports = reports.filter((r) => !r.is_personal);

  const isRelationshipsReport = (type: ReportType) => 
    type.startsWith("crm") || type.startsWith("donor");

  const isFinanceReport = (type: ReportType) =>
    type.startsWith("invoices") || type.startsWith("payments") || type.startsWith("receipts") || type === "ar_aging";

  if (runningReport) {
    if (isFinanceReport(runningReport)) {
      return (
        <div className="p-6 lg:p-8">
          <FinanceReportRunner
            reportType={runningReport}
            onBack={() => setRunningReport(null)}
          />
        </div>
      );
    }
    if (isRelationshipsReport(runningReport)) {
      return (
        <div className="p-6 lg:p-8">
          <RelationshipsReportRunner
            reportType={runningReport}
            onBack={() => setRunningReport(null)}
          />
        </div>
      );
    }
    return (
      <div className="p-6 lg:p-8">
        <QuickReportRunner
          reportType={runningReport}
          onBack={() => setRunningReport(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Reports"
        description="Create and run analytics reports across your modules"
      >
        <Button asChild>
          <Link to="/app/reports/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Report
          </Link>
        </Button>
      </PageHeader>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setSearchParams({ tab: v })}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Quick Reports
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Saved
            <Badge variant="secondary" className="text-xs">{reports.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="personal" className="gap-2">
            <User className="h-4 w-4" />
            My Reports
            <Badge variant="secondary" className="text-xs">{personalReports.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Quick Reports / Templates */}
        <TabsContent value="templates" className="mt-6 space-y-8">
          {/* Work Reports */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Work Reports
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {WORK_REPORT_TEMPLATES.map((template) => (
                <WorkReportTemplateCard
                  key={template.id}
                  template={template}
                  onRun={() => setRunningReport(template.type)}
                  onSave={() => setRunningReport(template.type)}
                />
              ))}
            </div>
          </div>

          {/* Relationships Reports */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Relationships Reports
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {RELATIONSHIPS_REPORT_TEMPLATES.map((template) => (
                <RelationshipsReportTemplateCard
                  key={template.id}
                  template={template}
                  onRun={() => setRunningReport(template.type)}
                  onSave={() => setRunningReport(template.type)}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Saved Reports */}
        <TabsContent value="saved" className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-6 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No saved reports"
              description="Run a quick report and save it for quick access"
              actionLabel="View Quick Reports"
              onAction={() => setSearchParams({ tab: "templates" })}
            />
          ) : (
            <div className="space-y-8">
              {REPORT_CATEGORIES.map((category) => (
                <CategorySection
                  key={category.key}
                  category={category}
                  reports={reports}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Personal Reports */}
        <TabsContent value="personal" className="mt-6">
          {personalReports.length === 0 ? (
            <EmptyState
              icon={User}
              title="No personal reports"
              description="Save a report as personal to see it here"
              actionLabel="View Quick Reports"
              onAction={() => setSearchParams({ tab: "templates" })}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {personalReports.map((report) => (
                <ReportCard key={report.id} report={report} onDelete={() => refetch()} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ModuleGuard moduleKey="reports" moduleName="Reports">
      <ReportsContent />
    </ModuleGuard>
  );
}
