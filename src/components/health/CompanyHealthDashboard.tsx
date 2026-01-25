import { useCompanyHealthScore } from "@/hooks/useHealthScoring";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HealthStatusBadge, TrendIndicator, HealthScoreBar } from "./HealthIndicator";
import { Activity, AlertTriangle, TrendingUp, Target } from "lucide-react";

// Leadership View - Full health dashboard
export function CompanyHealthDashboard() {
  const { data: health, isLoading, error } = useCompanyHealthScore();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !health) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No health metrics configured for this framework</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Health */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overall Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold">{health.weightedScore}%</span>
              <HealthStatusBadge status={health.status} showScore={false} />
            </div>
            <HealthScoreBar score={health.weightedScore} status={health.status} showLabel={false} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Active Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{health.allMetrics.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Being tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trending Up
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {health.allMetrics.filter(m => m.trend === "improving").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Metrics improving
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {health.atRiskMetrics.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Below target
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Contributors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Contributors</CardTitle>
            <CardDescription>Metrics driving your health score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {health.topContributors.map((metric) => (
                <div key={metric.metric.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{metric.metric.display_name}</p>
                    <div className="flex items-center gap-2">
                      <HealthStatusBadge status={metric.status} score={metric.normalizedScore} size="sm" />
                      <TrendIndicator trend={metric.trend} explanation={metric.trendExplanation} size="sm" />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{metric.metric.weight_percent}%</p>
                    <p className="text-xs text-muted-foreground">weight</p>
                  </div>
                </div>
              ))}
              {health.topContributors.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No metrics configured
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* At Risk Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Needs Attention
            </CardTitle>
            <CardDescription>Metrics below target thresholds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {health.atRiskMetrics.map((metric) => (
                <div key={metric.metric.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{metric.metric.display_name}</p>
                    <HealthStatusBadge status={metric.status} score={metric.normalizedScore} size="sm" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metric.metric.description || getMetricExplanation(metric)}
                  </p>
                  <HealthScoreBar score={metric.normalizedScore} status={metric.status} showLabel={false} />
                </div>
              ))}
              {health.atRiskMetrics.length === 0 && (
                <div className="text-center py-4">
                  <TrendingUp className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    All metrics are on track!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Metrics Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Health Metrics</CardTitle>
          <CardDescription>Complete view of your organization's health indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {health.allMetrics.map((metric) => (
              <div 
                key={metric.metric.id} 
                className="p-4 rounded-lg border bg-card space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{metric.metric.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Weight: {metric.metric.weight_percent}%
                    </p>
                  </div>
                  <HealthStatusBadge status={metric.status} score={metric.normalizedScore} size="sm" />
                </div>
                <HealthScoreBar score={metric.normalizedScore} status={metric.status} showLabel={false} />
                <div className="flex items-center justify-between text-xs">
                  <TrendIndicator trend={metric.trend} explanation={metric.trendExplanation} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Team View - Simplified health display
export function TeamHealthSummary() {
  const { data: health, isLoading } = useCompanyHealthScore();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Organization Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <HealthStatusBadge status={health.status} score={health.weightedScore} size="lg" />
          {health.allMetrics.some(m => m.trend === "improving") && (
            <TrendIndicator trend="improving" explanation="Some metrics are improving" />
          )}
        </div>

        {health.atRiskMetrics.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">What needs attention:</p>
            <ul className="space-y-1">
              {health.atRiskMetrics.slice(0, 3).map((metric) => (
                <li key={metric.metric.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  {metric.metric.display_name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper to generate explanation for a metric
function getMetricExplanation(metric: { metric: { calculation_key: string }; normalizedScore: number; status: string }): string {
  const explanations: Record<string, string> = {
    "tasks.completion_rate": `Task completion rate is at ${metric.normalizedScore}%. Focus on completing overdue items.`,
    "tasks.overdue_count": `There are overdue tasks impacting this score. Review and address high-priority items.`,
    "projects.on_track_rate": `Some projects may be at risk of missing deadlines. Review project timelines.`,
    "events.meeting_adherence": `Meeting cadence may not be meeting targets. Ensure regular team meetings are scheduled.`,
  };

  return explanations[metric.metric.calculation_key] || `This metric is currently ${metric.status}. Review and take action as needed.`;
}
