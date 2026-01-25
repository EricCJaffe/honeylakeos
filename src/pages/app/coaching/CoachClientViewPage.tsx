import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  BarChart3,
  FileText,
  Activity,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Briefcase,
  Heart,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ModuleGuard } from "@/components/ModuleGuard";
import {
  useCoachClients,
  useCoachClientMetrics,
  useCoachSharedReports,
} from "@/hooks/useCoachOrganizations";
import { getReportLabel } from "@/hooks/useReports";
import { format, formatDistanceToNow } from "date-fns";

function KPICard({
  icon: Icon,
  label,
  value,
  variant = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  variant?: "default" | "warning" | "success" | "muted";
}) {
  const variantClasses = {
    default: "bg-primary/10 text-primary",
    warning: "bg-destructive/10 text-destructive",
    success: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    muted: "bg-muted text-muted-foreground",
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${variantClasses[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewTab({ clientCompanyId }: { clientCompanyId: string }) {
  const { data: metrics, isLoading } = useCoachClientMetrics(clientCompanyId);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (metrics?.error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You don't have permission to view this client's data.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          icon={AlertTriangle}
          label="Overdue Tasks"
          value={metrics?.tasks_overdue || 0}
          variant={(metrics?.tasks_overdue || 0) > 0 ? "warning" : "muted"}
        />
        <KPICard
          icon={Clock}
          label="Tasks Due Soon"
          value={metrics?.tasks_due_soon || 0}
          variant={(metrics?.tasks_due_soon || 0) > 0 ? "default" : "muted"}
        />
        <KPICard
          icon={Briefcase}
          label="Active Projects"
          value={metrics?.projects_active || 0}
          variant="success"
        />
        <KPICard
          icon={CheckCircle2}
          label="Completed (30d)"
          value={metrics?.projects_completed_30d || 0}
          variant="muted"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {metrics?.last_activity_at ? (
              <p>
                Last activity:{" "}
                <strong>
                  {formatDistanceToNow(new Date(metrics.last_activity_at), {
                    addSuffix: true,
                  })}
                </strong>
              </p>
            ) : (
              <p>No recent activity recorded</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Coach View</AlertTitle>
        <AlertDescription>
          You are viewing aggregate metrics only. Detailed records (CRM, donors,
          documents) are not accessible in coach view to protect client privacy.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function HealthTab({ clientCompanyId }: { clientCompanyId: string }) {
  // Placeholder for framework health integration
  return (
    <div className="space-y-6">
      <Alert>
        <Heart className="h-4 w-4" />
        <AlertTitle>Framework Health</AlertTitle>
        <AlertDescription>
          Framework health scores will be displayed here once the client has
          adopted a framework.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Health Metrics</CardTitle>
          <CardDescription>
            Overall health based on framework-defined metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No framework health data available</p>
            <p className="text-sm">
              The client needs to adopt a framework to generate health scores.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SharedReportsTab({ clientCompanyId }: { clientCompanyId: string }) {
  const { data: reports = [], isLoading } = useCoachSharedReports(clientCompanyId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No shared reports"
        description="The client hasn't shared any reports with coaches yet. Reports marked as 'Coach Shared' will appear here."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Shared Reports</CardTitle>
        <CardDescription>
          Reports the client has explicitly shared with coaches
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="font-medium">{report.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getReportLabel(report.report_type as any)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(report.created_at), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CoachClientViewContent() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { data: clients = [], isLoading } = useCoachClients();

  const relationship = clients.find((c) => c.client_company_id === clientId);
  const client = relationship?.client_company;

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!relationship || !client) {
    return (
      <div className="p-6 lg:p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Client Not Found</AlertTitle>
          <AlertDescription>
            This client organization is not linked to your coach company or you
            don't have access to view it.
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => navigate("/app/coaching/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const initials = client.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/coaching/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-12 w-12">
          <AvatarImage src={client.logo_url || undefined} alt={client.name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="capitalize">
              {relationship.relationship_type}
            </Badge>
            <Badge variant="secondary">Coach View</Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-2">
            <Heart className="h-4 w-4" />
            Framework Health
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" />
            Shared Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab clientCompanyId={clientId!} />
        </TabsContent>

        <TabsContent value="health" className="mt-6">
          <HealthTab clientCompanyId={clientId!} />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <SharedReportsTab clientCompanyId={clientId!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CoachClientViewPage() {
  return <CoachClientViewContent />;
}
