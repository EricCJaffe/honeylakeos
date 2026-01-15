import * as React from "react";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle2, Pencil, Trash2, Calendar, Flag, Clock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TaskFormDialog } from "./TaskFormDialog";
import { EntityLinksPanel } from "@/components/EntityLinksPanel";

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

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { isCompanyAdmin } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      if (!taskId) return null;
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          project:projects(id, name, emoji),
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
        backHref="/app/tasks"
      >
        {canEdit && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFormDialogOpen(true)}
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

      <div className="flex items-center gap-3 mb-6">
        <Checkbox
          checked={task.status === "done"}
          onCheckedChange={() => toggleStatus.mutate()}
          className="h-5 w-5"
        />
        <Badge className={priority.color}>{priority.label}</Badge>
        <Badge className={status.color}>{status.label}</Badge>
        {task.project && (
          <Badge variant="outline">
            {task.project.emoji} {task.project.name}
          </Badge>
        )}
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
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            )}

            <div className="space-y-2 text-sm">
              {task.due_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Due {format(new Date(task.due_date), "MMM d, yyyy")}</span>
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
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {task.notes ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {task.notes}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No notes</p>
            )}
          </CardContent>
        </Card>
      </div>

      <TaskFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        task={task}
      />
    </div>
  );
}
