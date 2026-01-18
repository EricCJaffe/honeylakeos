import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings2, AlertCircle, FileSpreadsheet, BookOpen } from "lucide-react";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useCompanyActiveFramework } from "@/hooks/useFrameworks";
import { useFinanceMetrics } from "@/hooks/useFinanceMetrics";
import { useFinanceMetricsTrend } from "@/hooks/useFinanceMetricsTrend";
import { useFrameworkFinanceTargets } from "@/hooks/useFrameworkFinanceTargets";
import { 
  useFrameworkFinancePlaybook, 
  evaluateTriggeredConditions,
  FrameworkFinancePlaybookItem 
} from "@/hooks/useFrameworkFinancePlaybook";
import { useFinanceMode } from "@/hooks/useFinanceMode";
import { useFinanceAccess } from "@/hooks/useFinanceAccess";
import { useAuditLog } from "@/hooks/useAuditLog";
import {
  FinanceKpiGrid,
  FinanceTrendPanel,
  FinanceTargetsDialog,
  FinancePlaybookPrompts,
} from "@/components/frameworks/FinancialReview";

interface FrameworkFinancialReviewProps {
  frameworkId?: string;
  isCoachView?: boolean;
}

export function FrameworkFinancialReview({ 
  frameworkId: propFrameworkId,
  isCoachView = false,
}: FrameworkFinancialReviewProps) {
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { data: activeFramework, isLoading: frameworkLoading } = useCompanyActiveFramework();
  const { financeMode } = useFinanceMode();
  const { hasFinanceAccess, hasAdminAccess, loading: accessLoading } = useFinanceAccess();
  const { log } = useAuditLog();

  const [targetsDialogOpen, setTargetsDialogOpen] = useState(false);

  const effectiveFrameworkId = propFrameworkId || activeFramework?.active_framework_id;

  // Finance metrics
  const { 
    data: metricsData, 
    isLoading: metricsLoading, 
    error: metricsError 
  } = useFinanceMetrics({ enabled: !!effectiveFrameworkId && hasFinanceAccess });

  // Trend data
  const { 
    revenueTrend, 
    netIncomeTrend, 
    cashTrend, 
    previousPeriodMetrics,
    isLoading: trendLoading 
  } = useFinanceMetricsTrend(6, !!effectiveFrameworkId && hasFinanceAccess);

  // Finance targets
  const { data: targetsData, isLoading: targetsLoading } = useFrameworkFinanceTargets(effectiveFrameworkId || null);

  // Playbook items
  const { data: playbookItems, isLoading: playbookLoading } = useFrameworkFinancePlaybook(effectiveFrameworkId || null);

  // Check access
  if (!hasFinanceAccess && !isCoachView) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You don't have permission to view financial data. Contact your company admin.
        </AlertDescription>
      </Alert>
    );
  }

  // Loading state
  if (frameworkLoading || accessLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // No framework
  if (!effectiveFrameworkId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CardDescription>
            No framework adopted. Go to Settings to select a framework.
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  // No finance mode set
  if (!financeMode) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Finance Not Configured</AlertTitle>
        <AlertDescription>
          Your company hasn't configured a finance mode yet.{" "}
          <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/app/settings")}>
            Go to Settings
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Error state
  if (metricsError) {
    const errorMessage = (metricsError as Error).message;
    const isNoDataError = errorMessage.includes("No imported data") || errorMessage.includes("Post transactions");

    return (
      <Alert variant={isNoDataError ? "default" : "destructive"}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>
          {isNoDataError ? "Setup Required" : "Error Loading Metrics"}
        </AlertTitle>
        <AlertDescription>
          {financeMode === "external_reporting" ? (
            <div className="space-y-2">
              <p>Import P&L, Balance Sheet, and Open AR/AP data to enable financial review.</p>
              <Button size="sm" onClick={() => navigate("/app/insights/imports")}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Go to Imports
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p>Post transactions and reconcile accounts to enable full review.</p>
              <Button size="sm" onClick={() => navigate("/app/finance")}>
                <BookOpen className="h-4 w-4 mr-2" />
                Go to Accounting
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  const targets = targetsData?.targets_json || null;
  const triggeredConditions = metricsData
    ? evaluateTriggeredConditions(metricsData.metrics, targets, previousPeriodMetrics)
    : [];

  const handleCreateTask = (item: FrameworkFinancePlaybookItem) => {
    navigate(`/app/tasks?create=true&title=${encodeURIComponent(item.title)}&description=${encodeURIComponent(item.description || "")}`);
  };

  const handleCreateNote = (item: FrameworkFinancePlaybookItem) => {
    navigate(`/app/notes?create=true&title=${encodeURIComponent(item.title)}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Financial Review</h2>
          <p className="text-muted-foreground flex items-center gap-2">
            <Badge variant="outline">
              {financeMode === "builtin_books" ? "Accounting" : "Financial Insights"}
            </Badge>
            {metricsData && (
              <span className="text-sm">
                Period: {metricsData.period_start} to {metricsData.period_end}
              </span>
            )}
          </p>
        </div>
        {hasAdminAccess && !isCoachView && (
          <Button variant="outline" onClick={() => setTargetsDialogOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            Set Targets
          </Button>
        )}
      </div>

      {/* KPI Grid */}
      <FinanceKpiGrid
        metrics={metricsData?.metrics}
        targets={targets}
        previousPeriodMetrics={previousPeriodMetrics}
        isLoading={metricsLoading}
        financeMode={financeMode}
      />

      {/* Playbook Prompts */}
      {!playbookLoading && playbookItems && playbookItems.length > 0 && (
        <FinancePlaybookPrompts
          playbookItems={playbookItems}
          triggeredConditions={triggeredConditions}
          onCreateTask={isCoachView ? undefined : handleCreateTask}
          onCreateNote={isCoachView ? undefined : handleCreateNote}
        />
      )}

      {/* Trend Panel */}
      <FinanceTrendPanel
        revenueTrend={revenueTrend}
        netIncomeTrend={netIncomeTrend}
        cashTrend={cashTrend}
        isLoading={trendLoading}
      />

      {/* Targets Dialog */}
      <FinanceTargetsDialog
        open={targetsDialogOpen}
        onOpenChange={setTargetsDialogOpen}
        frameworkId={effectiveFrameworkId}
        currentTargets={targets}
      />
    </div>
  );
}
