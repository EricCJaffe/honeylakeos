import * as React from "react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit, Repeat, X, Trash2 } from "lucide-react";
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

interface EventOccurrenceActionsProps {
  seriesEventId: string;
  occurrenceDate: Date;
  onEditOccurrence: () => void;
  onEditSeries: () => void;
  children: React.ReactNode;
}

export function EventOccurrenceActions({
  seriesEventId,
  occurrenceDate,
  onEditOccurrence,
  onEditSeries,
  children,
}: EventOccurrenceActionsProps) {
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const queryClient = useQueryClient();

  const skipOccurrence = useMutation({
    mutationFn: async () => {
      const dateStr = occurrenceDate.toISOString().split("T")[0];
      const { error } = await supabase.rpc("skip_event_occurrence", {
        p_event_id: seriesEventId,
        p_occurrence_date: dateStr,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["all-event-occurrences"] });
      toast.success("Occurrence deleted");
      setShowSkipConfirm(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete occurrence");
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEditOccurrence}>
            <Edit className="h-4 w-4 mr-2" />
            Edit this event
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
            <Trash2 className="h-4 w-4 mr-2" />
            Delete this event
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showSkipConfirm} onOpenChange={setShowSkipConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this occurrence?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete only this event on{" "}
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
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
