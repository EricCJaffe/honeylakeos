import * as React from "react";
import { useState } from "react";
import { Edit, Repeat, X, Check, FastForward } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTaskOccurrenceActions } from "@/hooks/useTaskOccurrenceCompletions";

interface TaskOccurrenceActionsProps {
  seriesTaskId: string;
  occurrenceDate: Date;
  isCompleted?: boolean;
  onEditOccurrence: () => void;
  onEditSeries: () => void;
  onEditFuture?: () => void;
  children: React.ReactNode;
}

export function TaskOccurrenceActions({
  seriesTaskId,
  occurrenceDate,
  isCompleted = false,
  onEditOccurrence,
  onEditSeries,
  onEditFuture,
  children,
}: TaskOccurrenceActionsProps) {
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showEditChoice, setShowEditChoice] = useState(false);
  const { skipOccurrence, completeOccurrence, uncompleteOccurrence } = useTaskOccurrenceActions();

  const handleComplete = async () => {
    if (isCompleted) {
      await uncompleteOccurrence.mutateAsync({
        seriesTaskId,
        occurrenceStartAt: occurrenceDate,
      });
    } else {
      await completeOccurrence.mutateAsync({
        seriesTaskId,
        occurrenceStartAt: occurrenceDate,
      });
    }
  };

  const handleSkip = async () => {
    await skipOccurrence.mutateAsync({
      seriesTaskId,
      occurrenceDate,
    });
    setShowSkipConfirm(false);
  };

  const handleEditClick = () => {
    // Show the edit choice modal instead of direct edit
    setShowEditChoice(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleComplete}>
            <Check className="h-4 w-4 mr-2" />
            {isCompleted ? "Mark incomplete" : "Mark complete"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleEditClick}>
            <Edit className="h-4 w-4 mr-2" />
            Edit...
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowSkipConfirm(true)}
            className="text-destructive"
          >
            <X className="h-4 w-4 mr-2" />
            Skip this occurrence
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Choice Modal */}
      <AlertDialog open={showEditChoice} onOpenChange={setShowEditChoice}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit recurring task</AlertDialogTitle>
            <AlertDialogDescription>
              This is a recurring task. How would you like to edit it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <button
              onClick={() => {
                setShowEditChoice(false);
                onEditOccurrence();
              }}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
            >
              <Edit className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">This occurrence only</p>
                <p className="text-sm text-muted-foreground">
                  Only {occurrenceDate.toLocaleDateString()} will be changed
                </p>
              </div>
            </button>
            {onEditFuture && (
              <button
                onClick={() => {
                  setShowEditChoice(false);
                  onEditFuture();
                }}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
              >
                <FastForward className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">This and future occurrences</p>
                  <p className="text-sm text-muted-foreground">
                    Changes apply from {occurrenceDate.toLocaleDateString()} onwards
                  </p>
                </div>
              </button>
            )}
            <button
              onClick={() => {
                setShowEditChoice(false);
                onEditSeries();
              }}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
            >
              <Repeat className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">All occurrences</p>
                <p className="text-sm text-muted-foreground">
                  Changes apply to the entire series
                </p>
              </div>
            </button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Skip Confirmation */}
      <AlertDialog open={showSkipConfirm} onOpenChange={setShowSkipConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip this occurrence?</AlertDialogTitle>
            <AlertDialogDescription>
              This will skip the task occurrence on{" "}
              {occurrenceDate.toLocaleDateString()}. The rest of the series will
              continue as scheduled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSkip}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Skip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
