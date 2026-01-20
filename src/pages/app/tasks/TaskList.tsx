import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format, isToday, isPast, parseISO, startOfDay } from "date-fns";
import { 
  CheckCircle2, 
  Circle, 
  MoreHorizontal, 
  Pencil, 
  Calendar, 
  Repeat, 
  Layers,
  Archive,
  Copy,
  RotateCcw,
  AlertCircle,
  Clock,
  Ban
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { rruleToConfig } from "@/components/tasks/RecurrenceSelector";
import { useAuth } from "@/lib/auth";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { TaskTagsDisplay } from "@/components/tasks/TaskTagInput";

interface TaskListProps {
  tasks: any[];
  projectId?: string;
  onAddTask?: () => void;
  onEditTask?: (task: any) => void;
  showProject?: boolean;
  showPhase?: boolean;
  showRecurrence?: boolean;
  showList?: boolean;
}

export function TaskList({
  tasks,
  projectId,
  onAddTask,
  onEditTask,
  showProject = false,
  showPhase = false,
  showRecurrence = false,
  showList = false,
}: TaskListProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

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

  const archiveTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "archived" })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      toast.success("Task archived");
    },
    onError: () => {
      toast.error("Failed to archive task");
    },
  });

  const duplicateTask = useMutation({
    mutationFn: async (task: any) => {
      if (!activeCompanyId || !user) throw new Error("Missing context");
      const { id, created_at, updated_at, task_assignees, project, phase, ...rest } = task;
      const { error } = await supabase.from("tasks").insert({
        ...rest,
        title: `${task.title} (copy)`,
        status: "to_do",
        company_id: activeCompanyId,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      toast.success("Task duplicated");
    },
    onError: () => {
      toast.error("Failed to duplicate task");
    },
  });

  const reopenTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "to_do" })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      toast.success("Task reopened");
    },
    onError: () => {
      toast.error("Failed to reopen task");
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

  // Helper to check if task is overdue
  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === "done" || status === "archived") return false;
    const due = startOfDay(parseISO(dueDate));
    const today = startOfDay(new Date());
    return isPast(due) && due.getTime() !== today.getTime();
  };

  // Helper to check if task is due today
  const isDueToday = (dueDate: string | null) => {
    if (!dueDate) return false;
    return isToday(parseISO(dueDate));
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
  const blockedTasks = tasks.filter((t) => t.status === "blocked");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const archivedTasks = tasks.filter((t) => t.status === "archived");

  // Status icon helper
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle2 className="h-5 w-5 text-primary" />;
      case "blocked":
        return <Ban className="h-5 w-5 text-destructive" />;
      case "archived":
        return <Archive className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Circle className="h-5 w-5" />;
    }
  };

  const renderTaskGroup = (groupTasks: any[], label: string) => {
    if (groupTasks.length === 0) return null;

    return (
      <div className="mb-4 last:mb-0">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2 border-b">
          {label} ({groupTasks.length})
        </h4>
        <div>
          {groupTasks.map((task) => {
            const taskIsOverdue = isOverdue(task.due_date, task.status);
            const taskIsDueToday = isDueToday(task.due_date);
            
            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors group cursor-pointer",
                  (task.status === "done" || task.status === "archived") && "opacity-60"
                )}
                onClick={() => navigate(`/app/tasks/${task.id}`)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!task.is_recurring_template && task.status !== "archived") {
                      toggleStatus.mutate({ taskId: task.id, currentStatus: task.status });
                    }
                  }}
                  className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                  disabled={task.is_recurring_template || task.status === "archived"}
                >
                  {getStatusIcon(task.status)}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-medium truncate",
                        task.status === "done" && "line-through text-muted-foreground",
                        task.status === "archived" && "text-muted-foreground"
                      )}
                    >
                      {task.title}
                    </span>
                    {task.is_recurring_template && (
                      <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {showList && task.task_list && (
                      <Badge variant="outline" className="text-xs py-0 h-5" style={task.task_list.color ? { borderColor: task.task_list.color, color: task.task_list.color } : undefined}>
                        {task.task_list.name}
                      </Badge>
                    )}
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
                      <>
                        {taskIsOverdue && (
                          <Badge variant="destructive" className="text-xs py-0 h-5">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                        {taskIsDueToday && !taskIsOverdue && (
                          <Badge className="text-xs py-0 h-5 bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
                            <Clock className="h-3 w-3 mr-1" />
                            Due today
                          </Badge>
                        )}
                        {!taskIsOverdue && !taskIsDueToday && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.due_date), "MMM d")}
                          </span>
                        )}
                      </>
                    )}
                    {showRecurrence && task.is_recurring_template && (
                      <Badge variant="secondary" className="text-xs py-0 h-5">
                        <Repeat className="h-3 w-3 mr-1" />
                        {getRecurrenceLabel(task)}
                      </Badge>
                    )}
                    {/* Tags display */}
                    {task.tags && Array.isArray(task.tags) && task.tags.length > 0 && (
                      <TaskTagsDisplay tags={task.tags as string[]} maxDisplay={2} />
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
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        duplicateTask.mutate(task);
                      }}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {(task.status === "done" || task.status === "archived") && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          reopenTask.mutate(task.id);
                        }}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reopen
                        </DropdownMenuItem>
                      )}
                      {task.status !== "archived" && (
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            archiveTask.mutate(task.id);
                          }}
                          className="text-destructive"
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderTaskGroup(todoTasks, "To Do")}
      {renderTaskGroup(inProgressTasks, "In Progress")}
      {renderTaskGroup(blockedTasks, "Blocked")}
      {renderTaskGroup(doneTasks, "Done")}
      {renderTaskGroup(archivedTasks, "Archived")}
    </div>
  );
}
