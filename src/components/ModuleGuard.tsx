import * as React from "react";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { ModuleKey, CORE_MODULES } from "@/hooks/useModuleAccess";
import { NoModuleAccessPage } from "@/components/NoModuleAccessPage";
import { Skeleton } from "@/components/ui/skeleton";
import { useMembership } from "@/lib/membership";

interface ModuleGuardProps {
  moduleKey: ModuleKey;
  moduleName: string;
  children: React.ReactNode;
}

/**
 * Wrapper component that guards access to a module.
 * 
 * For core modules (projects, tasks, etc.): Only checks company membership
 * For premium modules (forms, workflows, lms): Checks company_modules table
 * 
 * Shows loading state while checking access, then either renders children
 * or shows the NoModuleAccessPage.
 */
export function ModuleGuard({ moduleKey, moduleName, children }: ModuleGuardProps) {
  const isCoreModule = CORE_MODULES.includes(moduleKey);
  const { isEnabled, loading: modulesLoading } = useCompanyModules();
  const { activeCompanyId, activeMembership, loading: membershipLoading } = useMembership();

  const loading = modulesLoading || membershipLoading;

  // For core modules, only need company membership
  // For premium modules, need both membership and module enabled
  const hasAccess = React.useMemo(() => {
    if (!activeCompanyId || !activeMembership) return false;
    if (isCoreModule) return true;
    return isEnabled(moduleKey);
  }, [activeCompanyId, activeMembership, isCoreModule, isEnabled, moduleKey]);

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

  if (!hasAccess) {
    const noAccessReason = !activeCompanyId || !activeMembership 
      ? "no_permission" 
      : "not_enabled";
    
    return (
      <NoModuleAccessPage 
        moduleName={moduleName} 
        reason={noAccessReason} 
      />
    );
  }

  return <>{children}</>;
}
