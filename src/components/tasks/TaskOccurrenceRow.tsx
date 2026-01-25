import * as React from "react";
import { format } from "date-fns";
import { CheckCircle2, Circle, MoreHorizontal, Repeat, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TaskOccurrenceActions } from "./TaskOccurrenceActions";
import { ExpandedTaskOccurrence } from "@/hooks/useTaskOccurrenceCompletions";

interface TaskOccurrenceRowProps {
  task: any;
  occurrence: ExpandedTaskOccurrence;
  showProject?: boolean;
  onCompleteToggle: (completed: boolean) => void;
  onEditOccurrence: () => void;
  onEditSeries: () => void;
  onClick?: () => void;
  isCompletePending?: boolean;
}

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

export function TaskOccurrenceRow({
  task,
  occurrence,
  showProject = false,
  onCompleteToggle,
  onEditOccurrence,
  onEditSeries,
  onClick,
  isCompletePending = false,
}: TaskOccurrenceRowProps) {
  const isCompleted = occurrence.is_completed;
  const occurrenceDate = new Date(occurrence.occurrence_start_at);

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors group",
        isCompleted && "opacity-60",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCompleteToggle(!isCompleted);
        }}
        disabled={isCompletePending}
        className={cn(
          "shrink-0 text-muted-foreground hover:text-primary transition-colors",
          isCompletePending && "opacity-50"
        )}
      >
        {isCompleted ? (
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
              isCompleted && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </span>
          <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
          {occurrence.is_override && (
            <Badge variant="outline" className="text-xs">Modified</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {showProject && task.project && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {task.project.emoji} {task.project.name}
            </span>
          )}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(occurrenceDate, "MMM d, yyyy")}
          </span>
        </div>
      </div>

      <Badge variant="secondary" className={cn("shrink-0", getPriorityColor(task.priority))}>
        {task.priority}
      </Badge>

      <TaskOccurrenceActions
        seriesTaskId={task.id}
        occurrenceDate={occurrenceDate}
        onEditOccurrence={onEditOccurrence}
        onEditSeries={onEditSeries}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </TaskOccurrenceActions>
    </div>
  );
}
