import { useNavigate } from "react-router-dom";
import { Check, Clock, AlertCircle, X, Play, User, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useMyWfWorkItems, useWfStepRunMutations } from "@/hooks/useWorkflows";
import { useMyWfSubmissions } from "@/hooks/useWorkflowForms";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow, isPast, addDays } from "date-fns";

const STEP_TYPE_LABELS: Record<string, string> = {
  form_step: "Fill Form",
  approval_step: "Approval Required",
  task_step: "Complete Task",
  project_step: "Create Project",
  calendar_step: "Schedule Event",
  document_step: "Create Document",
  note_step: "Create Note",
  notify_step: "Notification",
  assign_lms_step: "Learning Assignment",
  support_ticket_step: "Support Ticket",
};

interface WorkItem {
  id: string;
  status: string;
  created_at: string;
  started_at: string | null;
  step: { title: string; step_type: string; instructions?: string | null; due_days_offset?: number | null } | null;
  run: { id: string; started_at: string; target_employee_id: string | null; workflow: { id: string; title: string } | null } | null;
}

export default function MyWorkPage() {
  const navigate = useNavigate();
  const { data: workItems, isLoading: workItemsLoading } = useMyWfWorkItems();
  const { data: submissions, isLoading: submissionsLoading } = useMyWfSubmissions();
  const { completeStep, rejectStep, startStep } = useWfStepRunMutations();
  const { log } = useAuditLog();

  const handleStartStep = async (stepRunId: string, runId?: string) => {
    await startStep.mutateAsync(stepRunId);
    await log("workflow.step_started", "workflow_step_run", stepRunId, { run_id: runId });
  };

  const handleCompleteStep = async (stepRunId: string, runId?: string) => {
    await completeStep.mutateAsync({ stepRunId });
    await log("workflow.step_completed", "workflow_step_run", stepRunId, { run_id: runId });
  };

  const handleRejectStep = async (stepRunId: string, runId?: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (reason) {
      await rejectStep.mutateAsync({ stepRunId, notes: reason });
      await log("workflow.step_rejected", "workflow_step_run", stepRunId, { run_id: runId, reason });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "in_progress": return <Play className="h-4 w-4 text-blue-500" />;
      case "completed": return <Check className="h-4 w-4 text-green-500" />;
      case "rejected": return <X className="h-4 w-4 text-destructive" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const items = (workItems || []).map((i): WorkItem => ({
    id: (i as { id: string }).id,
    status: (i as { status: string }).status,
    created_at: (i as { created_at: string }).created_at,
    started_at: (i as { started_at: string | null }).started_at,
    step: (i as { step: WorkItem["step"] }).step,
    run: (i as { run: WorkItem["run"] }).run,
  }));

  const getDueInfo = (item: WorkItem) => {
    if (!item.run?.started_at || !item.step?.due_days_offset) return null;
    const dueDate = addDays(new Date(item.run.started_at), item.step.due_days_offset);
    return { dueDate, isOverdue: isPast(dueDate) };
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Work" description="Your pending workflow tasks and approvals" />
      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Workflow Tasks {items.length > 0 && `(${items.length})`}</TabsTrigger>
          <TabsTrigger value="submissions">My Submissions {submissions && submissions.length > 0 && `(${submissions.length})`}</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-6">
          {workItemsLoading ? (
            <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>
          ) : items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => {
                const dueInfo = getDueInfo(item);
                return (
                  <Card key={item.id} className={`hover:shadow-md transition-shadow ${dueInfo?.isOverdue ? 'border-destructive/50' : ''}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            <CardTitle className="text-lg">{item.step?.title || "Workflow Step"}</CardTitle>
                          </div>
                          <CardDescription>{item.run?.workflow?.title || "Workflow"} • {STEP_TYPE_LABELS[item.step?.step_type ?? ""] || item.step?.step_type}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {dueInfo && <Badge variant={dueInfo.isOverdue ? "destructive" : "secondary"} className="gap-1"><Calendar className="h-3 w-3" />{dueInfo.isOverdue ? "Overdue" : `Due ${formatDistanceToNow(dueInfo.dueDate, { addSuffix: true })}`}</Badge>}
                          <Badge variant={item.status === "in_progress" ? "default" : "secondary"}>{item.status.replace("_", " ")}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {item.run?.target_employee_id && <div className="text-sm text-muted-foreground mb-2 flex items-center gap-1"><User className="h-3 w-3" />Target: {item.run.target_employee_id.slice(0, 8)}</div>}
                      {item.step?.instructions && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{item.step.instructions}</p>}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          {item.status === "pending" && <Button size="sm" variant="outline" onClick={() => handleStartStep(item.id, item.run?.id)} disabled={startStep.isPending}><Play className="mr-2 h-4 w-4" />Start</Button>}
                          {item.status === "in_progress" && (
                            <>
                              <Button size="sm" onClick={() => handleCompleteStep(item.id, item.run?.id)} disabled={completeStep.isPending}><Check className="mr-2 h-4 w-4" />Complete</Button>
                              {item.step?.step_type === "approval_step" && <Button size="sm" variant="destructive" onClick={() => handleRejectStep(item.id, item.run?.id)} disabled={rejectStep.isPending}><X className="mr-2 h-4 w-4" />Reject</Button>}
                            </>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/app/workflows/runs/${item.run?.id}`)}>View Run<ChevronRight className="ml-1 h-4 w-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={Check} title="No pending work" description="You're all caught up! No workflow tasks or approvals waiting for you." />
          )}
        </TabsContent>
        <TabsContent value="submissions" className="mt-6">
          {submissionsLoading ? (
            <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : submissions && submissions.length > 0 ? (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <Card key={submission.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/app/workflows/submissions/${submission.id}`)}>
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{(submission.form as { title: string } | null)?.title || "Form Submission"}</CardTitle>
                        <CardDescription>Submitted {formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{submission.status}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={Clock} title="No submissions" description="You haven't submitted any forms yet." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
