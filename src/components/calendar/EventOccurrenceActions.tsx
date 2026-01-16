import * as React from "react";
import { useState } from "react";
import { Edit, Repeat, FastForward, Trash2, MoreHorizontal } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEventOccurrenceActions } from "@/hooks/useEventOccurrenceActions";
import { format } from "date-fns";

export type EditMode = "single" | "future" | "series";

interface EventOccurrenceActionsProps {
  seriesEventId: string;
  occurrenceDate: Date;
  onEditOccurrence: () => void;
  onEditSeries: () => void;
  onEditFuture?: () => void;
  children: React.ReactNode;
}

export function EventOccurrenceActions({
  seriesEventId,
  occurrenceDate,
  onEditOccurrence,
  onEditSeries,
  onEditFuture,
  children,
}: EventOccurrenceActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { skipOccurrence } = useEventOccurrenceActions();

  const handleDelete = async () => {
    await skipOccurrence.mutateAsync({
      seriesEventId,
      occurrenceDate,
    });
    setShowDeleteConfirm(false);
  };

  const handleEditClick = () => {
    setShowEditModal(true);
  };

  const handleEditChoice = (mode: EditMode) => {
    setShowEditModal(false);
    switch (mode) {
      case "single":
        onEditOccurrence();
        break;
      case "future":
        onEditFuture?.();
        break;
      case "series":
        onEditSeries();
        break;
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleEditClick}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteConfirm(true)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete this event
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Mode Selection Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit recurring event</DialogTitle>
            <DialogDescription>
              This is a recurring event on {format(occurrenceDate, "MMMM d, yyyy")}. 
              How would you like to edit it?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-4">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => handleEditChoice("single")}
            >
              <Edit className="h-4 w-4 mr-3" />
              <div className="text-left">
                <div className="font-medium">This event only</div>
                <div className="text-xs text-muted-foreground">
                  Only edit this occurrence
                </div>
              </div>
            </Button>
            
            {onEditFuture && (
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3"
                onClick={() => handleEditChoice("future")}
              >
                <FastForward className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <div className="font-medium">This and future events</div>
                  <div className="text-xs text-muted-foreground">
                    Edit this and all following occurrences
                  </div>
                </div>
              </Button>
            )}
            
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => handleEditChoice("series")}
            >
              <Repeat className="h-4 w-4 mr-3" />
              <div className="text-left">
                <div className="font-medium">All events</div>
                <div className="text-xs text-muted-foreground">
                  Edit the entire recurring series
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this occurrence?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete only this event on{" "}
              {format(occurrenceDate, "MMMM d, yyyy")}. The rest of the series will
              continue as scheduled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={skipOccurrence.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {skipOccurrence.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
