import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Package, CheckCircle, Lock } from "lucide-react";
import { useProgramKey } from "@/hooks/useProgramKey";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProgramKeyIndicatorProps {
  /** Display mode */
  variant?: "badge" | "card" | "inline";
  /** Show change warning */
  showChangeWarning?: boolean;
  /** Override coaching org ID */
  coachingOrgId?: string | null;
}

/**
 * UI indicator for displaying the active program in Org Settings.
 * Shows program pack name, version, and warning about post-setup changes.
 */
export function ProgramKeyIndicator({
  variant = "card",
  showChangeWarning = true,
  coachingOrgId,
}: ProgramKeyIndicatorProps) {
  const { programKey, programPack, isLoading, canChangeProgram } = useProgramKey(coachingOrgId);

  if (isLoading) {
    if (variant === "badge") {
      return <Skeleton className="h-5 w-20" />;
    }
    if (variant === "inline") {
      return <Skeleton className="h-4 w-24 inline-block" />;
    }
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
      </Card>
    );
  }

  // Badge variant - simple inline display
  if (variant === "badge") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={programKey === "generic" ? "secondary" : "default"}
              className="gap-1"
            >
              <Package className="h-3 w-3" />
              {programPack?.name || programKey}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Active Program Pack</p>
            {programPack?.version && (
              <p className="text-xs text-muted-foreground">Version {programPack.version}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Inline variant - minimal text display
  if (variant === "inline") {
    return (
      <span className="inline-flex items-center gap-1 text-sm">
        <Package className="h-3 w-3 text-muted-foreground" />
        <span className="font-medium">{programPack?.name || programKey}</span>
        {programPack?.version && (
          <span className="text-muted-foreground text-xs">v{programPack.version}</span>
        )}
      </span>
    );
  }

  // Card variant - full display for settings
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Program Pack</CardTitle>
          </div>
          <Badge 
            variant={programKey === "generic" ? "secondary" : "default"}
          >
            {programKey === "generic" ? "Standard" : programKey}
          </Badge>
        </div>
        {programPack?.description && (
          <CardDescription>{programPack.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Pack Name</span>
          <span className="font-medium">{programPack?.name || "Generic"}</span>
        </div>
        {programPack?.version && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium">{programPack.version}</span>
          </div>
        )}
        
        {showChangeWarning && !canChangeProgram && (
          <div className="flex items-start gap-2 p-3 mt-2 rounded-md bg-warning/10 border border-warning/20">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-warning">Program Change Restricted</p>
              <p className="text-muted-foreground">
                This organization has customized workflows. Changing the program pack requires
                a manual reseed and may affect existing data.
              </p>
            </div>
          </div>
        )}
        
        {showChangeWarning && canChangeProgram && (
          <div className="flex items-start gap-2 p-3 mt-2 rounded-md bg-muted">
            <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Ready for Configuration</p>
              <p className="text-muted-foreground">
                No custom workflows yet. You can change the program pack if needed.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================
// Source Pack Badge Component
// =============================================

interface SourcePackBadgeProps {
  sourcePackKey: string;
  isDefault?: boolean;
  size?: "sm" | "default";
}

/**
 * Badge showing the source pack for workflows/forms.
 * Indicates whether it's using default fallback or pack-specific version.
 */
export function SourcePackBadge({ 
  sourcePackKey, 
  isDefault = false,
  size = "default" 
}: SourcePackBadgeProps) {
  const sizeClasses = size === "sm" ? "text-xs px-1.5 py-0" : "";

  if (isDefault) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`gap-1 ${sizeClasses}`}>
              <span className="text-muted-foreground">Fallback</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Using generic template (no {sourcePackKey} variant available)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const packLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    generic: { label: "Standard", variant: "secondary" },
    convene: { label: "Convene", variant: "default" },
    c12: { label: "C12", variant: "default" },
    eos: { label: "EOS", variant: "default" },
  };

  const packInfo = packLabels[sourcePackKey] || { label: sourcePackKey, variant: "outline" as const };

  return (
    <Badge variant={packInfo.variant} className={sizeClasses}>
      {packInfo.label}
    </Badge>
  );
}

// =============================================
// Locked Indicator Component
// =============================================

interface LockedIndicatorProps {
  isLocked: boolean;
  reason?: string;
  size?: "sm" | "default";
}

/**
 * Indicator showing if an asset is locked (non-editable).
 */
export function LockedIndicator({ isLocked, reason, size = "default" }: LockedIndicatorProps) {
  if (!isLocked) return null;

  const sizeClasses = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Lock className={`${sizeClasses} text-muted-foreground`} />
        </TooltipTrigger>
        <TooltipContent>
          <p>{reason || "This item cannot be edited"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ProgramKeyIndicator;
