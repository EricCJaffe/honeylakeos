import * as React from "react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit, Repeat, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";
import { useTaskOccurrenceActions } from "@/hooks/useTaskOccurrenceCompletions";

interface TaskOccurrenceActionsProps {
  seriesTaskId: string;
  occurrenceDate: Date;
  isCompleted?: boolean;
  onEditOccurrence: () => void;
  onEditSeries: () => void;
  children: React.ReactNode;
}

export function TaskOccurrenceActions({
  seriesTaskId,
  occurrenceDate,
  isCompleted = false,
  onEditOccurrence,
  onEditSeries,
  children,
}: TaskOccurrenceActionsProps) {
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
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
          <DropdownMenuItem onClick={onEditOccurrence}>
            <Edit className="h-4 w-4 mr-2" />
            Edit this occurrence
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEditSeries}>
            <Repeat className="h-4 w-4 mr-2" />
            Edit entire series
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
