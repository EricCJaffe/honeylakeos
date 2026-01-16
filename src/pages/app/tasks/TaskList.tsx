import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CheckCircle2, Circle, MoreHorizontal, Pencil, Calendar, Repeat, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { rruleToConfig } from "@/components/tasks/RecurrenceSelector";

interface TaskListProps {
  tasks: any[];
  projectId?: string;
  onAddTask?: () => void;
  onEditTask?: (task: any) => void;
  showProject?: boolean;
  showPhase?: boolean;
  showRecurrence?: boolean;
}

export function TaskList({
  tasks,
  projectId,
  onAddTask,
  onEditTask,
  showProject = false,
  showPhase = false,
  showRecurrence = false,
}: TaskListProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const toggleStatus = useMutation({
    mutationFn: async ({ taskId, currentStatus }: { taskId: string; currentStatus: string }) => {
      const newStatus = currentStatus === "done" ? "to_do" : "done";
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-tasks"] });
    },
    onError: () => {
      toast.error("Failed to update task");
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getRecurrenceLabel = (task: any) => {
    if (!task.recurrence_rules) return null;
    const config = rruleToConfig(task.recurrence_rules, task.recurrence_timezone);
    if (!config || config.frequency === "none") return null;
    
    const freq = config.frequency;
    const interval = config.interval;
    
    switch (freq) {
      case "daily":
        return interval === 1 ? "Daily" : `Every ${interval} days`;
      case "weekly":
        return interval === 1 ? "Weekly" : `Every ${interval} weeks`;
      case "monthly":
        return interval === 1 ? "Monthly" : `Every ${interval} months`;
      case "yearly":
        return interval === 1 ? "Yearly" : `Every ${interval} years`;
      default:
        return "Recurring";
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="py-12">
        <EmptyState
          icon={CheckCircle2}
          title="No tasks yet"
          description="Create a task to get started."
          actionLabel={onAddTask ? "Add Task" : undefined}
          onAction={onAddTask}
        />
      </div>
    );
  }

  // Group tasks by status
  const todoTasks = tasks.filter((t) => t.status === "to_do");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const doneTasks = tasks.filter((t) => t.status === "done");

  const renderTaskGroup = (groupTasks: any[], label: string) => {
    if (groupTasks.length === 0) return null;

    return (
      <div className="mb-4 last:mb-0">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2 border-b">
          {label} ({groupTasks.length})
        </h4>
        <div>
          {groupTasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors group cursor-pointer",
                task.status === "done" && "opacity-60"
              )}
              onClick={() => navigate(`/app/tasks/${task.id}`)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!task.is_recurring_template) {
                    toggleStatus.mutate({ taskId: task.id, currentStatus: task.status });
                  }
                }}
                className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                disabled={task.is_recurring_template}
              >
                {task.status === "done" ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium truncate",
                      task.status === "done" && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </span>
                  {task.is_recurring_template && (
                    <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {showProject && task.project && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {task.project.emoji} {task.project.name}
                    </span>
                  )}
                  {showPhase && task.phase && (
                    <Badge variant="outline" className="text-xs py-0 h-5">
                      <Layers className="h-3 w-3 mr-1" />
                      {task.phase.name}
                    </Badge>
                  )}
                  {task.due_date && !task.is_recurring_template && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(task.due_date), "MMM d")}
                    </span>
                  )}
                  {showRecurrence && task.is_recurring_template && (
                    <Badge variant="secondary" className="text-xs py-0 h-5">
                      <Repeat className="h-3 w-3 mr-1" />
                      {getRecurrenceLabel(task)}
                    </Badge>
                  )}
                </div>
              </div>

              <Badge variant="secondary" className={cn("shrink-0", getPriorityColor(task.priority))}>
                {task.priority}
              </Badge>

              {onEditTask && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onEditTask(task);
                    }}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderTaskGroup(todoTasks, "To Do")}
      {renderTaskGroup(inProgressTasks, "In Progress")}
      {renderTaskGroup(doneTasks, "Done")}
    </div>
  );
}
