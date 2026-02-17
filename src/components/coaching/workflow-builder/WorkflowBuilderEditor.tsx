import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  useOrgWorkflow, 
  useOrgWorkflowMutations,
  OrgWorkflowStep 
} from "@/hooks/useOrgWorkflows";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { supabase } from "@/integrations/supabase/client";
import { useAiReadiness } from "@/hooks/useAiReadiness";
import { FormBaseKeySelector } from "@/components/forms/FormBaseKeySelector";
import { FormPreview } from "@/components/forms/FormLauncher";
import { 
  ArrowLeft, 
  GripVertical, 
  Lock, 
  Unlock,
  Edit,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  Sparkles,
  FileText,
  CheckSquare,
  Calendar,
  StickyNote,
  Flag,
} from "lucide-react";

interface WorkflowBuilderEditorProps {
  workflowId: string;
  coachingOrgId: string;
  onBack: () => void;
}

// Get the base key from either the new field or extract from legacy template key
function getStepBaseKey(step: OrgWorkflowStep): string | null {
  if (step.attached_form_base_key) {
    return step.attached_form_base_key;
  }
  // Extract from legacy template key
  if (step.attached_form_template_key) {
    const prefixes = ["generic_", "convene_", "c12_", "eos_"];
    for (const prefix of prefixes) {
      if (step.attached_form_template_key.startsWith(prefix)) {
        return step.attached_form_template_key.slice(prefix.length);
      }
    }
    return step.attached_form_template_key;
  }
  return null;
}

const STEP_TYPE_ICONS: Record<string, React.ReactNode> = {
  task: <CheckSquare className="h-4 w-4" />,
  form: <FileText className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
  note: <StickyNote className="h-4 w-4" />,
  milestone: <Flag className="h-4 w-4" />,
};

const ASSIGNEE_OPTIONS = [
  { value: "unassigned", label: "Unassigned" },
  { value: "org_admin", label: "Org Admin" },
  { value: "manager", label: "Manager" },
  { value: "coach", label: "Coach" },
  { value: "member", label: "Member" },
  { value: "member_admin", label: "Member Admin" },
  { value: "member_user", label: "Member User" },
];

interface AiDraftStep {
  step_type: string;
  title: string;
  instructions?: string;
  assignee_type: string;
  due_offset_days?: number;
}

interface AiWorkflowDraft {
  title: string;
  description: string;
  trigger_type: string;
  steps: AiDraftStep[];
}

function mapAiStepTypeToOrgStepType(stepType: string): "task" | "form" | "meeting" | "note" | "milestone" {
  const normalized = stepType.trim().toLowerCase();
  if (normalized.includes("form")) return "form";
  if (normalized.includes("calendar") || normalized.includes("meeting")) return "meeting";
  if (normalized.includes("note")) return "note";
  if (normalized.includes("milestone") || normalized.includes("project")) return "milestone";
  return "task";
}

function mapAiAssigneeToOrgAssignee(
  assigneeType: string,
): "coach" | "manager" | "member" | "member_admin" | "member_user" | "org_admin" | "unassigned" {
  const normalized = assigneeType.trim().toLowerCase();
  if (normalized === "coach") return "coach";
  if (normalized === "manager") return "manager";
  if (normalized === "member") return "member";
  if (normalized === "member_admin") return "member_admin";
  if (normalized === "member_user") return "member_user";
  if (normalized === "org_admin" || normalized === "company_admin") return "org_admin";
  return "unassigned";
}

function parseAiWorkflowDraft(value: unknown): AiWorkflowDraft {
  if (!value || typeof value !== "object") {
    throw new Error("AI returned an invalid draft payload");
  }
  const draft = value as Record<string, unknown>;
  if (typeof draft.title !== "string" || !draft.title.trim()) {
    throw new Error("AI draft is missing a valid title");
  }
  if (typeof draft.description !== "string") {
    throw new Error("AI draft is missing a valid description");
  }
  if (typeof draft.trigger_type !== "string") {
    throw new Error("AI draft is missing a valid trigger_type");
  }
  if (!Array.isArray(draft.steps) || draft.steps.length === 0) {
    throw new Error("AI draft must include at least one step");
  }

  const steps = draft.steps.map((step, index) => {
    if (!step || typeof step !== "object") {
      throw new Error(`AI draft step ${index + 1} is invalid`);
    }
    const s = step as Record<string, unknown>;
    if (typeof s.step_type !== "string" || typeof s.title !== "string" || typeof s.assignee_type !== "string") {
      throw new Error(`AI draft step ${index + 1} is missing required fields`);
    }
    return {
      step_type: s.step_type,
      title: s.title,
      instructions: typeof s.instructions === "string" ? s.instructions : undefined,
      assignee_type: s.assignee_type,
      due_offset_days: typeof s.due_offset_days === "number" ? s.due_offset_days : undefined,
    };
  });

  return {
    title: draft.title,
    description: draft.description,
    trigger_type: draft.trigger_type,
    steps,
  };
}

