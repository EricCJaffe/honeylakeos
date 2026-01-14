import * as React from "react";
import { useModuleAccess, ModuleKey, CORE_MODULES, useCoreModuleAccess } from "@/hooks/useModuleAccess";
import { NoModuleAccessPage } from "@/components/NoModuleAccessPage";
import { Skeleton } from "@/components/ui/skeleton";

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
  
  // Use different access check for core vs premium modules
  const coreAccess = useCoreModuleAccess();
  const premiumAccess = useModuleAccess(moduleKey);
  
  const { hasAccess, loading, noAccessReason } = isCoreModule 
    ? { ...coreAccess, noAccessReason: null as "not_enabled" | "no_permission" | null }
    : premiumAccess;

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
    return (
      <NoModuleAccessPage 
        moduleName={moduleName} 
        reason={noAccessReason || "not_enabled"} 
      />
    );
  }

  return <>{children}</>;
}
