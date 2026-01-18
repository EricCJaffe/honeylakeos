import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  Building2,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Eye,
  Activity,
  Briefcase,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ModuleGuard } from "@/components/ModuleGuard";
import {
  useCoachClients,
  useCoachClientMetrics,
  CoachOrganization,
} from "@/hooks/useCoachOrganizations";
import { formatDistanceToNow } from "date-fns";

interface ClientCardProps {
  relationship: CoachOrganization;
}

function ClientCard({ relationship }: ClientCardProps) {
  const navigate = useNavigate();
  const client = relationship.client_company;
  const { data: metrics, isLoading: metricsLoading } = useCoachClientMetrics(
    relationship.client_company_id
  );

  if (!client) return null;

  const initials = client.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hasIssues = (metrics?.tasks_overdue || 0) > 0;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={client.logo_url || undefined} alt={client.name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{client.name}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs capitalize">
                {relationship.relationship_type}
              </Badge>
              {hasIssues && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Needs Attention
                </Badge>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {metricsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : metrics?.error ? (
          <p className="text-sm text-muted-foreground">Unable to load metrics</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle
                className={`h-4 w-4 ${
                  (metrics?.tasks_overdue || 0) > 0
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              />
              <span>
                <strong>{metrics?.tasks_overdue || 0}</strong> overdue
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                <strong>{metrics?.tasks_due_soon || 0}</strong> due soon
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-primary" />
              <span>
                <strong>{metrics?.projects_active || 0}</strong> active projects
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>
                <strong>{metrics?.projects_completed_30d || 0}</strong> completed
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {metrics?.last_activity_at ? (
              <>
                Last activity{" "}
                {formatDistanceToNow(new Date(metrics.last_activity_at), {
                  addSuffix: true,
                })}
              </>
            ) : (
              "No recent activity"
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              navigate(`/app/coaching/clients/${relationship.client_company_id}`)
            }
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CoachDashboardContent() {
  const { data: clients = [], isLoading } = useCoachClients();

  const totalClients = clients.length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Coach Dashboard"
        description="Overview of your client organizations"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">{totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">
                  {clients.filter((c) => c.status === "active").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coach Type</p>
                <p className="text-2xl font-bold">
                  {clients.filter((c) => c.relationship_type === "coach").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Advisor Type</p>
                <p className="text-2xl font-bold">
                  {clients.filter((c) => c.relationship_type === "advisor").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Client Organizations
        </h2>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No client organizations"
            description="You don't have any linked client organizations yet. Clients can add your organization as their coach from their settings."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((relationship) => (
              <ClientCard key={relationship.id} relationship={relationship} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CoachDashboardPage() {
  return <CoachDashboardContent />;
}
