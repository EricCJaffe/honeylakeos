import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import {
  Plus,
  GripVertical,
  Trash2,
  Calendar as CalendarIcon,
  Check,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FormLabel } from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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

// Draft subtask type for new tasks (before they have an ID)
export interface DraftSubtask {
  tempId: string; // Client-side temporary ID
  title: string;
  dueDate?: string;
  status: "open" | "done";
  sortOrder: number;
}

interface SubtasksDialogSectionProps {
  // For existing tasks - uses persistent mutations
  taskId?: string;
  // For new tasks - uses local state
  draftSubtasks?: DraftSubtask[];
  onDraftSubtasksChange?: (subtasks: DraftSubtask[]) => void;
}

export function SubtasksDialogSection({
  taskId,
  draftSubtasks,
  onDraftSubtasksChange,
}: SubtasksDialogSectionProps) {
  const isEditMode = !!taskId;
  const isDraftMode = !taskId && !!onDraftSubtasksChange;

  // Persistent mode hooks (only used when editing)
  const { data: persistedSubtasks = [], isLoading } = useTaskSubtasks(isEditMode ? taskId : undefined);
  const createSubtask = useCreateSubtask();
  const toggleStatus = useToggleSubtaskStatus();
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();
  const reorderSubtasks = useReorderSubtasks();

  // Local state for adding new subtask
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState<Date | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  // Get the list to display
  const subtaskList = isEditMode ? persistedSubtasks : (draftSubtasks || []);
  const completedCount = isEditMode
    ? persistedSubtasks.filter((s) => s.status === "done").length
    : (draftSubtasks || []).filter((s) => s.status === "done").length;
  const totalCount = subtaskList.length;

  // Add subtask handler
  const handleAddSubtask = async () => {
    if (!newTitle.trim()) return;

    if (isEditMode && taskId) {
      // Persist immediately
      await createSubtask.mutateAsync({
        parentTaskId: taskId,
        title: newTitle.trim(),
        dueDate: newDueDate ? format(newDueDate, "yyyy-MM-dd") : undefined,
      });
    } else if (isDraftMode && onDraftSubtasksChange) {
      // Add to draft state
      const newSubtask: DraftSubtask = {
        tempId: `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: newTitle.trim(),
        dueDate: newDueDate ? format(newDueDate, "yyyy-MM-dd") : undefined,
        status: "open",
        sortOrder: (draftSubtasks || []).length,
      };
      onDraftSubtasksChange([...(draftSubtasks || []), newSubtask]);
    }

    setNewTitle("");
    setNewDueDate(undefined);
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

  // Toggle subtask status
  const handleToggleStatus = (subtask: TaskSubtask | DraftSubtask) => {
    if (isEditMode && "id" in subtask) {
      toggleStatus.mutate({
        id: subtask.id,
        parentTaskId: subtask.parent_task_id,
        currentStatus: subtask.status,
      });
    } else if (isDraftMode && "tempId" in subtask && onDraftSubtasksChange) {
      const updated = (draftSubtasks || []).map((s) =>
        s.tempId === subtask.tempId
          ? { ...s, status: s.status === "done" ? "open" as const : "done" as const }
          : s
      );
      onDraftSubtasksChange(updated);
    }
  };

  // Delete subtask
  const handleDeleteSubtask = (subtask: TaskSubtask | DraftSubtask) => {
    if (isEditMode && "id" in subtask) {
      deleteSubtask.mutate({
        id: subtask.id,
        parentTaskId: subtask.parent_task_id,
      });
    } else if (isDraftMode && "tempId" in subtask && onDraftSubtasksChange) {
      const filtered = (draftSubtasks || []).filter((s) => s.tempId !== subtask.tempId);
      // Update sort orders
      const reordered = filtered.map((s, index) => ({ ...s, sortOrder: index }));
      onDraftSubtasksChange(reordered);
    }
  };

  // Move subtask up/down (simpler than drag on mobile)
  const handleMoveSubtask = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (isEditMode) {
      const newOrder = [...persistedSubtasks];
      const [item] = newOrder.splice(index, 1);
      newOrder.splice(targetIndex, 0, item);
      reorderSubtasks.mutate({
        parentTaskId: taskId!,
        subtaskIds: newOrder.map((s) => s.id),
      });
    } else if (isDraftMode && onDraftSubtasksChange) {
      const newOrder = [...(draftSubtasks || [])];
      const [item] = newOrder.splice(index, 1);
      newOrder.splice(targetIndex, 0, item);
      const reordered = newOrder.map((s, i) => ({ ...s, sortOrder: i }));
      onDraftSubtasksChange(reordered);
    }
  };

  // Update subtask title (for drafts)
  const handleUpdateTitle = (subtask: DraftSubtask, newTitle: string) => {
    if (isDraftMode && onDraftSubtasksChange) {
      const updated = (draftSubtasks || []).map((s) =>
        s.tempId === subtask.tempId ? { ...s, title: newTitle } : s
      );
      onDraftSubtasksChange(updated);
    }
  };

  if (isEditMode && isLoading) {
    return (
      <div className="space-y-2">
        <FormLabel>Subtasks</FormLabel>
        <div className="text-sm text-muted-foreground py-2">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <FormLabel className="flex items-center gap-2">
          Subtasks
          {totalCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {completedCount}/{totalCount}
            </Badge>
          )}
        </FormLabel>
        {!isAdding && (
          <Button
            type="button"
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

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Subtask list */}
      <div className="space-y-1">
        {subtaskList.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground py-2">
            No subtasks yet. Break down this task into smaller steps.
          </p>
        )}

        {isEditMode &&
          persistedSubtasks.map((subtask, index) => (
            <PersistedSubtaskItem
              key={subtask.id}
              subtask={subtask}
              index={index}
              totalCount={persistedSubtasks.length}
              onToggle={() => handleToggleStatus(subtask)}
              onDelete={() => handleDeleteSubtask(subtask)}
              onMoveUp={() => handleMoveSubtask(index, "up")}
              onMoveDown={() => handleMoveSubtask(index, "down")}
            />
          ))}

        {isDraftMode &&
          (draftSubtasks || []).map((subtask, index) => (
            <DraftSubtaskItem
              key={subtask.tempId}
              subtask={subtask}
              index={index}
              totalCount={(draftSubtasks || []).length}
              onToggle={() => handleToggleStatus(subtask)}
              onDelete={() => handleDeleteSubtask(subtask)}
              onMoveUp={() => handleMoveSubtask(index, "up")}
              onMoveDown={() => handleMoveSubtask(index, "down")}
              onUpdateTitle={(title) => handleUpdateTitle(subtask, title)}
            />
          ))}

        {/* Add subtask inline form */}
        {isAdding && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
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
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={handleAddSubtask}
              disabled={!newTitle.trim() || createSubtask.isPending}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
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
      </div>
    </div>
  );
}

// Item component for persisted subtasks (edit mode)
interface PersistedSubtaskItemProps {
  subtask: TaskSubtask;
  index: number;
  totalCount: number;
  onToggle: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function PersistedSubtaskItem({
  subtask,
  index,
  totalCount,
  onToggle,
  onDelete,
  onMoveUp,
  onMoveDown,
}: PersistedSubtaskItemProps) {
  const updateSubtask = useUpdateSubtask();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(subtask.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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

  const isCompleted = subtask.status === "done";

  return (
    <div className="flex items-center gap-1.5 p-1.5 rounded-lg group hover:bg-muted/50 transition-colors">
      <div className="flex flex-col gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onMoveUp}
          disabled={index === 0}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onMoveDown}
          disabled={index === totalCount - 1}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      <Checkbox checked={isCompleted} onCheckedChange={onToggle} />

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
            "flex-1 text-sm cursor-text truncate",
            isCompleted && "line-through text-muted-foreground"
          )}
        >
          {subtask.title}
        </span>
      )}

      {subtask.due_date && (
        <span className="text-xs text-muted-foreground shrink-0">
          {format(new Date(subtask.due_date), "MMM d")}
        </span>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}

// Item component for draft subtasks (create mode)
interface DraftSubtaskItemProps {
  subtask: DraftSubtask;
  index: number;
  totalCount: number;
  onToggle: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdateTitle: (title: string) => void;
}

function DraftSubtaskItem({
  subtask,
  index,
  totalCount,
  onToggle,
  onDelete,
  onMoveUp,
  onMoveDown,
  onUpdateTitle,
}: DraftSubtaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(subtask.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onUpdateTitle(editTitle.trim());
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

  const isCompleted = subtask.status === "done";

  return (
    <div className="flex items-center gap-1.5 p-1.5 rounded-lg group hover:bg-muted/50 transition-colors">
      <div className="flex flex-col gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onMoveUp}
          disabled={index === 0}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onMoveDown}
          disabled={index === totalCount - 1}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      <Checkbox checked={isCompleted} onCheckedChange={onToggle} />

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
            "flex-1 text-sm cursor-text truncate",
            isCompleted && "line-through text-muted-foreground"
          )}
        >
          {subtask.title}
        </span>
      )}

      {subtask.dueDate && (
        <span className="text-xs text-muted-foreground shrink-0">
          {format(new Date(subtask.dueDate), "MMM d")}
        </span>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}
