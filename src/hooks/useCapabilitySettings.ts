import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useMembership } from "@/lib/membership";
import { useAuditLog } from "./useAuditLog";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

export interface CompanyCapabilitySettings {
  company_id: string;
  crm_member_manage_enabled: boolean;
  contacts_member_manage_enabled: boolean;
  coaches_member_manage_enabled: boolean;
  forms_member_manage_enabled: boolean;
  forms_member_publish_enabled: boolean;
  lms_member_manage_enabled: boolean;
  lms_member_publish_enabled: boolean;
  updated_at: string;
  updated_by: string | null;
}

export type CapabilityFlag = keyof Omit<CompanyCapabilitySettings, 'company_id' | 'updated_at' | 'updated_by'>;

/**
 * Default capability settings - all permissive
 */
export const DEFAULT_CAPABILITY_SETTINGS: Omit<CompanyCapabilitySettings, 'company_id' | 'updated_at' | 'updated_by'> = {
  crm_member_manage_enabled: true,
  contacts_member_manage_enabled: true,
  coaches_member_manage_enabled: true,
  forms_member_manage_enabled: true,
  forms_member_publish_enabled: true,
  lms_member_manage_enabled: true,
  lms_member_publish_enabled: true,
};

/**
 * Human-readable labels for capability flags
 */
export const CAPABILITY_LABELS: Record<CapabilityFlag, { label: string; description: string }> = {
  crm_member_manage_enabled: {
    label: "CRM Management",
    description: "Allow regular members to create, edit, and archive CRM records",
  },
  contacts_member_manage_enabled: {
    label: "External Contacts Management",
    description: "Allow regular members to create, edit, and archive external contacts",
  },
  coaches_member_manage_enabled: {
    label: "Coaches & Partners Management",
    description: "Allow regular members to create, edit, and archive coach/partner profiles",
  },
  forms_member_manage_enabled: {
    label: "Forms Management",
    description: "Allow regular members to create and edit forms",
  },
  forms_member_publish_enabled: {
    label: "Forms Publishing",
    description: "Allow regular members to publish and unpublish forms",
  },
  lms_member_manage_enabled: {
    label: "LMS Management",
    description: "Allow regular members to create and edit courses, cohorts, and sessions",
  },
  lms_member_publish_enabled: {
    label: "LMS Publishing",
    description: "Allow regular members to publish and archive courses",
  },
};

// ============================================================================
// Query Keys
// ============================================================================

const QUERY_KEYS = {
  settings: (companyId: string) => ["capability-settings", companyId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch capability settings for the active company.
 * Returns default (permissive) settings if no record exists.
 */
export function useCapabilitySettings() {
  const { activeCompanyId } = useActiveCompany();
  const { isCompanyAdmin, isSiteAdmin, isSuperAdmin } = useMembership();
  const { log } = useAuditLog();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.settings(activeCompanyId ?? ""),
    queryFn: async (): Promise<CompanyCapabilitySettings> => {
      if (!activeCompanyId) {
        return {
          company_id: "",
          ...DEFAULT_CAPABILITY_SETTINGS,
          updated_at: new Date().toISOString(),
          updated_by: null,
        };
      }

      const { data, error } = await supabase
        .from("company_capability_settings")
        .select("*")
        .eq("company_id", activeCompanyId)
        .maybeSingle();

      if (error) throw error;

      // Return existing settings or defaults
      if (data) {
        return data as CompanyCapabilitySettings;
      }

      // Return default settings if none exist
      return {
        company_id: activeCompanyId,
        ...DEFAULT_CAPABILITY_SETTINGS,
        updated_at: new Date().toISOString(),
        updated_by: null,
      };
    },
    enabled: !!activeCompanyId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Omit<CompanyCapabilitySettings, 'company_id' | 'updated_at' | 'updated_by'>>) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: user } = await supabase.auth.getUser();

      // Try to upsert - insert if doesn't exist, update if it does
      const { data, error } = await supabase
        .from("company_capability_settings")
        .upsert(
          {
            company_id: activeCompanyId,
            ...DEFAULT_CAPABILITY_SETTINGS,
            ...query.data,
            ...updates,
            updated_by: user.user?.id || null,
          },
          { onConflict: "company_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return { settings: data as CompanyCapabilitySettings, updates };
    },
    onSuccess: async ({ settings, updates }) => {
      queryClient.setQueryData(QUERY_KEYS.settings(activeCompanyId!), settings);
      
      // Invalidate permission-related queries
      queryClient.invalidateQueries({ queryKey: ["capability-settings"] });
      
      // Log audit event with changed flags
      const changedFlags = Object.entries(updates)
        .filter(([key, value]) => value !== undefined)
        .reduce((acc, [key, value]) => {
          acc[key] = { 
            new: value, 
            old: query.data ? (query.data as any)[key] : DEFAULT_CAPABILITY_SETTINGS[key as CapabilityFlag]
          };
          return acc;
        }, {} as Record<string, { old: boolean; new: boolean }>);

      await log("capability.settings_updated", "company", activeCompanyId!, {
        changed_flags: changedFlags,
      });

      toast.success("Capability settings updated");
    },
    onError: (error) => {
      console.error("Failed to update capability settings:", error);
      toast.error("Failed to update settings");
    },
  });

  /**
   * Check if the current user has a specific capability.
   * Admins always have all capabilities.
   * Regular members are checked against the capability flags.
   */
  const hasCapability = (flag: CapabilityFlag): boolean => {
    // Admins always have all capabilities
    if (isCompanyAdmin || isSiteAdmin || isSuperAdmin) {
      return true;
    }

    // Check the capability flag for regular members
    const settings = query.data;
    if (!settings) {
      // Default to permissive if settings haven't loaded
      return DEFAULT_CAPABILITY_SETTINGS[flag];
    }

    return settings[flag];
  };

  return {
    settings: query.data ?? {
      company_id: activeCompanyId ?? "",
      ...DEFAULT_CAPABILITY_SETTINGS,
      updated_at: new Date().toISOString(),
      updated_by: null,
    },
    isLoading: query.isLoading,
    error: query.error,
    canEdit: isCompanyAdmin || isSiteAdmin || isSuperAdmin,
    hasCapability,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}

/**
 * Lightweight hook to check a specific capability.
 * Use this when you only need to check one capability.
 */
export function useHasCapability(flag: CapabilityFlag): { hasCapability: boolean; loading: boolean } {
  const { hasCapability, isLoading } = useCapabilitySettings();
  
  return {
    hasCapability: hasCapability(flag),
    loading: isLoading,
  };
}
