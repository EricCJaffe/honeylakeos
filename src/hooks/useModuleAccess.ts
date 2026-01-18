import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";

/**
 * Module slugs that map to routes and database module records.
 * These should match the `slug` field in the `modules` table.
 * 
 * Note: "external_contacts" is not a separate module - it uses the "crm" module.
 */
export type ModuleKey =
  | "coaches"
  | "forms"
  | "projects"
  | "tasks"
  | "calendar"
  | "documents"
  | "notes"
  | "folders"
  | "groups"
  | "locations"
  | "workflows"
  | "lms"
  | "crm"
  | "sales"
  | "donors"
  | "finance"
  | "reports";

interface ModuleAccessResult {
  /** Whether the module is enabled for the company */
  isModuleEnabled: boolean;
  /** Whether the user has access to the module */
  hasAccess: boolean;
  /** Loading state */
  loading: boolean;
  /** Error if any */
  error: Error | null;
  /** The module status (active, trial, expired, suspended) */
  moduleStatus: string | null;
  /** Reason for no access (for UI display) */
  noAccessReason: "not_enabled" | "no_permission" | null;
}

/**
 * Hook to check if the current user has access to a specific module.
 * 
 * Access is granted if:
 * 1. The module is enabled for the active company (exists in company_modules with active/trial status)
 * 2. AND the user has permission via:
 *    - Being a company_admin
 *    - Being a module_admin (for this specific module - future enhancement)
 *    - Being a site admin or super admin
 * 
 * @param moduleKey - The module slug/key to check access for
 */
export function useModuleAccess(moduleKey: ModuleKey): ModuleAccessResult {
  const { 
    activeCompanyId, 
    isCompanyAdmin, 
    isSiteAdmin, 
    isSuperAdmin,
    activeMembership,
    loading: membershipLoading 
  } = useMembership();

  // Fetch company modules to check if module is enabled
  const { 
    data: companyModule, 
    isLoading: moduleLoading,
    error 
  } = useQuery({
    queryKey: ["company-module", activeCompanyId, moduleKey],
    queryFn: async () => {
      if (!activeCompanyId) return null;

      // First get the module ID from the modules table
      const { data: moduleData, error: moduleError } = await supabase
        .from("modules")
        .select("id, slug, name")
        .eq("slug", moduleKey)
        .maybeSingle();

      if (moduleError) throw moduleError;
      if (!moduleData) return null;

      // Then check if it's enabled for this company
      const { data: companyModuleData, error: companyModuleError } = await supabase
        .from("company_modules")
        .select("id, status, configuration, expires_at")
        .eq("company_id", activeCompanyId)
        .eq("module_id", moduleData.id)
        .maybeSingle();

      if (companyModuleError) throw companyModuleError;

      return companyModuleData;
    },
    enabled: !!activeCompanyId && !membershipLoading,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const loading = membershipLoading || moduleLoading;

  // Module is enabled if it exists with active or trial status
  const isModuleEnabled = !!companyModule && 
    (companyModule.status === "active" || companyModule.status === "trial");

  // Check if module is expired
  const isExpired = companyModule?.expires_at 
    ? new Date(companyModule.expires_at) < new Date()
    : false;

  // User has access if:
  // 1. Module is enabled (and not expired)
  // 2. User is company admin, site admin, super admin, or module_admin
  // For regular users, they also need the module to be enabled
  const hasPermission = 
    isCompanyAdmin || 
    isSiteAdmin || 
    isSuperAdmin ||
    activeMembership?.role === "module_admin";

  // Regular users (non-admin) can access if module is enabled
  const regularUserAccess = isModuleEnabled && !isExpired;

  // Admins can always access if module is enabled
  const hasAccess = isModuleEnabled && !isExpired && (hasPermission || regularUserAccess);

  // Determine reason for no access
  let noAccessReason: "not_enabled" | "no_permission" | null = null;
  if (!loading && !hasAccess) {
    if (!isModuleEnabled || isExpired) {
      noAccessReason = "not_enabled";
    } else {
      noAccessReason = "no_permission";
    }
  }

  return {
    isModuleEnabled: isModuleEnabled && !isExpired,
    hasAccess,
    loading,
    error: error as Error | null,
    moduleStatus: companyModule?.status || null,
    noAccessReason,
  };
}

/**
 * Core modules that are always available (don't require company_modules entry).
 * These MUST match the core modules list in the SQL is_module_enabled() function.
 * 
 * IMPORTANT: Keep in sync with the is_module_enabled function in database migrations.
 * SQL function defines: projects, tasks, calendar, documents, notes, folders, groups, locations
 */
export const CORE_MODULES: ModuleKey[] = [
  "projects",
  "tasks",
  "calendar",
  "documents",
  "notes",
  "folders",
  "groups",
  "locations",
  "finance",
  "reports",
];

/**
 * Premium modules that require explicit enablement via company_modules.
 * These have entries in the modules table and need to be enabled per-company.
 */
export const PREMIUM_MODULES: ModuleKey[] = [
  "forms",
  "workflows",
  "lms",
  "crm",
  "coaches",
  "sales",
  "donors",
];

/**
 * Hook for core modules - always accessible to company members
 * Core modules don't require company_modules entry
 */
export function useCoreModuleAccess(): { hasAccess: boolean; loading: boolean } {
  const { activeCompanyId, activeMembership, loading } = useMembership();
  
  return {
    hasAccess: !!activeCompanyId && !!activeMembership,
    loading,
  };
}
