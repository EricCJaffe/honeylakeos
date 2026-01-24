import * as React from "react";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { ModuleKey, CORE_MODULES } from "@/hooks/useModuleAccess";
import { NoModuleAccessPage } from "@/components/NoModuleAccessPage";
import { Skeleton } from "@/components/ui/skeleton";
import { useMembership } from "@/lib/membership";
import { useCompanyModuleFlags, legacyModuleKeyToModuleId, ModuleDisabledPage } from "@/core/modules";

interface ModuleGuardProps {
  moduleKey: ModuleKey;
  moduleName: string;
  children: React.ReactNode;
}

/**
 * Wrapper component that guards access to a module.
 * 
 * Checks both legacy (company_modules) and new (feature_flags) systems:
 * - Core modules: Only checks company membership
 * - Premium modules: Checks company_modules table AND feature_flags table
 * 
 * Shows loading state while checking access, then either renders children
 * or shows the appropriate access denied page.
 */
export function ModuleGuard({ moduleKey, moduleName, children }: ModuleGuardProps) {
  const isCoreModule = CORE_MODULES.includes(moduleKey);
  const { isEnabled, loading: modulesLoading } = useCompanyModules();
  const { activeCompanyId, activeMembership, loading: membershipLoading } = useMembership();
  const { 
    isModuleEnabled: isModuleFlagEnabled, 
    isLoading: flagsLoading, 
    isSafeMode 
  } = useCompanyModuleFlags();

  const loading = modulesLoading || membershipLoading || flagsLoading;

  // Map legacy moduleKey to new ModuleId for flag checking
  const moduleId = legacyModuleKeyToModuleId(moduleKey);

  // Determine access based on multiple checks
  const accessResult = React.useMemo(() => {
    // Check basic membership
    if (!activeCompanyId || !activeMembership) {
      return { hasAccess: false, reason: "no_permission" as const };
    }

    // Core modules always accessible if member
    if (isCoreModule) {
      return { hasAccess: true, reason: null };
    }

    // Check legacy company_modules table
    if (!isEnabled(moduleKey)) {
      return { hasAccess: false, reason: "not_enabled" as const };
    }

    // Check new feature_flags table
    if (moduleId) {
      // In safe mode, non-core modules are disabled
      if (isSafeMode) {
        return { hasAccess: false, reason: "flag_disabled" as const };
      }
      
      if (!isModuleFlagEnabled(moduleId)) {
        return { hasAccess: false, reason: "flag_disabled" as const };
      }
    }

    return { hasAccess: true, reason: null };
  }, [
    activeCompanyId, 
    activeMembership, 
    isCoreModule, 
    isEnabled, 
    moduleKey, 
    moduleId, 
    isSafeMode, 
    isModuleFlagEnabled
  ]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!accessResult.hasAccess) {
    // Show different pages based on reason
    if (accessResult.reason === "flag_disabled") {
      return <ModuleDisabledPage moduleName={moduleName} />;
    }
    
    return (
      <NoModuleAccessPage 
        moduleName={moduleName} 
        reason={accessResult.reason || "not_enabled"} 
      />
    );
  }

  return <>{children}</>;
}
