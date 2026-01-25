/**
 * Module Flag Guard
 * 
 * Wraps module routes to enforce feature flag checks.
 * Shows ModuleDisabledPage if the module is disabled.
 * Falls back gracefully if flags are loading or in safe mode.
 */

import { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanyModuleFlags } from "./useCompanyModuleFlags";
import { ModuleDisabledPage } from "./ModuleDisabledPage";
import { MODULE_REGISTRY, ModuleId } from "./moduleRegistry";

interface ModuleFlagGuardProps {
  moduleId: ModuleId;
  children: ReactNode;
}

export function ModuleFlagGuard({ moduleId, children }: ModuleFlagGuardProps) {
  const { isModuleEnabled, isLoading, isSafeMode } = useCompanyModuleFlags();

  const module = MODULE_REGISTRY[moduleId];

  // Show loading skeleton while flags are loading
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // In safe mode, only core modules are accessible
  if (isSafeMode && !module?.isCore) {
    return <ModuleDisabledPage module={module} />;
  }

  // Check if module is enabled
  if (!isModuleEnabled(moduleId)) {
    return <ModuleDisabledPage module={module} />;
  }

  return <>{children}</>;
}

/**
 * Higher-order component version for use in route definitions.
 */
export function withModuleFlagGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  moduleId: ModuleId
) {
  return function GuardedComponent(props: P) {
    return (
      <ModuleFlagGuard moduleId={moduleId}>
        <WrappedComponent {...props} />
      </ModuleFlagGuard>
    );
  };
}
