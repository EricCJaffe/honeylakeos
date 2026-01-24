import { AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SafeEditWarningProps {
  isPublished: boolean;
  hasActiveRuns?: boolean;
  hasSubmissions?: boolean;
  entityType: "workflow" | "form";
}

export function SafeEditWarning({
  isPublished,
  hasActiveRuns = false,
  hasSubmissions = false,
  entityType,
}: SafeEditWarningProps) {
  if (!isPublished) {
    return null;
  }

  const hasActiveItems = hasActiveRuns || hasSubmissions;

  return (
    <Alert variant={hasActiveItems ? "destructive" : "default"} className="mb-4">
      {hasActiveItems ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Info className="h-4 w-4" />
      )}
      <AlertTitle>
        {hasActiveItems ? "Active Data Present" : "Editing Published Definition"}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        {hasActiveItems ? (
          <>
            <p>
              This {entityType} has{" "}
              {hasActiveRuns ? "active runs" : "existing submissions"} that may be
              affected by changes.
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Changes will only apply to <strong>future</strong> {entityType === "workflow" ? "runs" : "submissions"}</li>
              <li>Existing data will not be modified</li>
              <li>Deleting steps or fields with active data is blocked</li>
            </ul>
          </>
        ) : (
          <p>
            Any changes you make will only apply to future{" "}
            {entityType === "workflow" ? "runs" : "submissions"}. Existing{" "}
            {entityType === "workflow" ? "runs" : "submissions"} will continue using
            the original definition.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
