import * as React from "react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Repeat, 
  MoreHorizontal, 
  FolderOpen,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
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
import { useProjectPhases } from "@/hooks/useProjectPhases";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ensureArray, safeFormatDate } from "@/core/runtime/safety";
import type { TaskListItem } from "@/pages/app/tasks/TaskList";

type ProjectTaskItem = TaskListItem & {
  phase_id?: string | null;
  created_at?: string | null;
};

interface TaskBoardViewProps {
  tasks: ProjectTaskItem[];
  projectId: string;
  onAddTask?: () => void;
  onEditTask?: (task: ProjectTaskItem) => void;
}

type SortField = "due_date" | "created_at";
type SortDirection = "asc" | "desc";

export function TaskBoardView({
  tasks,
  projectId,
  onAddTask,
  onEditTask,
}: TaskBoardViewProps) {
  const { data: phases = [] } = useProjectPhases(projectId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Ensure tasks is always an array to prevent .map errors
  const safeTasks = ensureArray<ProjectTaskItem>(tasks);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("due_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Drag and drop state
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverPhase, setDragOverPhase] = useState<string | null>(null);

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

  // Sorting functions
  const sortTasks = (tasksToSort: ProjectTaskItem[]) => {
    // Ensure tasksToSort is always an array to prevent spread operator errors
    const safeTasksToSort = ensureArray<ProjectTaskItem>(tasksToSort);

    const toTimestamp = (value: string | null | undefined, fallback: number) => {
      if (!value) return fallback;
      const parsed = new Date(value).getTime();
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    return [...safeTasksToSort].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      if (sortField === "due_date") {
        aValue = toTimestamp(a.due_date, Number.POSITIVE_INFINITY);
        bValue = toTimestamp(b.due_date, Number.POSITIVE_INFINITY);
      } else {
        aValue = toTimestamp(a.created_at, 0);
        bValue = toTimestamp(b.created_at, 0);
      }

      if (sortDirection === "asc") {
        return aValue - bValue;
      }
      return bValue - aValue;
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    setDraggedTask(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverPhase(null);
  };

  const handleDragOver = (e: React.DragEvent, phaseId: string | null) => {
    e.preventDefault();
    setDragOverPhase(phaseId);
  };

  const handleDragLeave = () => {
    setDragOverPhase(null);
  };

  const handleDrop = (e: React.DragEvent, phaseId: string | null) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      moveToPhase.mutate({ taskId, phaseId });
    }
    setDraggedTask(null);
    setDragOverPhase(null);
  };

  if (safeTasks.length === 0) {
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

  const renderTaskCard = (task: ProjectTaskItem) => (
    <div
      key={task.id}
      draggable
      onDragStart={(e) => handleDragStart(e, task.id)}
      onDragEnd={handleDragEnd}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-all",
        draggedTask === task.id && "opacity-50"
      )}
    >
      <Card
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
                    {safeFormatDate(task.due_date, "MMM d")}
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
    </div>
  );

  const renderColumn = (title: string, columnTasks: ProjectTaskItem[], phaseId: string | null) => {
    // Ensure columnTasks is always an array to prevent .filter and .map errors
    const safeColumnTasks = ensureArray<ProjectTaskItem>(columnTasks);
    const completedCount = safeColumnTasks.filter((t) => t.status === "done").length;
    const sortedTasks = sortTasks(safeColumnTasks);
    const isDropTarget = dragOverPhase === phaseId;
    
    return (
      <div 
        className="flex-shrink-0 w-72"
        onDragOver={(e) => handleDragOver(e, phaseId)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, phaseId)}
      >
        <Card className={cn(
          "h-full transition-all",
          isDropTarget && "ring-2 ring-primary ring-offset-2"
        )}>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                {title}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {completedCount}/{safeColumnTasks.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-2 pt-0 space-y-2">
            {sortedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isDropTarget ? "Drop here" : "No tasks"}
              </p>
            ) : (
              sortedTasks.map(renderTaskCard)
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Sort controls
  const SortControls = () => (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
      <span className="text-xs text-muted-foreground">Sort by:</span>
      <Button
        variant={sortField === "due_date" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 text-xs"
        onClick={() => toggleSort("due_date")}
      >
        Due Date
        {sortField === "due_date" && (
          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />
        )}
      </Button>
      <Button
        variant={sortField === "created_at" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 text-xs"
        onClick={() => toggleSort("created_at")}
      >
        Created
        {sortField === "created_at" && (
          sortDirection === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />
        )}
      </Button>
    </div>
  );

  // If no phases, show by status instead
  if (activePhases.length === 0) {
    const todoTasks = safeTasks.filter((t) => t.status === "to_do");
    const inProgressTasks = safeTasks.filter((t) => t.status === "in_progress");
    const doneTasks = safeTasks.filter((t) => t.status === "done");

    return (
      <div>
        <SortControls />
        <ScrollArea className="w-full">
          <div className="flex gap-4 p-4 min-w-max">
            {renderColumn("To Do", todoTasks, "to_do")}
            {renderColumn("In Progress", inProgressTasks, "in_progress")}
            {renderColumn("Done", doneTasks, "done")}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    );
  }

  return (
    <div>
      <SortControls />
      <ScrollArea className="w-full">
        <div className="flex gap-4 p-4 min-w-max">
          {activePhases.map((phase) => 
            renderColumn(phase.name, tasksByPhase[phase.id] || [], phase.id)
          )}
          {renderColumn("Unassigned", unassignedTasks, null)}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