export function WorkflowBuilderEditor({ 
  workflowId, 
  coachingOrgId,
  onBack 
}: WorkflowBuilderEditorProps) {
  const { activeCompanyId } = useActiveCompany();
  const { data, isLoading } = useOrgWorkflow(workflowId);
  const mutations = useOrgWorkflowMutations(coachingOrgId);
  
  const [editingStep, setEditingStep] = React.useState<OrgWorkflowStep | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = React.useState(false);
  const [localSteps, setLocalSteps] = React.useState<OrgWorkflowStep[]>([]);
  const [hasReordered, setHasReordered] = React.useState(false);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [showAiDialog, setShowAiDialog] = React.useState(false);
  const [aiPrompt, setAiPrompt] = React.useState("");
  const [aiDraft, setAiDraft] = React.useState<AiWorkflowDraft | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = React.useState(false);
  const aiReadiness = useAiReadiness("workflow_copilot", showAiDialog);
  
  // Sync local steps with fetched data
  React.useEffect(() => {
    if (data?.steps) {
      setLocalSteps(data.steps);
      setHasReordered(false);
    }
  }, [data?.steps]);
  
  const workflow = data?.workflow;
  const isLocked = workflow?.is_locked ?? false;
  const canEditSteps = workflow?.editable_fields?.includes("steps") ?? false;
  
  const handleDragStart = (index: number) => {
    if (isLocked) return;
    setDraggedIndex(index);
  };
  
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index || isLocked) return;
    
    const newSteps = [...localSteps];
    const draggedStep = newSteps[draggedIndex];
    newSteps.splice(draggedIndex, 1);
    newSteps.splice(index, 0, draggedStep);
    
    setLocalSteps(newSteps);
    setDraggedIndex(index);
    setHasReordered(true);
  };
  
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };
  
  const handleSaveOrder = async () => {
    const stepIds = localSteps.map((s) => s.id);
    await mutations.reorderSteps.mutateAsync({ workflowId, stepIds });
    setHasReordered(false);
  };
  
  const handleToggleDisabled = async (step: OrgWorkflowStep) => {
    if (isLocked) return;
    await mutations.updateStep.mutateAsync({
      stepId: step.id,
      updates: { is_disabled: !step.is_disabled },
    });
  };
  
  const handleToggleOptional = async (step: OrgWorkflowStep) => {
    if (isLocked) return;
    await mutations.updateStep.mutateAsync({
      stepId: step.id,
      updates: { is_optional: !step.is_optional },
    });
  };
  
  const handleSaveStep = async (updates: {
    title?: string;
    description?: string | null;
    is_optional?: boolean;
    is_disabled?: boolean;
    attached_form_base_key?: string | null;
    default_assignee?: "coach" | "manager" | "member" | "member_admin" | "member_user" | "org_admin" | "unassigned";
    due_offset_days?: number | null;
    cadence_days?: number | null;
    step_order?: number;
  }) => {
    if (!editingStep) return;
    await mutations.updateStep.mutateAsync({
      stepId: editingStep.id,
      updates,
    });
    setEditingStep(null);
  };
  
  const handleRestore = async () => {
    await mutations.restoreFromPack.mutateAsync({ workflowId });
    setShowRestoreDialog(false);
  };

  const handleGenerateAiDraft = async () => {
    if (!workflow) return;
    if (!activeCompanyId) {
      toast.error("Select an active company before using AI generation");
      return;
    }
    if (!aiPrompt.trim()) {
      toast.error("Enter a prompt describing the workflow you want");
      return;
    }
    if (aiReadiness.data && !aiReadiness.data.available) {
      toast.error(aiReadiness.data.reason);
      return;
    }

    setIsGeneratingAi(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("ai-gateway", {
        body: {
          companyId: activeCompanyId,
          taskType: "workflow_copilot",
          userPrompt: aiPrompt.trim(),
          context: {
            workflowType: workflow.workflow_type,
            allowedStepTypes: ["task", "form", "meeting", "note", "milestone"],
            allowedAssignees: ASSIGNEE_OPTIONS.map((option) => option.value),
            currentWorkflow: {
              name: workflow.name,
              description: workflow.description,
              stepCount: localSteps.length,
              steps: localSteps.map((step) => ({
                title: step.title,
                step_type: step.step_type,
                assignee: step.default_assignee,
                due_offset_days: step.due_offset_days,
              })),
            },
          },
        },
      });

      if (error) throw error;
      const outputJson = (response as { outputJson?: unknown } | null)?.outputJson;
      if (!outputJson) {
        throw new Error("AI response did not include structured output");
      }

      const parsed = parseAiWorkflowDraft(outputJson);
      setAiDraft(parsed);
      toast.success("AI draft generated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate AI draft";
      toast.error(message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleApplyAiDraft = async () => {
    if (!aiDraft) return;

    await mutations.replaceWorkflowFromAi.mutateAsync({
      workflowId,
      workflow: {
        name: aiDraft.title.trim(),
        description: aiDraft.description.trim() || null,
      },
      steps: aiDraft.steps.map((step) => ({
        step_type: mapAiStepTypeToOrgStepType(step.step_type),
        title: step.title.trim(),
        description: step.instructions?.trim() || null,
        default_assignee: mapAiAssigneeToOrgAssignee(step.assignee_type),
        due_offset_days: typeof step.due_offset_days === "number" ? Math.max(0, Math.floor(step.due_offset_days)) : null,
      })),
    });

    setShowAiDialog(false);
    setAiDraft(null);
    setAiPrompt("");
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40" />
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
    );
  }
  
  if (!workflow) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Workflow not found</p>
        <Button variant="link" onClick={onBack}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{workflow.name}</h2>
            {isLocked ? (
              <Badge variant="secondary">
                <Lock className="mr-1 h-3 w-3" />
                Locked
              </Badge>
            ) : (
              <Badge variant="outline">
                <Unlock className="mr-1 h-3 w-3" />
                Editable
              </Badge>
            )}
            <Badge variant="outline">{workflow.source_pack_key}</Badge>
          </div>
          {workflow.description && (
            <p className="text-sm text-muted-foreground mt-1">{workflow.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAiDialog(true)}
            disabled={isLocked || !canEditSteps}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate with AI
          </Button>
          {workflow.source_pack_template_id && (
            <Button 
              variant="outline" 
              onClick={() => setShowRestoreDialog(true)}
              disabled={mutations.restoreFromPack.isPending}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore Default
            </Button>
          )}
          {hasReordered && (
            <Button 
              onClick={handleSaveOrder}
              disabled={mutations.reorderSteps.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Order
            </Button>
          )}
        </div>
      </div>
      
      {/* Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow Steps</CardTitle>
          <CardDescription>
            {isLocked 
              ? "This workflow is locked and steps cannot be modified."
              : "Drag to reorder, toggle optional/disabled, or edit step details."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {localSteps.map((step, index) => (
              <div
                key={step.id}
                draggable={!isLocked}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border bg-card
                  ${!isLocked ? "cursor-move" : ""}
                  ${step.is_disabled ? "opacity-50 bg-muted/50" : ""}
                  ${draggedIndex === index ? "ring-2 ring-primary" : ""}
                `}
              >
                {/* Drag Handle */}
                <div className={`${isLocked ? "text-muted-foreground/30" : "text-muted-foreground"}`}>
                  <GripVertical className="h-4 w-4" />
                </div>
                
                {/* Step Order */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
                
                {/* Step Type Icon */}
                <div className="text-muted-foreground">
                  {STEP_TYPE_ICONS[step.step_type] || <CheckSquare className="h-4 w-4" />}
                </div>
                
                {/* Step Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${step.is_disabled ? "line-through" : ""}`}>
                      {step.title}
                    </span>
                    {step.is_optional && (
                      <Badge variant="outline" className="text-xs">Optional</Badge>
                    )}
                    {getStepBaseKey(step) && (
                      <FormPreview baseKey={getStepBaseKey(step)!} coachingOrgId={coachingOrgId} />
                    )}
                  </div>
                  {step.description && (
                    <p className="text-sm text-muted-foreground truncate">{step.description}</p>
                  )}
                </div>
                
                {/* Assignee */}
                <Badge variant="outline" className="text-xs capitalize">
                  {step.default_assignee.replace("_", " ")}
                </Badge>
                
                {/* Actions */}
                {!isLocked && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggleOptional(step)}
                      title={step.is_optional ? "Make required" : "Make optional"}
                    >
                      {step.is_optional ? (
                        <CheckSquare className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <CheckSquare className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggleDisabled(step)}
                      title={step.is_disabled ? "Enable step" : "Disable step"}
                    >
                      {step.is_disabled ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingStep(step)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Edit Step Dialog */}
      <StepEditDialog
        step={editingStep}
        coachingOrgId={coachingOrgId}
        onClose={() => setEditingStep(null)}
        onSave={handleSaveStep}
        isPending={mutations.updateStep.isPending}
      />

      {/* AI Generate Dialog */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Workflow Draft with AI</DialogTitle>
            <DialogDescription>
              Describe the workflow outcome and AI will draft steps you can apply to this template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {aiReadiness.data && (
              <Alert variant={aiReadiness.data.available ? "default" : "destructive"}>
                <AlertTitle>
                  {aiReadiness.data.available ? "AI Ready" : "AI Blocked"}
                </AlertTitle>
                <AlertDescription>
                  {aiReadiness.data.reason}
                  {aiReadiness.data.dailyUsed !== null && aiReadiness.data.dailyBudget !== null && (
                    <span className="block mt-1">
                      Daily usage: {aiReadiness.data.dailyUsed.toLocaleString()} / {aiReadiness.data.dailyBudget.toLocaleString()} tokens
                    </span>
                  )}
                  {aiReadiness.data.monthlyUsed !== null && aiReadiness.data.monthlyBudget !== null && (
                    <span className="block">
                      Monthly usage: {aiReadiness.data.monthlyUsed.toLocaleString()} / {aiReadiness.data.monthlyBudget.toLocaleString()} tokens
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="aiPrompt">Prompt</Label>
              <Textarea
                id="aiPrompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Example: Build a quarterly client health-check workflow with prep form, review meeting, and follow-up tasks."
                rows={4}
              />
            </div>

            {aiDraft && (
              <div className="rounded-md border p-3 space-y-2">
                <p className="font-medium">{aiDraft.title}</p>
                {aiDraft.description && (
                  <p className="text-sm text-muted-foreground">{aiDraft.description}</p>
                )}
                <div className="space-y-1">
                  {aiDraft.steps.map((step, index) => (
                    <div key={`${step.title}-${index}`} className="text-sm">
                      {index + 1}. {step.title} ({mapAiStepTypeToOrgStepType(step.step_type)})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleGenerateAiDraft}
              disabled={isGeneratingAi || !aiPrompt.trim() || aiReadiness.isLoading || (aiReadiness.data ? !aiReadiness.data.available : false)}
            >
              {isGeneratingAi ? "Generating..." : aiReadiness.isLoading ? "Checking..." : "Generate Draft"}
            </Button>
            <Button
              onClick={handleApplyAiDraft}
              disabled={!aiDraft || mutations.replaceWorkflowFromAi.isPending}
            >
              {mutations.replaceWorkflowFromAi.isPending ? "Applying..." : "Apply Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Restore Confirmation */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore to Pack Default?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset "{workflow.name}" to its original pack template, 
              discarding all customizations including step order, titles, and settings.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRestore}
              disabled={mutations.restoreFromPack.isPending}
            >
              {mutations.restoreFromPack.isPending ? "Restoring..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface StepEditDialogProps {
  step: OrgWorkflowStep | null;
  coachingOrgId: string;
  onClose: () => void;
  onSave: (updates: {
    title?: string;
    description?: string | null;
    attached_form_base_key?: string | null;
    default_assignee?: "coach" | "manager" | "member" | "member_admin" | "member_user" | "org_admin" | "unassigned";
    due_offset_days?: number | null;
  }) => void;
  isPending: boolean;
}

function StepEditDialog({ step, coachingOrgId, onClose, onSave, isPending }: StepEditDialogProps) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [assignee, setAssignee] = React.useState("unassigned");
  const [formBaseKey, setFormBaseKey] = React.useState<string | null>(null);
  const [dueOffset, setDueOffset] = React.useState("");
  
  React.useEffect(() => {
    if (step) {
      setTitle(step.title);
      setDescription(step.description || "");
      setAssignee(step.default_assignee);
      setFormBaseKey(getStepBaseKey(step));
      setDueOffset(step.due_offset_days?.toString() || "");
    }
  }, [step]);
  
  const handleSave = () => {
    const validAssignee = assignee as "coach" | "manager" | "member" | "member_admin" | "member_user" | "org_admin" | "unassigned";
    onSave({
      title,
      description: description || null,
      default_assignee: validAssignee,
      attached_form_base_key: formBaseKey,
      due_offset_days: dueOffset ? parseInt(dueOffset) : null,
    });
  };
  
  return (
    <Dialog open={!!step} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Step</DialogTitle>
          <DialogDescription>
            Customize this workflow step's details.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Step title"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Step description"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="assignee">Default Assignee</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNEE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {step?.step_type === "form" && (
            <div className="space-y-2">
              <Label>Attached Form (Base Key)</Label>
              <FormBaseKeySelector
                value={formBaseKey}
                onChange={setFormBaseKey}
                coachingOrgId={coachingOrgId}
                placeholder="Select a form..."
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="dueOffset">Due Offset (days)</Label>
            <Input
              id="dueOffset"
              type="number"
              value={dueOffset}
              onChange={(e) => setDueOffset(e.target.value)}
              placeholder="Days after step creation"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending || !title}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
