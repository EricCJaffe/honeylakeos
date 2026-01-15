import * as React from "react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit, Repeat, X } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TaskOccurrenceActionsProps {
  seriesTaskId: string;
  occurrenceDate: Date;
  onEditOccurrence: () => void;
  onEditSeries: () => void;
  children: React.ReactNode;
}

export function TaskOccurrenceActions({
  seriesTaskId,
  occurrenceDate,
  onEditOccurrence,
  onEditSeries,
  children,
}: TaskOccurrenceActionsProps) {
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const queryClient = useQueryClient();

  const skipOccurrence = useMutation({
    mutationFn: async () => {
      const dateStr = occurrenceDate.toISOString().split("T")[0];
      const { error } = await supabase.rpc("skip_task_occurrence", {
        p_task_id: seriesTaskId,
        p_occurrence_date: dateStr,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-occurrences"] });
      toast.success("Occurrence skipped");
      setShowSkipConfirm(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to skip occurrence");
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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
              onClick={() => skipOccurrence.mutate()}
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
