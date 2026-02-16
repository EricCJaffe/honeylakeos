import { useState, Suspense, lazy } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle2, Pencil, Trash2, Calendar, Clock, User, Repeat, Layers, ChevronDown, ChevronUp, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TaskFormDialog } from "./TaskFormDialog";
import { EntityLinksPanel } from "@/components/EntityLinksPanel";
import { RecurringTaskOccurrences } from "@/components/tasks/RecurringTaskOccurrences";
import { TaskComments } from "@/components/tasks/TaskComments";
import { TaskLinkedNotes } from "@/components/tasks/TaskLinkedNotes";
import { SubtasksList } from "@/components/tasks/SubtasksList";
import { AttachmentsPanel } from "@/components/attachments";
import { useTaskOccurrenceActions } from "@/hooks/useTaskOccurrenceCompletions";
import { configToRRule, rruleToConfig } from "@/components/tasks/RecurrenceSelector";
import { TaskTagsDisplay } from "@/components/tasks/TaskTagInput";

// Lazy load rich text display
const RichTextDisplay = lazy(() => import("@/components/ui/rich-text-editor").then(m => ({ default: m.RichTextDisplay })));

const priorityConfig = {
  low: { label: "Low", color: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", color: "bg-yellow-500/10 text-yellow-600" },
  high: { label: "High", color: "bg-orange-500/10 text-orange-600" },
  urgent: { label: "Urgent", color: "bg-destructive/10 text-destructive" },
};

const statusConfig = {
  to_do: { label: "To Do", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", color: "bg-blue-500/10 text-blue-600" },
  done: { label: "Done", color: "bg-green-500/10 text-green-600" },
  blocked: { label: "Blocked", color: "bg-destructive/10 text-destructive" },
};

const safeFormatDate = (value: string | null | undefined, pattern: string) => {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return format(dt, pattern);
};

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { isCompanyAdmin } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<"single" | "series">("series");
  const [occurrenceToEdit, setOccurrenceToEdit] = useState<Date | null>(null);
  const [showLegacyNotes, setShowLegacyNotes] = useState(false);
  const { splitSeries } = useTaskOccurrenceActions();

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      if (!taskId) return null;
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          project:projects(id, name, emoji),
          phase:project_phases(id, name),
          task_assignees(user_id)
        `)
        .eq("id", taskId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });

  const toggleStatus = useMutation({
    mutationFn: async () => {
      if (!task) throw new Error("No task");
      const newStatus = task.status === "done" ? "to_do" : "done";
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated");
    },
    onError: () => {
      toast.error("Failed to update task");
    },
  });

  const deleteTask = useMutation({
    mutationFn: async () => {
      if (!taskId) throw new Error("No task");
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task deleted");
      navigate("/app/tasks");
    },
    onError: () => {
      toast.error("Failed to delete task");
    },
  });

  // Handle "edit this and future" for recurring tasks
  const handleEditFuture = async (occurrenceDate: Date) => {
    if (!task?.recurrence_rules) return;
    
    // Get current config
    const config = rruleToConfig(task.recurrence_rules, task.recurrence_timezone);
    if (!config) return;

    // Create new RRULE starting from the occurrence date
    const newRRule = configToRRule(config, occurrenceDate);
    if (!newRRule) return;

    await splitSeries.mutateAsync({
      seriesTaskId: task.id,
      occurrenceStartAt: occurrenceDate,
      newRRule,
    });
  };

  const canEdit = task && (isCompanyAdmin || task.created_by === user?.id);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-48 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6">
        <EmptyState
          icon={CheckCircle2}
          title="Task not found"
          description="This task may have been deleted or you don't have access."
        />
      </div>
    );
  }

  const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.to_do;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title={task.title}
        onBack={() => navigate(-1)}
      >
        {canEdit && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditMode("series");
                setIsFormDialogOpen(true);
              }}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteTask.mutate()}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </>
        )}
      </PageHeader>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Checkbox
          checked={task.status === "done"}
          onCheckedChange={() => toggleStatus.mutate()}
          className="h-5 w-5"
          disabled={task.is_recurring_template}
        />
        <Badge className={priority.color}>{priority.label}</Badge>
        <Badge className={status.color}>{status.label}</Badge>
        {task.is_recurring_template && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Repeat className="h-3 w-3" />
            Recurring
          </Badge>
        )}
        {task.project && (
          <Badge variant="outline">
            {task.project.emoji} {task.project.name}
          </Badge>
        )}
        {task.phase && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {task.phase.name}
          </Badge>
        )}
        {/* Tags display */}
        {task.tags && Array.isArray(task.tags) && task.tags.length > 0 && (
          <TaskTagsDisplay tags={task.tags as string[]} maxDisplay={5} />
        )}
      </div>

      {/* Recurring Task Occurrences */}
      {task.is_recurring_template && (
        <div className="mb-6">
          <RecurringTaskOccurrences 
            task={task}
            onEditOccurrence={(date) => {
              setOccurrenceToEdit(date);
              setEditMode("single");
              setIsFormDialogOpen(true);
            }}
            onEditFuture={handleEditFuture}
          />
        </div>
      )}

      {/* Subtasks */}
      <div className="mb-6">
        <SubtasksList taskId={task.id} taskStatus={task.status} />
      </div>

      {/* Links */}
      <div className="mb-6">
        <EntityLinksPanel entityType="task" entityId={task.id} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Task Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {task.description && (
              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <Suspense fallback={<div className="h-10 animate-pulse bg-muted rounded" />}>
                  <RichTextDisplay content={task.description} className="text-sm" />
                </Suspense>
              </div>
            )}

            <div className="space-y-2 text-sm">
              {task.due_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Due {safeFormatDate(task.due_date, "MMM d, yyyy") || "Invalid date"}
                  </span>
                </div>
              )}
              {task.estimated_time && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Estimated: {task.estimated_time} hours</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>
                  {task.task_assignees?.length || 0} assignee(s)
                </span>
              </div>
            </div>

            {/* Legacy Notes - Hidden behind toggle */}
            {task.notes && (
              <Collapsible open={showLegacyNotes} onOpenChange={setShowLegacyNotes}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                    <span className="text-xs">Legacy Notes</span>
                    {showLegacyNotes ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
                    <p className="text-xs text-muted-foreground mb-1">Internal Notes (legacy)</p>
                    <p className="text-sm whitespace-pre-wrap">{task.notes}</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>

        {/* Linked Notes Section */}
        <TaskLinkedNotes taskId={task.id} />
      </div>

      {/* Attachments Section */}
      <div className="mt-6">
        <AttachmentsPanel entityType="task" entityId={task.id} />
      </div>

      {/* Comments Section */}
      <div className="mt-6">
        <TaskComments taskId={task.id} />
      </div>

      <TaskFormDialog
        open={isFormDialogOpen}
        onOpenChange={(open) => {
          setIsFormDialogOpen(open);
          if (!open) {
            setEditMode("series");
            setOccurrenceToEdit(null);
          }
        }}
        task={task}
        editMode={editMode}
      />
    </div>
  );
}
