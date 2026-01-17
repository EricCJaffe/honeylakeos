import { useNavigate } from "react-router-dom";
import { Check, Clock, AlertCircle, X, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useMyWfWorkItems, useWfStepRunMutations } from "@/hooks/useWorkflows";
import { useMyWfSubmissions } from "@/hooks/useWorkflowForms";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export default function MyWorkPage() {
  const navigate = useNavigate();
  const { data: workItems, isLoading: workItemsLoading } = useMyWfWorkItems();
  const { data: submissions, isLoading: submissionsLoading } = useMyWfSubmissions();
  const { completeStep, rejectStep, startStep } = useWfStepRunMutations();

  const handleStartStep = async (stepRunId: string) => {
    await startStep.mutateAsync(stepRunId);
  };

  const handleCompleteStep = async (stepRunId: string) => {
    await completeStep.mutateAsync({ stepRunId });
  };

  const handleRejectStep = async (stepRunId: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (reason) {
      await rejectStep.mutateAsync({ stepRunId, notes: reason });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "in_progress":
        return <Play className="h-4 w-4 text-blue-500" />;
      case "completed":
        return <Check className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Work"
        description="Your pending workflow tasks and approvals"
      />

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">
            Workflow Tasks {workItems && workItems.length > 0 && `(${workItems.length})`}
          </TabsTrigger>
          <TabsTrigger value="submissions">
            My Submissions {submissions && submissions.length > 0 && `(${submissions.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-6">
          {workItemsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : workItems && workItems.length > 0 ? (
            <div className="space-y-4">
              {workItems.map((item) => {
                const step = item.step as { title: string; step_type: string; instructions?: string } | null;
                const run = item.run as { workflow: { title: string } | null } | null;

                return (
                  <Card key={item.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            {step?.title || "Workflow Step"}
                          </CardTitle>
                          <CardDescription>
                            {run?.workflow?.title || "Workflow"} •{" "}
                            {STEP_TYPE_LABELS[step?.step_type ?? ""] || step?.step_type}
                          </CardDescription>
                        </div>
                        <Badge variant={item.status === "in_progress" ? "default" : "secondary"}>
                          {item.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {step?.instructions && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {step.instructions}
                        </p>
                      )}
                      <div className="flex gap-2">
                        {item.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartStep(item.id)}
                            disabled={startStep.isPending}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Start
                          </Button>
                        )}
                        {item.status === "in_progress" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleCompleteStep(item.id)}
                              disabled={completeStep.isPending}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Complete
                            </Button>
                            {step?.step_type === "approval_step" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectStep(item.id)}
                                disabled={rejectStep.isPending}
                              >
                                <X className="mr-2 h-4 w-4" />
                                Reject
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Check}
              title="No pending work"
              description="You're all caught up! No workflow tasks or approvals waiting for you."
            />
          )}
        </TabsContent>

        <TabsContent value="submissions" className="mt-6">
          {submissionsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : submissions && submissions.length > 0 ? (
            <div className="space-y-4">
              {submissions.map((submission) => {
                const form = submission.form as { title: string } | null;

                return (
                  <Card
                    key={submission.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/app/workflows/submissions/${submission.id}`)}
                  >
                    <CardHeader className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">
                            {form?.title || "Form Submission"}
                          </CardTitle>
                          <CardDescription>
                            Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge>{submission.status}</Badge>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Clock}
              title="No submissions"
              description="You haven't submitted any forms yet."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
