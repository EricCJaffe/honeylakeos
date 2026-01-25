import { ReactNode } from "react";
import { useCanPerformAction } from "@/hooks/useEntitlements";
import { useMembership } from "@/lib/membership";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

type LimitAction = "add_user" | "add_framework" | "publish_framework" | "add_client";

interface LimitGuardProps {
  action: LimitAction;
  children: ReactNode;
  /** Show inline alert instead of disabling */
  showAlert?: boolean;
  /** Custom message when limit reached */
  limitMessage?: string;
  /** Callback when upgrade is clicked */
  onUpgrade?: () => void;
}

/**
 * Guards an action button/form against plan limits.
 * 
 * BEHAVIOR:
 * - Admin override: Company admins and site admins always allowed
 * - Grace period: Allow actions
 * - Expired: Prevent new creation only
 * - Existing data remains usable
 */
export function LimitGuard({
  action,
  children,
  showAlert = false,
  limitMessage,
  onUpgrade,
}: LimitGuardProps) {
  const navigate = useNavigate();
  const { isCompanyAdmin, isSiteAdmin } = useMembership();
  const isAdmin = isCompanyAdmin || isSiteAdmin;
  
  const {
    isLoading,
    canPerform,
    wouldExceedLimit,
    message,
    isExpired,
    current,
    limit,
  } = useCanPerformAction(action);

  // Admin override
  if (isAdmin) {
    return <>{children}</>;
  }

  // Loading state - allow action
  if (isLoading) {
    return <>{children}</>;
  }

  // Can perform - allow action
  if (canPerform) {
    return <>{children}</>;
  }

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate("/app/admin/plans-usage");
    }
  };

  // Show alert mode
  if (showAlert) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive" className="bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{limitMessage || message}</span>
            <Button size="sm" variant="outline" onClick={handleUpgrade}>
              {isExpired ? "Renew Plan" : "Upgrade"}
            </Button>
          </AlertDescription>
        </Alert>
        {children}
      </div>
    );
  }

  // Disable mode - wrap children with tooltip
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-block">
          <div className="pointer-events-none opacity-50">
            {children}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="flex items-start gap-2">
          <Lock className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              {isExpired ? "Plan Expired" : "Limit Reached"}
            </p>
            <p className="text-xs text-muted-foreground">
              {limitMessage || message}
            </p>
            <p className="text-xs mt-1">
              Current: {current} / {limit}
            </p>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Hook to check if an action can be performed with soft limit enforcement
 */
export function useLimitCheck(action: LimitAction) {
  const { isCompanyAdmin, isSiteAdmin } = useMembership();
  const isAdmin = isCompanyAdmin || isSiteAdmin;
  
  const result = useCanPerformAction(action);

  return {
    ...result,
    // Admin override
    canPerform: isAdmin || result.canPerform,
    isAdmin,
  };
}
