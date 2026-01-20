import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Calendar as CalendarIcon,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useTaskSubtasks,
  useCreateSubtask,
  useToggleSubtaskStatus,
  useUpdateSubtask,
  useDeleteSubtask,
  useReorderSubtasks,
  TaskSubtask,
} from "@/hooks/useTaskSubtasks";

interface SubtasksListProps {
  taskId: string;
  taskStatus?: string;
  onAllCompletePrompt?: () => void;
}

export function SubtasksList({ taskId, taskStatus, onAllCompletePrompt }: SubtasksListProps) {
  const { data: subtasks = [], isLoading } = useTaskSubtasks(taskId);
  const createSubtask = useCreateSubtask();
  const toggleStatus = useToggleSubtaskStatus();
  const reorderSubtasks = useReorderSubtasks();

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState<Date | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  // Check if all subtasks are complete after a status change
  useEffect(() => {
    if (subtasks.length > 0 && subtasks.every(s => s.status === "done") && onAllCompletePrompt) {
      onAllCompletePrompt();
    }
  }, [subtasks, onAllCompletePrompt]);

  const completedCount = subtasks.filter(s => s.status === "done").length;
  const totalCount = subtasks.length;

  const handleAddSubtask = async () => {
    if (!newTitle.trim()) return;

    await createSubtask.mutateAsync({
      parentTaskId: taskId,
      title: newTitle.trim(),
      dueDate: newDueDate ? format(newDueDate, "yyyy-MM-dd") : undefined,
    });

    setNewTitle("");
    setNewDueDate(undefined);
    // Keep adding mode open for quick entry
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddSubtask();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewTitle("");
      setNewDueDate(undefined);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain");
    if (sourceId === targetId) return;

    const sourceIndex = subtasks.findIndex(s => s.id === sourceId);
    const targetIndex = subtasks.findIndex(s => s.id === targetId);

    const newOrder = [...subtasks];
    const [removed] = newOrder.splice(sourceIndex, 1);
    newOrder.splice(targetIndex, 0, removed);

    reorderSubtasks.mutate({
      parentTaskId: taskId,
      subtaskIds: newOrder.map(s => s.id),
    });

    setDraggedId(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Subtasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Subtasks
            {totalCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {completedCount}/{totalCount}
              </Badge>
            )}
          </CardTitle>
          {!isAdding && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="h-7 px-2"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </div>
        {totalCount > 0 && (
          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {subtasks.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No subtasks yet. Break down this task into smaller steps.
          </p>
        ) : (
          <div className="space-y-1">
            {subtasks.map((subtask) => (
              <SubtaskItem
                key={subtask.id}
                subtask={subtask}
                isDragging={draggedId === subtask.id}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={() => setDraggedId(null)}
              />
            ))}
          </div>
        )}

        {/* Add subtask inline form */}
        {isAdding && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg mt-2">
            <Checkbox disabled className="opacity-50" />
            <Input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Subtask title..."
              className="flex-1 h-8 text-sm"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <CalendarIcon className={cn("h-4 w-4", newDueDate && "text-primary")} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={newDueDate}
                  onSelect={setNewDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={handleAddSubtask}
              disabled={!newTitle.trim() || createSubtask.isPending}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                setIsAdding(false);
                setNewTitle("");
                setNewDueDate(undefined);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SubtaskItemProps {
  subtask: TaskSubtask;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
}

function SubtaskItem({
  subtask,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: SubtaskItemProps) {
  const toggleStatus = useToggleSubtaskStatus();
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(subtask.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleToggle = () => {
    toggleStatus.mutate({
      id: subtask.id,
      parentTaskId: subtask.parent_task_id,
      currentStatus: subtask.status,
    });
  };

  const handleSaveEdit = () => {
    if (editTitle.trim() && editTitle !== subtask.title) {
      updateSubtask.mutate({
        id: subtask.id,
        parentTaskId: subtask.parent_task_id,
        title: editTitle.trim(),
      });
    }
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setEditTitle(subtask.title);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    deleteSubtask.mutate({
      id: subtask.id,
      parentTaskId: subtask.parent_task_id,
    });
    setShowDeleteConfirm(false);
  };

  const isCompleted = subtask.status === "done";

  return (
    <>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, subtask.id)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, subtask.id)}
        onDragEnd={onDragEnd}
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg group hover:bg-muted/50 transition-colors",
          isDragging && "opacity-50"
        )}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
        
        <Checkbox
          checked={isCompleted}
          onCheckedChange={handleToggle}
          disabled={toggleStatus.isPending}
        />

        {isEditing ? (
          <Input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleEditKeyDown}
            className="flex-1 h-7 text-sm"
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className={cn(
              "flex-1 text-sm cursor-text",
              isCompleted && "line-through text-muted-foreground"
            )}
          >
            {subtask.title}
          </span>
        )}

        {subtask.due_date && (
          <span className={cn(
            "text-xs shrink-0",
            isCompleted ? "text-muted-foreground" : "text-muted-foreground"
          )}>
            {format(new Date(subtask.due_date), "MMM d")}
          </span>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subtask?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{subtask.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Small progress indicator for list views
interface SubtaskProgressProps {
  completedCount: number;
  totalCount: number;
  className?: string;
}

export function SubtaskProgress({ completedCount, totalCount, className }: SubtaskProgressProps) {
  if (totalCount === 0) return null;

  const allComplete = completedCount === totalCount;

  return (
    <span
      className={cn(
        "text-xs font-medium px-1.5 py-0.5 rounded",
        allComplete
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-muted text-muted-foreground",
        className
      )}
    >
      {completedCount}/{totalCount}
    </span>
  );
}
