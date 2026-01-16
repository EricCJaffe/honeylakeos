import * as React from "react";
import { Plus, CheckCircle2, Calendar, StickyNote, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { cn } from "@/lib/utils";

interface QuickAddButtonsProps {
  onAddTask?: () => void;
  onAddEvent?: () => void;
  onAddNote?: () => void;
  onUploadDocument?: () => void;
  className?: string;
  variant?: "default" | "compact";
}

export function QuickAddButtons({
  onAddTask,
  onAddEvent,
  onAddNote,
  onUploadDocument,
  className,
  variant = "default",
}: QuickAddButtonsProps) {
  const { isEnabled, loading } = useCompanyModules();

  if (loading) return null;

  const showTasks = onAddTask && isEnabled("tasks");
  const showEvents = onAddEvent && isEnabled("calendar");
  const showNotes = onAddNote && isEnabled("notes");
  const showDocuments = onUploadDocument && isEnabled("documents");

  const hasAnyAction = showTasks || showEvents || showNotes || showDocuments;

  if (!hasAnyAction) return null;

  if (variant === "compact") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className={className}>
            <Plus className="h-4 w-4 mr-1" />
            Quick Add
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {showTasks && (
            <DropdownMenuItem onClick={onAddTask}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Add Task
            </DropdownMenuItem>
          )}
          {showEvents && (
            <DropdownMenuItem onClick={onAddEvent}>
              <Calendar className="h-4 w-4 mr-2" />
              Add Event
            </DropdownMenuItem>
          )}
          {showNotes && (
            <DropdownMenuItem onClick={onAddNote}>
              <StickyNote className="h-4 w-4 mr-2" />
              Add Note
            </DropdownMenuItem>
          )}
          {showDocuments && (
            <DropdownMenuItem onClick={onUploadDocument}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {showTasks && (
        <Button variant="outline" size="sm" onClick={onAddTask}>
          <CheckCircle2 className="h-4 w-4 mr-1.5" />
          Add Task
        </Button>
      )}
      {showEvents && (
        <Button variant="outline" size="sm" onClick={onAddEvent}>
          <Calendar className="h-4 w-4 mr-1.5" />
          Add Event
        </Button>
      )}
      {showNotes && (
        <Button variant="outline" size="sm" onClick={onAddNote}>
          <StickyNote className="h-4 w-4 mr-1.5" />
          Add Note
        </Button>
      )}
      {showDocuments && (
        <Button variant="outline" size="sm" onClick={onUploadDocument}>
          <Upload className="h-4 w-4 mr-1.5" />
          Upload Doc
        </Button>
      )}
    </div>
  );
}
