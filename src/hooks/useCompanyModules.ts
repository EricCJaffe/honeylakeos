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

/**
 * Maps entity types to their corresponding module keys.
 * Used to determine module enablement for cross-module linking.
 */
export const ENTITY_TO_MODULE_MAP: Record<string, ModuleKey> = {
  task: "tasks",
  tasks: "tasks",
  project: "projects",
  projects: "projects",
  note: "notes",
  notes: "notes",
  document: "documents",
  documents: "documents",
  event: "calendar",
  calendar: "calendar",
  folder: "folders",
  folders: "folders",
  group: "groups",
  groups: "groups",
  location: "locations",
  locations: "locations",
  crm_client: "crm",
  crm: "crm",
  // External contacts are a shared system resource, not module-gated
  // They map to CRM for linking purposes but are always accessible
  external_contact: "crm",
};

interface UseCompanyModulesResult {
  /** All available modules in the system */
  modules: Module[];
  /** Modules enabled for the current company */
  companyModules: CompanyModule[];
  /** Check if a specific module is enabled */
  isEnabled: (moduleKey: ModuleKey) => boolean;
  /** Check if an entity type's module is enabled */
  isEntityModuleEnabled: (entityType: string) => boolean;
  /** Get module status (active, trial, suspended, etc.) */
  getModuleStatus: (moduleKey: ModuleKey) => string | null;
  /** Get list of enabled module keys */
  getEnabledModuleKeys: () => ModuleKey[];
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
   * Check if an entity type's corresponding module is enabled.
   * Useful for cross-module linking and entity operations.
   */
  const isEntityModuleEnabled = (entityType: string): boolean => {
    const moduleKey = ENTITY_TO_MODULE_MAP[entityType.toLowerCase()];
    if (!moduleKey) return false;
    return isEnabled(moduleKey);
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

  /**
   * Get list of all enabled module keys for the current company.
   */
  const getEnabledModuleKeys = (): ModuleKey[] => {
    const enabledKeys: ModuleKey[] = [];
    
    // Add core modules if company is active
    if (activeCompanyId) {
      enabledKeys.push(...CORE_MODULES);
    }
    
    // Add enabled premium modules
    companyModules.forEach((cm) => {
      if (cm.module?.slug) {
        const isActiveStatus = cm.status === "active" || cm.status === "trial";
        const isExpired = cm.expires_at
          ? new Date(cm.expires_at) < new Date()
          : false;
        if (isActiveStatus && !isExpired && !enabledKeys.includes(cm.module.slug as ModuleKey)) {
          enabledKeys.push(cm.module.slug as ModuleKey);
        }
      }
    });
    
    return enabledKeys;
  };

  return {
    modules,
    companyModules,
    isEnabled,
    isEntityModuleEnabled,
    getModuleStatus,
    getEnabledModuleKeys,
    loading,
    error: error as Error | null,
  };
}
