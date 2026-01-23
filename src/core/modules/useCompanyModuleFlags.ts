/**
 * Feature Flags Loader with Safe Mode Fallback
 * 
 * Loads company-specific module flags from Supabase.
 * If loading fails, enters SAFE MODE where only core modules are enabled.
 */

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { useCallback, useMemo, createContext, useContext, ReactNode } from "react";
import { MODULE_REGISTRY, ModuleId, isModuleEnabled as checkModuleEnabled } from "./moduleRegistry";
import { toast } from "sonner";

// ============= TYPES =============

export interface FeatureFlagRow {
  id: string;
  company_id: string;
  module_id: string;
  enabled: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface UseCompanyModuleFlagsResult {
  /** Map of moduleId to enabled state */
  flags: Map<string, boolean>;
  /** Whether flags are still loading */
  isLoading: boolean;
  /** Whether we're in safe mode (flags failed to load) */
  isSafeMode: boolean;
  /** Error if flags failed to load */
  error: Error | null;
  /** Check if a specific module is enabled */
  isModuleEnabled: (moduleId: ModuleId) => boolean;
  /** Toggle a module's enabled state (admin only) */
  toggleModule: (moduleId: ModuleId, enabled: boolean) => Promise<void>;
  /** Refetch flags */
  refetch: () => void;
}

// ============= QUERY KEY =============

const FEATURE_FLAGS_KEY = "feature-flags";

export function featureFlagsQueryKey(companyId: string | null) {
  return [FEATURE_FLAGS_KEY, companyId] as const;
}

// ============= HOOK =============

export function useCompanyModuleFlags(): UseCompanyModuleFlagsResult {
  const { activeCompanyId, isCompanyAdmin } = useMembership();
  const queryClient = useQueryClient();

  // Fetch flags from Supabase
  const {
    data: flagRows,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: featureFlagsQueryKey(activeCompanyId),
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .eq("company_id", activeCompanyId);

      if (error) throw error;
      return data as FeatureFlagRow[];
    },
    enabled: !!activeCompanyId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });

  // Determine if we're in safe mode (flags failed to load)
  const isSafeMode = !!error;

  // Convert array to Map for efficient lookup
  const flags = useMemo(() => {
    const map = new Map<string, boolean>();
    if (flagRows) {
      for (const row of flagRows) {
        map.set(row.module_id, row.enabled);
      }
    }
    return map;
  }, [flagRows]);

  // Check if a module is enabled
  const isModuleEnabled = useCallback(
    (moduleId: ModuleId): boolean => {
      const module = MODULE_REGISTRY[moduleId];
      if (!module) return false;

      // In safe mode, only core modules are enabled
      if (isSafeMode) {
        return module.isCore;
      }

      return checkModuleEnabled(moduleId, flags);
    },
    [flags, isSafeMode]
  );

  // Toggle module mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ moduleId, enabled }: { moduleId: ModuleId; enabled: boolean }) => {
      if (!activeCompanyId) throw new Error("No active company");
      if (!isCompanyAdmin) throw new Error("Admin access required");

      const module = MODULE_REGISTRY[moduleId];
      if (module?.isCore) throw new Error("Cannot disable core modules");

      // Check if flag exists
      const { data: existing } = await supabase
        .from("feature_flags")
        .select("id")
        .eq("company_id", activeCompanyId)
        .eq("module_id", moduleId)
        .maybeSingle();

      if (existing) {
        // Update existing flag
        const { error } = await supabase
          .from("feature_flags")
          .update({ 
            enabled,
            updated_by: (await supabase.auth.getUser()).data.user?.id 
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new flag
        const { error } = await supabase
          .from("feature_flags")
          .insert({
            company_id: activeCompanyId,
            module_id: moduleId,
            enabled,
            updated_by: (await supabase.auth.getUser()).data.user?.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: (_, { moduleId, enabled }) => {
      queryClient.invalidateQueries({ queryKey: featureFlagsQueryKey(activeCompanyId) });
      const module = MODULE_REGISTRY[moduleId];
      toast.success(`${module?.name || moduleId} ${enabled ? "enabled" : "disabled"}`);
    },
    onError: (error) => {
      toast.error(`Failed to update module: ${error.message}`);
    },
  });

  const toggleModule = useCallback(
    async (moduleId: ModuleId, enabled: boolean) => {
      await toggleMutation.mutateAsync({ moduleId, enabled });
    },
    [toggleMutation]
  );

  return {
    flags,
    isLoading,
    isSafeMode,
    error: error as Error | null,
    isModuleEnabled,
    toggleModule,
    refetch,
  };
}

// ============= CONTEXT (Optional) =============

/**
 * For components that need module flags without re-fetching,
 * they can use this context provider pattern.
 */

interface ModuleFlagsContextValue extends UseCompanyModuleFlagsResult {}

const ModuleFlagsContext = createContext<ModuleFlagsContextValue | null>(null);

export function ModuleFlagsProvider({ children }: { children: ReactNode }) {
  const flags = useCompanyModuleFlags();
  
  return React.createElement(
    ModuleFlagsContext.Provider,
    { value: flags },
    children
  );
}

export function useModuleFlags(): ModuleFlagsContextValue {
  const context = useContext(ModuleFlagsContext);
  if (!context) {
    throw new Error("useModuleFlags must be used within ModuleFlagsProvider");
  }
  return context;
}
