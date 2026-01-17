import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Play, Pause, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/PageHeader";
import {
  useWfWorkflow,
  useWfWorkflowSteps,
  useWfWorkflowMutations,
  useWfWorkflowStepMutations,
  useWfRunMutations,
  useWfWorkflowStats,
} from "@/hooks/useWorkflows";
import { useMembership } from "@/lib/membership";
import { WorkflowStepDialog } from "./WorkflowStepDialog";
import type { WfWorkflowStep } from "@/hooks/useWorkflows";

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

export default function WorkflowDetailPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const { isCompanyAdmin } = useMembership();
  const [showStepDialog, setShowStepDialog] = useState(false);
  const [editingStep, setEditingStep] = useState<WfWorkflowStep | null>(null);

  const { data: workflow, isLoading: workflowLoading } = useWfWorkflow(workflowId);
  const { data: steps, isLoading: stepsLoading } = useWfWorkflowSteps(workflowId);
  const { data: stats } = useWfWorkflowStats(workflowId);

  const { publishWorkflow, archiveWorkflow, deleteWorkflow } = useWfWorkflowMutations();
  const { deleteStep } = useWfWorkflowStepMutations(workflowId ?? "");
  const { startWorkflow } = useWfRunMutations();

  const canManage = isCompanyAdmin;

  if (workflowLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Workflow not found</p>
        <Button variant="link" onClick={() => navigate("/app/workflows")}>
          Back to Workflows
        </Button>
      </div>
    );
  }

  const handlePublish = async () => {
    await publishWorkflow.mutateAsync(workflow.id);
  };

  const handleArchive = async () => {
    await archiveWorkflow.mutateAsync(workflow.id);
    navigate("/app/workflows");
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this workflow?")) {
      await deleteWorkflow.mutateAsync(workflow.id);
      navigate("/app/workflows");
    }
  };

  const handleStartWorkflow = async () => {
    await startWorkflow.mutateAsync({ workflowId: workflow.id });
  };

  const handleDeleteStep = async (stepId: string) => {
    if (confirm("Are you sure you want to delete this step?")) {
      await deleteStep.mutateAsync(stepId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/workflows")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <PageHeader
            title={workflow.title}
            description={workflow.description || "No description"}
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={workflow.status === "published" ? "default" : "secondary"}>
            {workflow.status}
          </Badge>
          {canManage && workflow.status === "draft" && (
            <Button onClick={handlePublish} disabled={publishWorkflow.isPending}>
              Publish
            </Button>
          )}
          {workflow.status === "published" && (
            <Button onClick={handleStartWorkflow} disabled={startWorkflow.isPending}>
              <Play className="mr-2 h-4 w-4" />
              Start Workflow
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{(stats?.completionRate ?? 0).toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Completion Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats?.avgCompletionTimeMs
                ? `${Math.round(stats.avgCompletionTimeMs / 1000 / 60)} min`
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Workflow Steps</CardTitle>
            <CardDescription>
              Define the steps that make up this workflow
            </CardDescription>
          </div>
          {canManage && workflow.status === "draft" && (
            <Button onClick={() => setShowStepDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Step
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {stepsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : steps && steps.length > 0 ? (
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="flex items-center gap-4 rounded-lg border p-4"
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                    <span className="text-sm font-medium">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{step.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {STEP_TYPE_LABELS[step.step_type] || step.step_type}
                    </p>
                  </div>
                  <Badge variant={step.enabled ? "default" : "secondary"}>
                    {step.enabled ? "Active" : "Disabled"}
                  </Badge>
                  {canManage && workflow.status === "draft" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteStep(step.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No steps defined yet</p>
              {canManage && workflow.status === "draft" && (
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setShowStepDialog(true)}
                >
                  Add your first step
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            {workflow.status === "published" && (
              <Button
                variant="outline"
                onClick={handleArchive}
                disabled={archiveWorkflow.isPending}
              >
                <Pause className="mr-2 h-4 w-4" />
                Archive Workflow
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteWorkflow.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Workflow
            </Button>
          </CardContent>
        </Card>
      )}

      <WorkflowStepDialog
        open={showStepDialog}
        onOpenChange={setShowStepDialog}
        workflowId={workflowId ?? ""}
        step={editingStep}
      />
    </div>
  );
}
