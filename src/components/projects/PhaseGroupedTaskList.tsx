import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, Calendar, Repeat, MoreHorizontal, Pencil, FolderOpen } from "lucide-react";
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
import { useProjectPhases, ProjectPhase } from "@/hooks/useProjectPhases";
import { ensureArray, safeFormatDate } from "@/core/runtime/safety";
import type { TaskListItem } from "@/pages/app/tasks/TaskList";

type ProjectTaskItem = TaskListItem & {
  phase_id?: string | null;
};

interface PhaseGroupedTaskListProps {
  tasks: ProjectTaskItem[];
  projectId: string;
  onAddTask?: () => void;
  onEditTask?: (task: ProjectTaskItem) => void;
}

export function PhaseGroupedTaskList({
  tasks,
  projectId,
  onAddTask,
  onEditTask,
}: PhaseGroupedTaskListProps) {
  const { data: phases = [] } = useProjectPhases(projectId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Ensure tasks is always an array to prevent .map errors
  const safeTasks = ensureArray<ProjectTaskItem>(tasks);

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
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
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

  if (safeTasks.length === 0) {
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

  // Group tasks by phase
  const activePhases = phases.filter((p) => p.status === "active");
  const tasksByPhase: Record<string, ProjectTaskItem[]> = {};
  const unassignedTasks: ProjectTaskItem[] = [];

  safeTasks.forEach((task) => {
    if (task.phase_id) {
      if (!tasksByPhase[task.phase_id]) {
        tasksByPhase[task.phase_id] = [];
      }
      tasksByPhase[task.phase_id].push(task);
    } else {
      unassignedTasks.push(task);
    }
  });

  const renderTask = (task: ProjectTaskItem) => (
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
          toggleStatus.mutate({ taskId: task.id, currentStatus: task.status });
        }}
        className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
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
        {task.due_date && (
          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Calendar className="h-3 w-3" />
            {safeFormatDate(task.due_date, "MMM d")}
          </span>
        )}
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
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEditTask(task);
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  const renderPhaseGroup = (phase: ProjectPhase, phaseTasks: ProjectTaskItem[]) => {
    // Ensure phaseTasks is always an array to prevent .filter and .map errors
    const safePhaseTasks = ensureArray<ProjectTaskItem>(phaseTasks);
    const completedCount = safePhaseTasks.filter((t) => t.status === "done").length;
    
    return (
      <div key={phase.id} className="mb-4 last:mb-0">
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            {phase.name}
          </h4>
          <Badge variant="secondary" className="text-xs">
            {completedCount}/{safePhaseTasks.length}
          </Badge>
        </div>
        <div>{safePhaseTasks.map(renderTask)}</div>
      </div>
    );
  };

  // If no phases exist, show simple grouped by status
  if (activePhases.length === 0) {
    const todoTasks = safeTasks.filter((t) => t.status === "to_do");
    const inProgressTasks = safeTasks.filter((t) => t.status === "in_progress");
    const doneTasks = safeTasks.filter((t) => t.status === "done");

    const renderStatusGroup = (groupTasks: ProjectTaskItem[], label: string) => {
      // Ensure groupTasks is always an array to prevent .length and .map errors
      const safeGroupTasks = ensureArray<ProjectTaskItem>(groupTasks);
      if (safeGroupTasks.length === 0) return null;
      return (
        <div className="mb-4 last:mb-0">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2 border-b">
            {label} ({safeGroupTasks.length})
          </h4>
          <div>{safeGroupTasks.map(renderTask)}</div>
        </div>
      );
    };

    return (
      <div>
        {renderStatusGroup(todoTasks, "To Do")}
        {renderStatusGroup(inProgressTasks, "In Progress")}
        {renderStatusGroup(doneTasks, "Done")}
      </div>
    );
  }

  // Render phases with their tasks
  return (
    <div>
      {activePhases.map((phase) => {
        const phaseTasks = tasksByPhase[phase.id] || [];
        if (phaseTasks.length === 0) {
          return (
            <div key={phase.id} className="mb-4 last:mb-0">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  {phase.name}
                </h4>
                <Badge variant="secondary" className="text-xs">0</Badge>
              </div>
              <p className="text-sm text-muted-foreground text-center py-4">No tasks in this phase</p>
            </div>
          );
        }
        return renderPhaseGroup(phase, phaseTasks);
      })}

      {/* Unassigned tasks */}
      {unassignedTasks.length > 0 && (
        <div className="mb-4 last:mb-0">
          <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
            <h4 className="text-sm font-medium text-muted-foreground">Unassigned</h4>
            <Badge variant="outline" className="text-xs">{unassignedTasks.length}</Badge>
          </div>
          <div>{unassignedTasks.map(renderTask)}</div>
        </div>
      )}
    </div>
  );
}
