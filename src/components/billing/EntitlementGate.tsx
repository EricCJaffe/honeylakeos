import { ReactNode } from "react";
import { useEntitlementGuard, type EntitlementKey } from "@/hooks/useEntitlements";
import { UpgradePrompt, GracePeriodWarning } from "./PlanDisplay";
import { Skeleton } from "@/components/ui/skeleton";
import { useMembership } from "@/lib/membership";

interface EntitlementGateProps {
  entitlement: EntitlementKey;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  featureName?: string;
  onUpgrade?: () => void;
  /** If true, bypasses all entitlement checks for admins */
  respectAdminOverride?: boolean;
}

/**
 * Gate component that shows children only if entitlement is granted.
 * Shows upgrade prompt or fallback otherwise.
 * 
 * BEHAVIOR:
 * - Company Admin / Site Admin override always allowed (when respectAdminOverride=true)
 * - During grace period: allow access + show warnings
 * - When expired: read-only for restricted features
 * - Never delete data or break dashboards
 */
export function EntitlementGate({
  entitlement,
  children,
  fallback,
  showUpgradePrompt = true,
  featureName,
  onUpgrade,
  respectAdminOverride = true,
}: EntitlementGateProps) {
  const { isCompanyAdmin, isSiteAdmin } = useMembership();
  const isAdmin = isCompanyAdmin || isSiteAdmin;
  
  const { 
    isLoading, 
    isAllowed, 
    showUpgradePrompt: shouldShowPrompt,
    showGraceWarning,
    graceDaysRemaining,
  } = useEntitlementGuard(entitlement, { 
    isAdmin: respectAdminOverride ? isAdmin : false 
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  // Admin override - always allow
  if (respectAdminOverride && isAdmin) {
    return <>{children}</>;
  }

  if (isAllowed) {
    return (
      <>
        {showGraceWarning && graceDaysRemaining !== undefined && (
          <GracePeriodWarning expiresAt={new Date(Date.now() + graceDaysRemaining * 24 * 60 * 60 * 1000).toISOString()} />
        )}
        {children}
      </>
    );
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt && shouldShowPrompt) {
    return (
      <UpgradePrompt 
        feature={featureName || entitlement.replace(/_/g, " ")} 
        onUpgrade={onUpgrade}
      />
    );
  }

  return null;
}

/**
 * Hook-based gate for conditional rendering in components
 * Respects admin override by default
 */
export function useFeatureGate(entitlement: EntitlementKey) {
  const { isCompanyAdmin, isSiteAdmin } = useMembership();
  const isAdmin = isCompanyAdmin || isSiteAdmin;
  
  const { 
    isLoading, 
    isAllowed, 
    isGrace, 
    planTier,
    readOnlyMode,
    graceDaysRemaining,
  } = useEntitlementGuard(entitlement, { isAdmin });

  // Admin override
  const effectivelyAllowed = isAdmin || isAllowed;

  return {
    isLoading,
    isAllowed: effectivelyAllowed,
    isGrace,
    planTier,
    readOnlyMode: readOnlyMode && !isAdmin,
    graceDaysRemaining,
    isAdmin,
    // Helper to conditionally render
    when: (allowed: ReactNode, notAllowed?: ReactNode) => 
      effectivelyAllowed ? allowed : notAllowed ?? null,
  };
}
