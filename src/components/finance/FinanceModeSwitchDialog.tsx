import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FinanceMode, DataRetentionAction } from "@/hooks/useFinanceMode";

interface FinanceModeSwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMode: FinanceMode | null;
  newMode: FinanceMode;
  onConfirm: (dataAction: DataRetentionAction) => void;
  isLoading?: boolean;
}

const modeLabels: Record<FinanceMode, string> = {
  builtin_books: "Built-in Books (Accounting)",
  external_reporting: "External Books (Financial Insights)",
};

const dataActionOptions: { value: DataRetentionAction; label: string; description: string }[] = [
  {
    value: "keep",
    label: "Keep data",
    description: "Existing finance data will be preserved but hidden. You can access it if you switch back.",
  },
  {
    value: "archive",
    label: "Archive data",
    description: "Existing finance data will be moved to an archived state. It can be restored later if needed.",
  },
  {
    value: "delete",
    label: "Delete data",
    description: "Existing finance data will be soft-deleted. It can be recovered within 30 days.",
  },
];

export function FinanceModeSwitchDialog({
  open,
  onOpenChange,
  currentMode,
  newMode,
  onConfirm,
  isLoading,
}: FinanceModeSwitchDialogProps) {
  const [dataAction, setDataAction] = React.useState<DataRetentionAction>("keep");

  const handleConfirm = () => {
    onConfirm(dataAction);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Switch Finance Mode</DialogTitle>
          <DialogDescription>
            You're switching from <strong>{currentMode ? modeLabels[currentMode] : "None"}</strong> to{" "}
            <strong>{modeLabels[newMode]}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-700 dark:text-amber-400">
              What would you like to do with your existing finance data?
            </AlertDescription>
          </Alert>

          <RadioGroup value={dataAction} onValueChange={(v) => setDataAction(v as DataRetentionAction)}>
            {dataActionOptions.map((option) => (
              <div
                key={option.value}
                className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-muted/50"
              >
                <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                  <span className="font-medium">{option.label}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Switching...
              </>
            ) : (
              "Confirm Switch"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
