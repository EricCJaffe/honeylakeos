import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { ModuleKey, CORE_MODULES } from "./useModuleAccess";

interface Module {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  is_public: boolean;
}

interface CompanyModule {
  id: string;
  module_id: string;
  status: string;
  expires_at: string | null;
  module: Module;
}

interface UseCompanyModulesResult {
  /** All available modules in the system */
  modules: Module[];
  /** Modules enabled for the current company */
  companyModules: CompanyModule[];
  /** Check if a specific module is enabled */
  isEnabled: (moduleKey: ModuleKey) => boolean;
  /** Get module status (active, trial, suspended, etc.) */
  getModuleStatus: (moduleKey: ModuleKey) => string | null;
  /** Loading state */
  loading: boolean;
  /** Error if any */
  error: Error | null;
}

/**
 * Hook to fetch and check all module states for the current company.
 * Provides a centralized way to check module enablement for UI gating.
 */
export function useCompanyModules(): UseCompanyModulesResult {
  const { activeCompanyId, loading: membershipLoading } = useMembership();

  // Fetch all available modules
  const {
    data: modules = [],
    isLoading: modulesLoading,
    error: modulesError,
  } = useQuery({
    queryKey: ["modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Module[];
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Fetch company's enabled modules with module details
  const {
    data: companyModules = [],
    isLoading: companyModulesLoading,
    error: companyModulesError,
  } = useQuery({
    queryKey: ["company-modules-full", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("company_modules")
        .select(`
          id,
          module_id,
          status,
          expires_at,
          module:modules(id, name, slug, description, category, is_public)
        `)
        .eq("company_id", activeCompanyId);
      if (error) throw error;
      
      // Transform the data to flatten the module relation
      return data.map((cm: any) => ({
        ...cm,
        module: cm.module as Module,
      })) as CompanyModule[];
    },
    enabled: !!activeCompanyId && !membershipLoading,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const loading = membershipLoading || modulesLoading || companyModulesLoading;
  const error = modulesError || companyModulesError;

  /**
   * Check if a module is enabled for the current company.
   * Core modules are always enabled.
   * Premium modules require an active or trial status in company_modules.
   */
  const isEnabled = (moduleKey: ModuleKey): boolean => {
    // Core modules are always enabled
    if (CORE_MODULES.includes(moduleKey)) {
      return !!activeCompanyId;
    }

    // Find the module in company modules
    const companyModule = companyModules.find(
      (cm) => cm.module?.slug === moduleKey
    );

    if (!companyModule) return false;

    // Check status
    const isActiveStatus = companyModule.status === "active" || companyModule.status === "trial";

    // Check expiration
    const isExpired = companyModule.expires_at
      ? new Date(companyModule.expires_at) < new Date()
      : false;

    return isActiveStatus && !isExpired;
  };

  /**
   * Get the status of a module for the current company.
   */
  const getModuleStatus = (moduleKey: ModuleKey): string | null => {
    if (CORE_MODULES.includes(moduleKey)) {
      return "active"; // Core modules are always active
    }

    const companyModule = companyModules.find(
      (cm) => cm.module?.slug === moduleKey
    );

    return companyModule?.status || null;
  };

  return {
    modules,
    companyModules,
    isEnabled,
    getModuleStatus,
    loading,
    error: error as Error | null,
  };
}
