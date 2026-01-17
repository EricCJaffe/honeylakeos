import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ArrowRight, User, Users, Building2 } from "lucide-react";
import type { WfWorkflow, WfWorkflowStep } from "@/hooks/useWorkflows";

interface WorkflowPreviewPanelProps {
  workflow: WfWorkflow;
  steps: WfWorkflowStep[];
  onClose: () => void;
}

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

const ASSIGNEE_ICONS: Record<string, React.ReactNode> = {
  workflow_initiator: <User className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
  employee: <User className="h-4 w-4" />,
  group: <Users className="h-4 w-4" />,
  company_admin: <Building2 className="h-4 w-4" />,
};

const ASSIGNEE_LABELS: Record<string, string> = {
  workflow_initiator: "Workflow Initiator",
  user: "Specific User",
  employee: "Target Employee",
  group: "Group Members",
  company_admin: "Company Admin",
};

export function WorkflowPreviewPanel({
  workflow,
  steps,
  onClose,
}: WorkflowPreviewPanelProps) {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{workflow.title} — Simulation Preview</CardTitle>
          <CardDescription className="mt-2">
            This preview shows how the workflow will execute. No actual run is created.
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {/* Trigger Info */}
        <div className="mb-6 p-4 rounded-lg bg-muted/50">
          <p className="text-sm font-medium text-muted-foreground">Trigger</p>
          <p className="text-lg capitalize">{workflow.trigger_type.replace("_", " ")}</p>
        </div>

        {/* Step Flow */}
        {steps.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No steps defined yet. Add steps to see the flow.
          </div>
        ) : (
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id}>
                <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{step.title}</p>
                      <Badge variant={step.enabled ? "default" : "secondary"}>
                        {step.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {STEP_TYPE_LABELS[step.step_type] || step.step_type}
                    </p>

                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        {ASSIGNEE_ICONS[step.assignee_type ?? ""] || <User className="h-4 w-4" />}
                        <span>
                          {ASSIGNEE_LABELS[step.assignee_type ?? ""] || step.assignee_type || "Unassigned"}
                        </span>
                      </div>
                      {step.due_days_offset && (
                        <div className="text-muted-foreground">
                          Due in {step.due_days_offset} days
                        </div>
                      )}
                    </div>

                    {step.instructions && (
                      <p className="mt-3 text-sm text-muted-foreground border-t pt-3">
                        {step.instructions}
                      </p>
                    )}
                  </div>
                </div>

                {/* Arrow between steps */}
                {index < steps.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Completion */}
        {steps.length > 0 && (
          <div className="mt-6 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Workflow Complete
            </p>
            <p className="text-sm text-green-600 dark:text-green-500">
              All steps have been completed. The run will be marked as finished.
            </p>
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground pt-6">
          This is a preview simulation. No actual workflow run is created.
        </div>
      </CardContent>
    </Card>
  );
}
