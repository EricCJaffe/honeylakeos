import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Play,
  Pause,
  Trash2,
  GripVertical,
  Pencil,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useWfWorkflow,
  useWfWorkflowSteps,
  useWfWorkflowMutations,
  useWfWorkflowStepMutations,
  useWfWorkflowStats,
  useWfWorkflowRuns,
} from "@/hooks/useWorkflows";
import { useMembership } from "@/lib/membership";
import { useAuditLog } from "@/hooks/useAuditLog";
import { WorkflowStepDialog } from "./WorkflowStepDialog";
import { WorkflowPreviewPanel } from "./WorkflowPreviewPanel";
import { StartWorkflowDialog } from "./StartWorkflowDialog";
import { DefinitionOwnershipPanel } from "@/components/workflows/DefinitionOwnershipPanel";
import { SafeEditWarning } from "@/components/workflows/SafeEditWarning";
import { useWorkflowActiveRuns } from "@/hooks/useWorkflowGovernance";
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

const ASSIGNEE_TYPE_LABELS: Record<string, string> = {
  workflow_initiator: "Workflow Initiator",
  user: "Specific User",
  employee: "Target Employee",
  group: "Group Members",
  company_admin: "Company Admin",
};

export default function WorkflowDetailPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const { isCompanyAdmin } = useMembership();
  const { log } = useAuditLog();
  const [showStepDialog, setShowStepDialog] = useState(false);
  const [editingStep, setEditingStep] = useState<WfWorkflowStep | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"builder" | "runs" | "stats">("builder");

  const { data: workflow, isLoading: workflowLoading } = useWfWorkflow(workflowId);
  const { data: steps, isLoading: stepsLoading } = useWfWorkflowSteps(workflowId);
  const { data: stats } = useWfWorkflowStats(workflowId);
  const { data: runs } = useWfWorkflowRuns({ workflowId });
  const { data: activeRunsData } = useWorkflowActiveRuns(workflowId);

  const { publishWorkflow, archiveWorkflow, deleteWorkflow, updateWorkflow } = useWfWorkflowMutations();
  const { deleteStep, reorderSteps } = useWfWorkflowStepMutations(workflowId ?? "");

  const canManage = isCompanyAdmin;
  const isDraft = workflow?.status === "draft";
  const isPublished = workflow?.status === "published";
  const hasSteps = steps && steps.length > 0;
  const hasActiveRuns = activeRunsData?.hasActiveRuns ?? false;

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
    if (!hasSteps) {
      alert("Please add at least one step before publishing.");
      return;
    }
    await publishWorkflow.mutateAsync(workflow.id);
    log("workflow.published", "workflow", workflow.id);
  };

  const handleUnpublish = async () => {
    await updateWorkflow.mutateAsync({ id: workflow.id, status: "draft", published_at: null });
    log("workflow.unpublished", "workflow", workflow.id);
  };

  const handleArchive = async () => {
    await archiveWorkflow.mutateAsync(workflow.id);
    log("workflow.archived", "workflow", workflow.id);
    navigate("/app/workflows");
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this workflow? This cannot be undone.")) {
      await deleteWorkflow.mutateAsync(workflow.id);
      log("workflow.deleted", "workflow", workflow.id);
      navigate("/app/workflows");
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (confirm("Are you sure you want to delete this step?")) {
      await deleteStep.mutateAsync(stepId);
      log("workflow.step_deleted", "workflow", workflow.id, { step_id: stepId });
    }
  };

  const handleEditStep = (step: WfWorkflowStep) => {
    setEditingStep(step);
    setShowStepDialog(true);
  };

  const handleMoveStep = async (index: number, direction: "up" | "down") => {
    if (!steps) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    const newOrder = [...steps];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    await reorderSteps.mutateAsync(newOrder.map((s) => s.id));
    log("workflow.steps_reordered", "workflow", workflow.id);
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
          <Badge variant="outline" className="capitalize">
            {workflow.trigger_type.replace("_", " ")}
          </Badge>
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="mr-2 h-4 w-4" />
            {showPreview ? "Hide Preview" : "Preview"}
          </Button>
          {canManage && isDraft && (
            <Button onClick={handlePublish} disabled={publishWorkflow.isPending || !hasSteps}>
              Publish
            </Button>
          )}
          {canManage && workflow.status === "published" && (
            <>
              <Button variant="outline" onClick={handleUnpublish} disabled={updateWorkflow.isPending}>
                Unpublish
              </Button>
              <Button onClick={() => setShowStartDialog(true)}>
                <Play className="mr-2 h-4 w-4" />
                Start Workflow
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Validation Warnings */}
      {isDraft && !hasSteps && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Add at least one step before publishing this workflow.
          </AlertDescription>
        </Alert>
      )}

      {/* Safe Editing Warning for Published Workflows */}
      <SafeEditWarning
        isPublished={isPublished}
        hasActiveRuns={hasActiveRuns}
        entityType="workflow"
      />

      {showPreview ? (
        <WorkflowPreviewPanel
          workflow={workflow}
          steps={steps ?? []}
          onClose={() => setShowPreview(false)}
        />
      ) : (
        <>
          {/* Ownership Panel */}
          <DefinitionOwnershipPanel
            ownership={{
              createdBy: workflow.created_by,
              createdAt: workflow.created_at,
              updatedAt: workflow.updated_at,
              publishedAt: workflow.published_at,
              publishedBy: (workflow as { published_by?: string }).published_by ?? null,
              scopeType: workflow.scope_type,
            }}
            className="max-w-sm"
          />

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList>
              <TabsTrigger value="builder">Workflow Builder</TabsTrigger>
              <TabsTrigger value="runs">
                Runs {runs && runs.length > 0 && `(${runs.length})`}
              </TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="builder" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Workflow Steps</CardTitle>
                    <CardDescription>
                      {isDraft
                        ? "Define the steps that make up this workflow. Use arrows to reorder."
                        : "View workflow steps. Unpublish to make changes."}
                    </CardDescription>
                  </div>
                  {canManage && isDraft && (
                    <Button
                      onClick={() => {
                        setEditingStep(null);
                        setShowStepDialog(true);
                      }}
                    >
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
                          className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <GripVertical className="h-4 w-4" />
                            <span className="text-sm font-medium w-6">{index + 1}</span>
                          </div>

                          {/* Move buttons */}
                          {canManage && isDraft && (
                            <div className="flex flex-col">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={index === 0}
                                onClick={() => handleMoveStep(index, "up")}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={index === steps.length - 1}
                                onClick={() => handleMoveStep(index, "down")}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                          )}

                          <div className="flex-1">
                            <p className="font-medium">{step.title}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{STEP_TYPE_LABELS[step.step_type] || step.step_type}</span>
                              <span>•</span>
                              <span>
                                Assigned to: {ASSIGNEE_TYPE_LABELS[step.assignee_type ?? ""] || step.assignee_type}
                              </span>
                              {step.due_days_offset && (
                                <>
                                  <span>•</span>
                                  <span>Due in {step.due_days_offset} days</span>
                                </>
                              )}
                            </div>
                          </div>

                          <Badge variant={step.enabled ? "default" : "secondary"}>
                            {step.enabled ? "Active" : "Disabled"}
                          </Badge>

                          {canManage && isDraft && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditStep(step)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteStep(step.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No steps defined yet</p>
                      {canManage && isDraft && (
                        <Button
                          variant="link"
                          className="mt-2"
                          onClick={() => {
                            setEditingStep(null);
                            setShowStepDialog(true);
                          }}
                        >
                          Add your first step
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="runs" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Runs</CardTitle>
                  <CardDescription>Recent executions of this workflow</CardDescription>
                </CardHeader>
                <CardContent>
                  {runs && runs.length > 0 ? (
                    <div className="space-y-2">
                      {runs.slice(0, 10).map((run) => (
                        <div
                          key={run.id}
                          className="flex items-center gap-4 rounded-lg border p-4 cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/app/workflows/runs/${run.id}`)}
                        >
                          <div className="flex-1">
                            <p className="font-medium">Run {run.id.slice(0, 8)}</p>
                            <p className="text-sm text-muted-foreground">
                              Started {new Date(run.started_at).toLocaleString()}
                            </p>
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
                      ))}
                      {runs.length > 10 && (
                        <Button
                          variant="link"
                          className="w-full"
                          onClick={() => navigate(`/app/workflows/runs?workflowId=${workflow.id}`)}
                        >
                          View all {runs.length} runs
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No runs yet. Start the workflow to create a run.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="mt-6">
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
            </TabsContent>
          </Tabs>

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
        </>
      )}

      <WorkflowStepDialog
        open={showStepDialog}
        onOpenChange={(open) => {
          setShowStepDialog(open);
          if (!open) setEditingStep(null);
        }}
        workflowId={workflowId ?? ""}
        step={editingStep}
      />

      <StartWorkflowDialog
        open={showStartDialog}
        onOpenChange={setShowStartDialog}
        workflowId={workflow.id}
        workflowTitle={workflow.title}
      />
    </div>
  );
}
