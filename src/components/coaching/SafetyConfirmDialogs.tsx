import { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Shield, Unlink } from "lucide-react";
import { useState } from "react";

interface SafetyConfirmDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  warningItems?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  requireExplicitConfirm?: boolean;
  confirmCheckboxLabel?: string;
  variant?: "default" | "destructive" | "warning";
  onConfirm: () => void;
  isLoading?: boolean;
}

/**
 * Reusable safety confirmation dialog with optional explicit checkbox confirmation.
 * Used for high-risk actions like detaching coaching items or enabling sensitive modules.
 */
export function SafetyConfirmDialog({
  trigger,
  title,
  description,
  warningItems = [],
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  requireExplicitConfirm = false,
  confirmCheckboxLabel = "I understand the consequences of this action",
  variant = "default",
  onConfirm,
  isLoading = false,
}: SafetyConfirmDialogProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    if (requireExplicitConfirm && !isChecked) return;
    onConfirm();
    setOpen(false);
    setIsChecked(false);
  };

  const canConfirm = !requireExplicitConfirm || isChecked;

  const getIcon = () => {
    switch (variant) {
      case "destructive":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case "warning":
        return <Shield className="h-5 w-5 text-amber-500" />;
      default:
        return null;
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {getIcon()}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>{description}</p>
            {warningItems.length > 0 && (
              <ul className="list-disc list-inside space-y-1 text-sm">
                {warningItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {requireExplicitConfirm && (
          <div className="flex items-start space-x-2 py-2">
            <Checkbox
              id="confirm-checkbox"
              checked={isChecked}
              onCheckedChange={(checked) => setIsChecked(checked === true)}
            />
            <Label
              htmlFor="confirm-checkbox"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {confirmCheckboxLabel}
            </Label>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className={variant === "destructive" ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Pre-configured dialog for detaching items from coaching
 */
export function DetachConfirmDialog({
  trigger,
  itemName,
  coachName,
  onConfirm,
  isLoading,
}: {
  trigger: ReactNode;
  itemName: string;
  coachName?: string;
  onConfirm: () => void;
  isLoading?: boolean;
}) {
  return (
    <SafetyConfirmDialog
      trigger={trigger}
      title="Detach from Coaching?"
      description={`This will convert "${itemName}" to an internal item.`}
      warningItems={[
        coachName 
          ? `${coachName} will no longer have visibility to this item`
          : "Your coach will no longer have visibility to this item",
        "The item will remain in your system",
        "This action cannot be easily undone",
      ]}
      confirmLabel="Convert to Internal"
      variant="warning"
      requireExplicitConfirm
      confirmCheckboxLabel="I understand the coach will lose access"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}

/**
 * Pre-configured dialog for ending a coaching engagement
 */
export function EndEngagementConfirmDialog({
  trigger,
  coachingOrgName,
  hasProvisionedSubscription,
  onConfirm,
  isLoading,
}: {
  trigger: ReactNode;
  coachingOrgName: string;
  hasProvisionedSubscription?: boolean;
  onConfirm: () => void;
  isLoading?: boolean;
}) {
  const warnings = [
    `${coachingOrgName} will immediately lose access to your company data`,
    "All coaching-specific tasks, meetings, and workflows will remain in your system",
    "You can still access your historical coaching data",
  ];

  if (hasProvisionedSubscription) {
    warnings.push(
      "Your subscription was provisioned by the coaching org - you may need to choose a new plan"
    );
  }

  return (
    <SafetyConfirmDialog
      trigger={trigger}
      title="End Coaching Relationship?"
      description={`This will terminate your engagement with ${coachingOrgName}.`}
      warningItems={warnings}
      confirmLabel="End Engagement"
      variant="destructive"
      requireExplicitConfirm
      confirmCheckboxLabel="I understand this will end my coaching relationship"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}

/**
 * Pre-configured dialog for enabling high-risk module access for coaches
 */
export function HighRiskAccessConfirmDialog({
  trigger,
  moduleName,
  riskLevel,
  onConfirm,
  isLoading,
}: {
  trigger: ReactNode;
  moduleName: string;
  riskLevel: "medium" | "high";
  onConfirm: () => void;
  isLoading?: boolean;
}) {
  const warnings =
    riskLevel === "high"
      ? [
          `Coaches will be able to view all ${moduleName} data`,
          "This includes potentially sensitive financial or personal information",
          "Consider if read-only access is sufficient",
        ]
      : [
          `Coaches will have access to ${moduleName} module`,
          "Review what data this module contains",
        ];

  return (
    <SafetyConfirmDialog
      trigger={trigger}
      title={`Enable ${moduleName} Access?`}
      description={`This will grant your coaching org access to the ${moduleName} module.`}
      warningItems={warnings}
      confirmLabel="Enable Access"
      variant={riskLevel === "high" ? "warning" : "default"}
      requireExplicitConfirm={riskLevel === "high"}
      confirmCheckboxLabel={`I want to share ${moduleName} data with my coach`}
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}
