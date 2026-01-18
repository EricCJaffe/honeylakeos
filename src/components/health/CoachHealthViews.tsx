import { useClientHealthScores, useCoachingOrgHealthRollup } from "@/hooks/useHealthScoring";
import { useMyAssignedEngagements } from "@/hooks/useCoaching";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HealthStatusBadge, TrendIndicator, HealthSummaryPill } from "./HealthIndicator";
import { Users, Building2, TrendingUp, TrendingDown, AlertTriangle, Check, Bell } from "lucide-react";
import type { HealthStatus, TrendDirection } from "@/hooks/useHealthScoring";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// Alert severity badge
export function AlertSeverityBadge({ severity }: { severity: "low" | "medium" | "high" }) {
  const config = {
    low: { label: "Low", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    medium: { label: "Medium", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
    high: { label: "High", className: "bg-red-500/10 text-red-600 border-red-500/20" },
  };
  return (
    <Badge variant="outline" className={cn("text-xs", config[severity].className)}>
      {config[severity].label}
    </Badge>
  );
}

// Alert card for coach dashboard
export function AlertCard({ 
  alert, 
  showClient = true,
}: { 
  alert: { 
    id: string; 
    severity: "low" | "medium" | "high"; 
    message: string; 
    suggested_action?: string | null;
    created_at: string;
    resolved_at?: string | null;
    client_company?: { name: string } | null;
  }; 
  showClient?: boolean;
}) {
  return (
    <Card className={cn(
      "border-l-4",
      alert.severity === "high" && "border-l-red-500",
      alert.severity === "medium" && "border-l-yellow-500",
      alert.severity === "low" && "border-l-blue-500",
    )}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <AlertSeverityBadge severity={alert.severity} />
              {showClient && alert.client_company && (
                <span className="text-sm font-medium truncate">
                  {alert.client_company.name}
                </span>
              )}
            </div>
            <p className="text-sm font-medium">{alert.message}</p>
            {alert.suggested_action && (
              <p className="text-xs text-muted-foreground mt-1">
                💡 {alert.suggested_action}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Coach's Client Health List
export function CoachClientHealthList() {
  const { data: assignments, isLoading: assignmentsLoading } = useMyAssignedEngagements();
  const engagementIds = assignments?.map(a => a.engagement_id) || [];
  const { data: clientHealths, isLoading: healthLoading } = useClientHealthScores(engagementIds);

  const isLoading = assignmentsLoading || healthLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!clientHealths || clientHealths.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client Health</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No assigned clients</p>
        </CardContent>
      </Card>
    );
  }

  // Sort by health - worst first
  const sortedClients = [...clientHealths].sort((a, b) => {
    const statusOrder = { red: 0, yellow: 1, unknown: 2, green: 3 };
    return (statusOrder[a.status as keyof typeof statusOrder] || 2) - (statusOrder[b.status as keyof typeof statusOrder] || 2);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Client Health
        </CardTitle>
        <CardDescription>
          {clientHealths.filter(c => c.status === "red").length} at risk, {" "}
          {clientHealths.filter(c => c.status === "yellow").length} need attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedClients.map((client) => (
          <div 
            key={client.engagementId}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">{client.clientName}</p>
                {!client.hasFramework && (
                  <p className="text-xs text-muted-foreground">No framework adopted</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HealthSummaryPill 
                score={client.healthScore} 
                status={client.status as HealthStatus | "unknown"} 
                trend={client.trend as TrendDirection} 
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Coaching Org Rollup Dashboard
export function CoachingOrgHealthRollup() {
  const { data: rollup, isLoading } = useCoachingOrgHealthRollup();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!rollup || rollup.totalClients === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No active client engagements</p>
        </CardContent>
      </Card>
    );
  }

  const { distribution, trends, totalClients } = rollup;
  const greenPercent = Math.round((distribution.green / totalClients) * 100);
  const yellowPercent = Math.round((distribution.yellow / totalClients) * 100);
  const redPercent = Math.round((distribution.red / totalClients) * 100);

  return (
    <div className="space-y-6">
      {/* Distribution Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalClients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Healthy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{distribution.green}</div>
            <p className="text-xs text-muted-foreground">{greenPercent}% of clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">
              Need Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{distribution.yellow}</div>
            <p className="text-xs text-muted-foreground">{yellowPercent}% of clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              At Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{distribution.red}</div>
            <p className="text-xs text-muted-foreground">{redPercent}% of clients</p>
          </CardContent>
        </Card>
      </div>

      {/* Health Distribution Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Health Distribution</CardTitle>
          <CardDescription>Overall health status across all clients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex h-4 rounded-full overflow-hidden bg-muted">
              {greenPercent > 0 && (
                <div 
                  className="bg-green-500 transition-all" 
                  style={{ width: `${greenPercent}%` }} 
                />
              )}
              {yellowPercent > 0 && (
                <div 
                  className="bg-yellow-500 transition-all" 
                  style={{ width: `${yellowPercent}%` }} 
                />
              )}
              {redPercent > 0 && (
                <div 
                  className="bg-red-500 transition-all" 
                  style={{ width: `${redPercent}%` }} 
                />
              )}
            </div>
            <div className="flex justify-between text-xs">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Healthy ({distribution.green})</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span>Attention ({distribution.yellow})</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span>At Risk ({distribution.red})</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trends Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trend Summary</CardTitle>
          <CardDescription>How clients are trending over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{trends.improving}</p>
                <p className="text-xs text-muted-foreground">Improving</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <div className="h-8 w-8 flex items-center justify-center">
                <div className="h-0.5 w-6 bg-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{trends.stable}</p>
                <p className="text-xs text-muted-foreground">Stable</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10">
              <TrendingDown className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">{trends.declining}</p>
                <p className="text-xs text-muted-foreground">Declining</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients at Risk */}
      {distribution.red > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Clients Requiring Attention
            </CardTitle>
            <CardDescription>These clients have health scores in the red zone</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rollup.clients
                .filter(c => c.status === "red")
                .map((client, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg border border-red-500/20 bg-red-500/5"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{client.name}</span>
                    </div>
                    <HealthStatusBadge status="red" score={client.score} size="sm" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
