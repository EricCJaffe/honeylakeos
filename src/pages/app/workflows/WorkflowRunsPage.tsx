import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWfWorkflowRuns, type WfRunStatus } from "@/hooks/useWorkflows";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useMembership } from "@/lib/membership";

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  running: { icon: <Play className="h-4 w-4" />, color: "text-blue-500" },
  completed: { icon: <CheckCircle2 className="h-4 w-4" />, color: "text-green-500" },
  cancelled: { icon: <Pause className="h-4 w-4" />, color: "text-muted-foreground" },
  failed: { icon: <XCircle className="h-4 w-4" />, color: "text-destructive" },
};

export default function WorkflowRunsPage() {
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { isCompanyAdmin } = useMembership();
  const [statusFilter, setStatusFilter] = useState<WfRunStatus | "all">("all");

  const { data: runs, isLoading } = useWfWorkflowRuns({
    companyId: activeCompanyId ?? undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  if (!isCompanyAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          You don't have permission to view workflow runs.
        </p>
        <Button variant="link" onClick={() => navigate("/app/workflows")}>
          Back to Workflows
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflow Runs"
        description="Monitor and manage active and completed workflow executions"
      />

      <div className="flex items-center gap-4">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : runs && runs.length > 0 ? (
        <div className="space-y-4">
          {runs.map((run) => {
            const workflow = run.workflow as { id: string; title: string } | null;
            const statusConfig = STATUS_CONFIG[run.status];

            return (
              <Card
                key={run.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/app/workflows/runs/${run.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className={statusConfig?.color}>{statusConfig?.icon}</span>
                        {workflow?.title || "Workflow"}
                      </CardTitle>
                      <CardDescription>
                        Started {new Date(run.started_at).toLocaleString()}
                        {run.completed_at &&
                          ` • Completed ${new Date(run.completed_at).toLocaleString()}`}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        run.status === "completed"
                          ? "default"
                          : run.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {run.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>ID: {run.id.slice(0, 8)}</span>
                    {run.target_employee_id && (
                      <span>• Target Employee: {run.target_employee_id.slice(0, 8)}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Clock}
          title="No workflow runs"
          description={
            statusFilter === "all"
              ? "No workflows have been executed yet."
              : `No ${statusFilter} workflow runs found.`
          }
          action={
            statusFilter !== "all" ? (
              <Button variant="outline" onClick={() => setStatusFilter("all")}>
                Clear Filter
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
