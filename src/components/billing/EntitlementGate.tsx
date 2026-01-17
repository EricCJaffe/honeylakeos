import { ReactNode } from "react";
import { useEntitlementGuard, type EntitlementKey } from "@/hooks/useEntitlements";
import { UpgradePrompt } from "./PlanDisplay";
import { Skeleton } from "@/components/ui/skeleton";

interface EntitlementGateProps {
  entitlement: EntitlementKey;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  featureName?: string;
  onUpgrade?: () => void;
}

/**
 * Gate component that shows children only if entitlement is granted.
 * Shows upgrade prompt or fallback otherwise.
 */
export function EntitlementGate({
  entitlement,
  children,
  fallback,
  showUpgradePrompt = true,
  featureName,
  onUpgrade,
}: EntitlementGateProps) {
  const { isLoading, isAllowed, showUpgradePrompt: shouldShowPrompt } = useEntitlementGuard(entitlement);

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (isAllowed) {
    return <>{children}</>;
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
 */
export function useFeatureGate(entitlement: EntitlementKey) {
  const { isLoading, isAllowed, isGrace, planTier } = useEntitlementGuard(entitlement);

  return {
    isLoading,
    isAllowed,
    isGrace,
    planTier,
    // Helper to conditionally render
    when: (allowed: ReactNode, notAllowed?: ReactNode) => 
      isAllowed ? allowed : notAllowed ?? null,
  };
}
