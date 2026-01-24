import { useState } from "react";
import { format, addMonths } from "date-fns";
import { CalendarIcon, Check, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSOPReview, ReviewAction } from "@/hooks/useSOPReview";
import type { SOP } from "@/hooks/useSOPs";

interface CompleteReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sop: SOP;
  onSuccess?: () => void;
  onEditAndPublish?: () => void;
}

export function CompleteReviewDialog({
  open,
  onOpenChange,
  sop,
  onSuccess,
  onEditAndPublish,
}: CompleteReviewDialogProps) {
  const { completeReview } = useSOPReview();
  const [action, setAction] = useState<ReviewAction>("mark_unchanged");
  const [notes, setNotes] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState<Date | undefined>(
    addMonths(new Date(), 12)
  );

  const handleSubmit = async () => {
    if (action === "publish_update") {
      // Close this dialog and open edit dialog
      onOpenChange(false);
      onEditAndPublish?.();
      return;
    }

    await completeReview.mutateAsync({
      sopId: sop.id,
      action,
      notes: notes || undefined,
      nextReviewDate: nextReviewDate?.toISOString(),
    });

    onOpenChange(false);
    setNotes("");
    setAction("mark_unchanged");
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Complete SOP Review</DialogTitle>
          <DialogDescription>
            Review "{sop.title}" and choose how to proceed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Review Outcome</Label>
            <RadioGroup
              value={action}
              onValueChange={(value) => setAction(value as ReviewAction)}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="mark_unchanged" id="unchanged" className="mt-1" />
                <label htmlFor="unchanged" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Mark as Unchanged</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    The SOP content is still accurate. Log the review date and set next review.
                  </p>
                </label>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="publish_update" id="update" className="mt-1" />
                <label htmlFor="update" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Edit className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Edit & Publish Update</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Make changes and publish a new version of this SOP.
                  </p>
                </label>
              </div>
            </RadioGroup>
          </div>

          {action === "mark_unchanged" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="notes">Review Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this review..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Next Review Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !nextReviewDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {nextReviewDate ? format(nextReviewDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={nextReviewDate}
                      onSelect={setNextReviewDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  You'll receive a reminder 30 days before this date.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={completeReview.isPending}
          >
            {completeReview.isPending ? "Saving..." : 
              action === "publish_update" ? "Continue to Edit" : "Complete Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}