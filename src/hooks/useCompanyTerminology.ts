import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { toast } from "sonner";

// Default terminology definitions
export const DEFAULT_TERMINOLOGY: Record<string, { singular: string; plural: string }> = {
  crm_client: { singular: "Client", plural: "Clients" },
  company: { singular: "Company", plural: "Companies" },
};

// Preset options for terminology selection
export const TERMINOLOGY_PRESETS: Record<string, Array<{ singular: string; plural: string }>> = {
  crm_client: [
    { singular: "Client", plural: "Clients" },
    { singular: "Customer", plural: "Customers" },
    { singular: "Donor", plural: "Donors" },
    { singular: "Patient", plural: "Patients" },
    { singular: "Member", plural: "Members" },
    { singular: "Contact", plural: "Contacts" },
  ],
  company: [
    { singular: "Company", plural: "Companies" },
    { singular: "Organization", plural: "Organizations" },
    { singular: "Church", plural: "Churches" },
    { singular: "Practice", plural: "Practices" },
    { singular: "Business", plural: "Businesses" },
    { singular: "Team", plural: "Teams" },
  ],
};

export interface TerminologyEntry {
  id: string;
  company_id: string;
  term_key: string;
  singular_label: string;
  plural_label: string;
  updated_at: string;
  updated_by: string | null;
}

export interface TerminologyMap {
  [key: string]: {
    singular: string;
    plural: string;
  };
}

/**
 * Hook to access and manage company-scoped terminology
 * Provides singular/plural labels with safe fallbacks to defaults
 */
export function useCompanyTerminology() {
  const { activeCompanyId, isCompanyAdmin } = useActiveCompany();
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  // Fetch all terminology for the active company
  const { data: terminologyEntries, isLoading, error } = useQuery({
    queryKey: ["company-terminology", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("company_terminology")
        .select("*")
        .eq("company_id", activeCompanyId);

      if (error) throw error;
      return data as TerminologyEntry[];
    },
    enabled: !!activeCompanyId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes (frequently read, rarely written)
  });

  // Build terminology map with defaults
  const terminology: TerminologyMap = { ...DEFAULT_TERMINOLOGY };
  
  if (terminologyEntries) {
    for (const entry of terminologyEntries) {
      terminology[entry.term_key] = {
        singular: entry.singular_label,
        plural: entry.plural_label,
      };
    }
  }

  /**
   * Get the singular label for a term key
   * Falls back to default if not customized
   */
  const getSingular = (termKey: string): string => {
    return terminology[termKey]?.singular ?? DEFAULT_TERMINOLOGY[termKey]?.singular ?? termKey;
  };

  /**
   * Get the plural label for a term key
   * Falls back to default if not customized
   */
  const getPlural = (termKey: string): string => {
    return terminology[termKey]?.plural ?? DEFAULT_TERMINOLOGY[termKey]?.plural ?? `${termKey}s`;
  };

  /**
   * Get both singular and plural labels for a term key
   */
  const getLabels = (termKey: string): { singular: string; plural: string } => {
    return {
      singular: getSingular(termKey),
      plural: getPlural(termKey),
    };
  };

  /**
   * Check if a term has been customized from defaults
   */
  const isCustomized = (termKey: string): boolean => {
    const entry = terminologyEntries?.find((e) => e.term_key === termKey);
    if (!entry) return false;
    
    const defaults = DEFAULT_TERMINOLOGY[termKey];
    if (!defaults) return true;
    
    return entry.singular_label !== defaults.singular || entry.plural_label !== defaults.plural;
  };

  // Mutation to update terminology
  const updateTerminology = useMutation({
    mutationFn: async ({
      termKey,
      singular,
      plural,
    }: {
      termKey: string;
      singular: string;
      plural: string;
    }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;

      // Upsert the terminology entry
      const { data, error } = await supabase
        .from("company_terminology")
        .upsert(
          {
            company_id: activeCompanyId,
            term_key: termKey,
            singular_label: singular,
            plural_label: plural,
            updated_by: userId,
          },
          {
            onConflict: "company_id,term_key",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      await log(
        "terminology.updated",
        "terminology",
        data?.id,
        {
          term_key: variables.termKey,
          singular_label: variables.singular,
          plural_label: variables.plural,
        }
      );
      queryClient.invalidateQueries({ queryKey: ["company-terminology", activeCompanyId] });
      toast.success("Terminology updated");
    },
    onError: (error) => {
      console.error("Failed to update terminology:", error);
      toast.error("Failed to update terminology");
    },
  });

  // Mutation to reset terminology to default
  const resetTerminology = useMutation({
    mutationFn: async (termKey: string) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { error } = await supabase
        .from("company_terminology")
        .delete()
        .eq("company_id", activeCompanyId)
        .eq("term_key", termKey);

      if (error) throw error;
      return termKey;
    },
    onSuccess: async (termKey) => {
      await log(
        "terminology.reset",
        "terminology",
        undefined,
        { term_key: termKey }
      );
      queryClient.invalidateQueries({ queryKey: ["company-terminology", activeCompanyId] });
      toast.success("Terminology reset to default");
    },
    onError: (error) => {
      console.error("Failed to reset terminology:", error);
      toast.error("Failed to reset terminology");
    },
  });

  return {
    // State
    terminology,
    terminologyEntries,
    isLoading,
    error,
    canEdit: isCompanyAdmin,

    // Getters
    getSingular,
    getPlural,
    getLabels,
    isCustomized,

    // Mutations
    updateTerminology,
    resetTerminology,
  };
}

/**
 * Simple helper hook for read-only terminology access
 * Use this in components that only need to display terms
 */
export function useTerm(termKey: string) {
  const { getSingular, getPlural, isLoading } = useCompanyTerminology();
  
  return {
    singular: getSingular(termKey),
    plural: getPlural(termKey),
    isLoading,
  };
}
