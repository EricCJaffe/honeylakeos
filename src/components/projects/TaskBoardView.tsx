import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Repeat, 
  MoreHorizontal, 
  FolderOpen,
  GripVertical
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { useProjectPhases, ProjectPhase } from "@/hooks/useProjectPhases";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface TaskBoardViewProps {
  tasks: any[];
  projectId: string;
  onAddTask?: () => void;
  onEditTask?: (task: any) => void;
}

export function TaskBoardView({
  tasks,
  projectId,
  onAddTask,
  onEditTask,
}: TaskBoardViewProps) {
  const { data: phases = [] } = useProjectPhases(projectId);
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
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
    },
    onError: () => {
      toast.error("Failed to update task");
    },
  });

  const moveToPhase = useMutation({
    mutationFn: async ({ taskId, phaseId }: { taskId: string; phaseId: string | null }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ phase_id: phaseId })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      toast.success("Task moved");
    },
    onError: () => {
      toast.error("Failed to move task");
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

  if (tasks.length === 0) {
    return (
      <div className="py-12">
        <EmptyState
          icon={CheckCircle2}
          title="No tasks yet"
          description="Create a task to get started with your project."
          actionLabel={onAddTask ? "Add First Task" : undefined}
          onAction={onAddTask}
        />
      </div>
    );
  }

  // Group tasks by phase
  const activePhases = phases.filter((p) => p.status === "active");
  const tasksByPhase: Record<string, any[]> = {};
  const unassignedTasks: any[] = [];

  tasks.forEach((task) => {
    if (task.phase_id) {
      if (!tasksByPhase[task.phase_id]) {
        tasksByPhase[task.phase_id] = [];
      }
      tasksByPhase[task.phase_id].push(task);
    } else {
      unassignedTasks.push(task);
    }
  });

  const renderTaskCard = (task: any) => (
    <Card
      key={task.id}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md group",
        task.status === "done" && "opacity-60"
      )}
      onClick={() => navigate(`/app/tasks/${task.id}`)}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleStatus.mutate({ taskId: task.id, currentStatus: task.status });
            }}
            className="shrink-0 mt-0.5 text-muted-foreground hover:text-primary transition-colors"
          >
            {task.status === "done" ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "text-sm font-medium line-clamp-2",
                  task.status === "done" && "line-through text-muted-foreground"
                )}
              >
                {task.title}
              </span>
              {task.is_recurring_template && (
                <Repeat className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-2 mt-2">
              {task.due_date && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(task.due_date), "MMM d")}
                </span>
              )}
              <Badge
                variant="secondary"
                className={cn("text-[10px] px-1.5 py-0", getPriorityColor(task.priority))}
              >
                {task.priority}
              </Badge>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEditTask && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTask(task);
                  }}
                >
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                Move to phase:
              </DropdownMenuItem>
              {activePhases.map((phase) => (
                <DropdownMenuItem
                  key={phase.id}
                  disabled={task.phase_id === phase.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveToPhase.mutate({ taskId: task.id, phaseId: phase.id });
                  }}
                >
                  {phase.name}
                  {task.phase_id === phase.id && " ✓"}
                </DropdownMenuItem>
              ))}
              {task.phase_id && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    moveToPhase.mutate({ taskId: task.id, phaseId: null });
                  }}
                >
                  Remove from phase
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  const renderColumn = (title: string, columnTasks: any[], phaseId?: string) => {
    const completedCount = columnTasks.filter((t) => t.status === "done").length;
    
    return (
      <div className="flex-shrink-0 w-72">
        <Card className="h-full">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                {title}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {completedCount}/{columnTasks.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-2 pt-0 space-y-2">
            {columnTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tasks
              </p>
            ) : (
              columnTasks.map(renderTaskCard)
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // If no phases, show by status instead
  if (activePhases.length === 0) {
    const todoTasks = tasks.filter((t) => t.status === "to_do");
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
    const doneTasks = tasks.filter((t) => t.status === "done");

    return (
      <ScrollArea className="w-full">
        <div className="flex gap-4 p-4 min-w-max">
          {renderColumn("To Do", todoTasks)}
          {renderColumn("In Progress", inProgressTasks)}
          {renderColumn("Done", doneTasks)}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 p-4 min-w-max">
        {activePhases.map((phase) => 
          renderColumn(phase.name, tasksByPhase[phase.id] || [], phase.id)
        )}
        {unassignedTasks.length > 0 && renderColumn("Unassigned", unassignedTasks)}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
