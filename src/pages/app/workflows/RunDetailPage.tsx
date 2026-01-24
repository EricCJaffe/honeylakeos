import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Clock,
  X,
  Play,
  User,
  Building2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  SkipForward,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/PageHeader";
import {
  useWfWorkflowRun,
  useWfRunMutations,
  useWfStepRunMutations,
} from "@/hooks/useWorkflows";
import { useMembership } from "@/lib/membership";
import { useAuditLog } from "@/hooks/useAuditLog";
import { formatDistanceToNow } from "date-fns";

const STEP_TYPE_LABELS: Record<string, string> = {
  form_step: "Fill Form",
  approval_step: "Approval",
  task_step: "Create Task",
  project_step: "Create Project",
  calendar_step: "Schedule Event",
  document_step: "Create Document",
  note_step: "Create Note",
  notify_step: "Send Notification",
  assign_lms_step: "Assign Learning",
  support_ticket_step: "Create Ticket",
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  pending: { icon: <Clock className="h-4 w-4" />, color: "text-muted-foreground", bgColor: "bg-muted" },
  in_progress: { icon: <Play className="h-4 w-4" />, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  completed: { icon: <Check className="h-4 w-4" />, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  rejected: { icon: <X className="h-4 w-4" />, color: "text-destructive", bgColor: "bg-destructive/10" },
  skipped: { icon: <SkipForward className="h-4 w-4" />, color: "text-muted-foreground", bgColor: "bg-muted" },
  failed: { icon: <AlertCircle className="h-4 w-4" />, color: "text-destructive", bgColor: "bg-destructive/10" },
};

const RUN_STATUS_CONFIG: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
  running: { variant: "default" },
  completed: { variant: "secondary" },
  cancelled: { variant: "outline" },
  failed: { variant: "destructive" },
};

interface StepRun {
  id: string;
  status: string;
  assigned_to_user_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  output_links: unknown;
  created_at: string;
  step: {
    id: string;
    title: string;
    step_type: string;
    instructions: string | null;
    sort_order: number;
  } | null;
}

export default function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { isCompanyAdmin } = useMembership();
  const { log } = useAuditLog();

  const { data: run, isLoading } = useWfWorkflowRun(runId);
  const { cancelRun } = useWfRunMutations();
  const { completeStep, rejectStep, skipStep, startStep } = useWfStepRunMutations();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Workflow run not found</p>
        <Button variant="link" onClick={() => navigate("/app/workflows/runs")}>
          Back to Runs
        </Button>
      </div>
    );
  }

  const workflow = run.workflow as { id: string; title: string; scope_type: string } | null;
  const stepRuns = ((run.step_runs as StepRun[]) || []).sort(
    (a, b) => (a.step?.sort_order ?? 0) - (b.step?.sort_order ?? 0)
  );

  const handleCancelRun = async () => {
    const reason = prompt("Please provide a reason for cancellation:");
    if (reason) {
      await cancelRun.mutateAsync(run.id);
      await log("workflow.run_cancelled", "workflow_run", run.id, { reason });
    }
  };

  const handleStartStep = async (stepRunId: string) => {
    await startStep.mutateAsync(stepRunId);
    await log("workflow.step_started", "workflow_step_run", stepRunId, { run_id: run.id });
  };

  const handleCompleteStep = async (stepRunId: string) => {
    await completeStep.mutateAsync({ stepRunId });
    await log("workflow.step_completed", "workflow_step_run", stepRunId, { run_id: run.id });
  };

  const handleRejectStep = async (stepRunId: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (reason) {
      await rejectStep.mutateAsync({ stepRunId, notes: reason });
      await log("workflow.step_rejected", "workflow_step_run", stepRunId, { run_id: run.id, reason });
    }
  };

  const handleSkipStep = async (stepRunId: string) => {
    const reason = prompt("Please provide a reason for skipping:");
    if (reason) {
      await skipStep.mutateAsync({ stepRunId, notes: reason });
      await log("workflow.step_skipped", "workflow_step_run", stepRunId, { run_id: run.id, reason });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/workflows/runs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <PageHeader
            title={workflow?.title || "Workflow Run"}
            description={`Run ID: ${run.id.slice(0, 8)}...`}
          />
        </div>
        <Badge variant={RUN_STATUS_CONFIG[run.status]?.variant || "secondary"}>
          {run.status}
        </Badge>
      </div>

      {/* Run Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Run Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Started</p>
              <p className="font-medium">
                {new Date(run.started_at).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
              </p>
            </div>
            {run.completed_at && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="font-medium">
                  {new Date(run.completed_at).toLocaleString()}
                </p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Initiated By
              </p>
              <p className="font-medium text-sm">
                {run.initiated_by_user_id?.slice(0, 8) || "System"}
              </p>
            </div>
            {run.target_employee_id && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <UserCog className="h-3 w-3" /> Target Employee
                </p>
                <p className="font-medium text-sm">
                  {run.target_employee_id.slice(0, 8)}
                </p>
              </div>
            )}
            {workflow?.scope_type && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Scope
                </p>
                <Badge variant="outline" className="capitalize">
                  {workflow.scope_type}
                </Badge>
              </div>
            )}
          </div>

          {run.status === "running" && isCompanyAdmin && (
            <div className="mt-6 pt-4 border-t">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancelRun}
                disabled={cancelRun.isPending}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel Run
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step Timeline</CardTitle>
          <CardDescription>
            {stepRuns.length} step{stepRuns.length !== 1 ? "s" : ""} in this workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stepRuns.map((stepRun, index) => {
              const statusConfig = STATUS_CONFIG[stepRun.status] || STATUS_CONFIG.pending;
              const step = stepRun.step;
              const isActionable =
                stepRun.status === "pending" || stepRun.status === "in_progress";
              const outputLinks = stepRun.output_links as { type: string; id: string }[] | null;

              return (
                <div key={stepRun.id} className="relative">
                  {index < stepRuns.length - 1 && (
                    <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-border" />
                  )}
                  <div className="flex gap-4">
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${statusConfig.bgColor}`}
                    >
                      <span className={statusConfig.color}>{statusConfig.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">{step?.title || "Step"}</p>
                          <p className="text-sm text-muted-foreground">
                            {STEP_TYPE_LABELS[step?.step_type ?? ""] || step?.step_type}
                          </p>
                        </div>
                        <Badge
                          variant={stepRun.status === "completed" ? "default" : "secondary"}
                          className="flex-shrink-0"
                        >
                          {stepRun.status.replace("_", " ")}
                        </Badge>
                      </div>

                      {step?.instructions && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {step.instructions}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        {stepRun.assigned_to_user_id && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Assigned: {stepRun.assigned_to_user_id.slice(0, 8)}
                          </span>
                        )}
                        {stepRun.started_at && (
                          <span>Started: {new Date(stepRun.started_at).toLocaleString()}</span>
                        )}
                        {stepRun.completed_at && (
                          <span>Completed: {new Date(stepRun.completed_at).toLocaleString()}</span>
                        )}
                      </div>

                      {stepRun.notes && (
                        <div className="mt-2 p-2 rounded bg-muted text-sm flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <span>{stepRun.notes}</span>
                        </div>
                      )}

                      {outputLinks && outputLinks.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {outputLinks.map((link, i) => (
                            <Badge key={i} variant="outline" className="gap-1">
                              <ExternalLink className="h-3 w-3" />
                              {link.type}: {link.id.slice(0, 8)}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {isActionable && (
                        <div className="mt-3 flex gap-2">
                          {stepRun.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartStep(stepRun.id)}
                              disabled={startStep.isPending}
                            >
                              <Play className="mr-2 h-3 w-3" />
                              Start
                            </Button>
                          )}
                          {stepRun.status === "in_progress" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleCompleteStep(stepRun.id)}
                                disabled={completeStep.isPending}
                              >
                                <Check className="mr-2 h-3 w-3" />
                                Complete
                              </Button>
                              {step?.step_type === "approval_step" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRejectStep(stepRun.id)}
                                  disabled={rejectStep.isPending}
                                >
                                  <X className="mr-2 h-3 w-3" />
                                  Reject
                                </Button>
                              )}
                            </>
                          )}
                          {isCompanyAdmin && stepRun.status === "pending" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSkipStep(stepRun.id)}
                              disabled={skipStep.isPending}
                            >
                              <SkipForward className="mr-2 h-3 w-3" />
                              Skip
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
