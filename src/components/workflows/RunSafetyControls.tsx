import { useState } from "react";
import { X, SkipForward, UserPlus } from "lucide-react";
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

interface RunSafetyControlsProps {
  runId: string;
  runStatus: string;
  isAdmin: boolean;
  onCancel: (reason: string) => Promise<void>;
  isPending?: boolean;
}

export function RunSafetyControls({
  runId,
  runStatus,
  isAdmin,
  onCancel,
  isPending = false,
}: RunSafetyControlsProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  if (!isAdmin || runStatus !== "running") {
    return null;
  }

  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) return;
    await onCancel(cancelReason);
    setShowCancelDialog(false);
    setCancelReason("");
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowCancelDialog(true)}
        disabled={isPending}
      >
        <X className="mr-2 h-4 w-4" />
        Cancel Run
      </Button>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Workflow Run</DialogTitle>
            <DialogDescription>
              This will cancel the workflow run and all pending steps. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">
                Reason for cancellation <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="cancel-reason"
                placeholder="Please provide a reason for cancelling this run..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Running
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={!cancelReason.trim() || isPending}
            >
              Cancel Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface StepSafetyControlsProps {
  stepRunId: string;
  stepStatus: string;
  isAdmin: boolean;
  onSkip: (reason: string) => Promise<void>;
  onReassign?: (newUserId: string) => Promise<void>;
  isPending?: boolean;
}

export function StepSafetyControls({
  stepRunId,
  stepStatus,
  isAdmin,
  onSkip,
  isPending = false,
}: StepSafetyControlsProps) {
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [skipReason, setSkipReason] = useState("");

  const canSkip = isAdmin && (stepStatus === "pending" || stepStatus === "in_progress");

  if (!canSkip) {
    return null;
  }

  const handleSkipConfirm = async () => {
    if (!skipReason.trim()) return;
    await onSkip(skipReason);
    setShowSkipDialog(false);
    setSkipReason("");
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowSkipDialog(true)}
        disabled={isPending}
      >
        <SkipForward className="mr-2 h-3 w-3" />
        Skip
      </Button>

      <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skip Step</DialogTitle>
            <DialogDescription>
              This will mark the step as skipped and move the workflow forward.
              This action is logged and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="skip-reason">
                Reason for skipping <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="skip-reason"
                placeholder="Please provide a reason for skipping this step..."
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSkipDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSkipConfirm}
              disabled={!skipReason.trim() || isPending}
            >
              Skip Step
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
