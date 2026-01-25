import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useCoachingRole } from "./useCoachingRole";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type WfForm = Database["public"]["Tables"]["wf_forms"]["Row"];
type WfFormField = Database["public"]["Tables"]["wf_form_fields"]["Row"];

export interface ResolvedForm {
  id: string;
  title: string;
  description: string | null;
  templateKey: string | null;
  baseKey: string | null;
  programKey: string;
  version: string | null;
  isActive: boolean;
  fields: WfFormField[];
  isDefault: boolean; // true if resolved from generic fallback
  resolvedFromPack: string; // which pack the form was resolved from
}

interface FormResolutionResult {
  form: ResolvedForm | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Get the program key for a coaching org
 */
async function getOrgProgramKey(coachingOrgId: string | null): Promise<string> {
  if (!coachingOrgId) return "generic";
  
  const { data, error } = await supabase
    .from("coaching_orgs")
    .select("program_key")
    .eq("id", coachingOrgId)
    .single();
  
  if (error || !data) return "generic";
  return data.program_key || "generic";
}

/**
 * Core form resolution function
 * Resolution order: {program_key}_{base_key} → generic_{base_key}
 */
async function resolveFormByBaseKey(
  baseKey: string,
  programKey: string,
  companyId?: string | null
): Promise<ResolvedForm | null> {
  // Build potential keys
  const programSpecificKey = `${programKey}_${baseKey}`;
  const genericKey = `generic_${baseKey}`;

  // Try program-specific first
  let query = supabase
    .from("wf_forms")
    .select("*, fields:wf_form_fields(*)")
    .eq("is_active", true)
    .or(`base_key.eq.${baseKey},template_key.eq.${programSpecificKey}`)
    .eq("program_key", programKey);

  if (companyId) {
    query = query.or(`company_id.eq.${companyId},company_id.is.null`);
  }

  const { data: programForm } = await query.maybeSingle();

  if (programForm) {
    return {
      id: programForm.id,
      title: programForm.title,
      description: programForm.description,
      templateKey: programForm.template_key,
      baseKey: programForm.base_key,
      programKey: programForm.program_key || programKey,
      version: programForm.version,
      isActive: programForm.is_active ?? true,
      fields: (programForm.fields as WfFormField[]) || [],
      isDefault: false,
      resolvedFromPack: programKey,
    };
  }

  // Fallback to generic if not found and program key wasn't generic
  if (programKey !== "generic") {
    let fallbackQuery = supabase
      .from("wf_forms")
      .select("*, fields:wf_form_fields(*)")
      .eq("is_active", true)
      .or(`base_key.eq.${baseKey},template_key.eq.${genericKey}`)
      .eq("program_key", "generic");

    if (companyId) {
      fallbackQuery = fallbackQuery.or(`company_id.eq.${companyId},company_id.is.null`);
    }

    const { data: genericForm } = await fallbackQuery.maybeSingle();

    if (genericForm) {
      return {
        id: genericForm.id,
        title: genericForm.title,
        description: genericForm.description,
        templateKey: genericForm.template_key,
        baseKey: genericForm.base_key,
        programKey: "generic",
        version: genericForm.version,
        isActive: genericForm.is_active ?? true,
        fields: (genericForm.fields as WfFormField[]) || [],
        isDefault: true,
        resolvedFromPack: "generic",
      };
    }
  }

  return null;
}

/**
 * Hook to resolve a form by base key with program pack fallback
 */
export function useResolvedForm(
  baseKey: string | null,
  coachingOrgId?: string | null
): FormResolutionResult {
  const { activeCoachingOrgId } = useCoachingRole();
  const { activeCompanyId } = useActiveCompany();
  const orgId = coachingOrgId ?? activeCoachingOrgId;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["resolved-form", baseKey, orgId, activeCompanyId],
    queryFn: async () => {
      if (!baseKey) return null;
      
      const programKey = await getOrgProgramKey(orgId);
      return resolveFormByBaseKey(baseKey, programKey, activeCompanyId);
    },
    enabled: !!baseKey,
    staleTime: 10 * 60 * 1000,
  });

  return {
    form: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook to resolve a form for a specific engagement context
 */
export function useEngagementResolvedForm(
  baseKey: string | null,
  engagementId: string | null
): FormResolutionResult {
  const { activeCompanyId } = useActiveCompany();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["engagement-resolved-form", baseKey, engagementId],
    queryFn: async () => {
      if (!baseKey || !engagementId) return null;

      // Get engagement's coaching org and program key
      const { data: engagement } = await supabase
        .from("coaching_org_engagements")
        .select("coaching_org_id, program_key_snapshot")
        .eq("id", engagementId)
        .single();

      if (!engagement) return null;

      // Use snapshot if available, otherwise resolve from org
      let programKey = engagement.program_key_snapshot;
      if (!programKey) {
        programKey = await getOrgProgramKey(engagement.coaching_org_id);
      }

      return resolveFormByBaseKey(baseKey, programKey, activeCompanyId);
    },
    enabled: !!baseKey && !!engagementId,
    staleTime: 10 * 60 * 1000,
  });

  return {
    form: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook to list all available form base keys with their resolved variants
 */
export function useAvailableFormBaseKeys(coachingOrgId?: string | null) {
  const { activeCoachingOrgId } = useCoachingRole();
  const orgId = coachingOrgId ?? activeCoachingOrgId;

  return useQuery({
    queryKey: ["available-form-base-keys", orgId],
    queryFn: async () => {
      const programKey = await getOrgProgramKey(orgId);

      // Get all active forms
      const { data: forms, error } = await supabase
        .from("wf_forms")
        .select("id, title, base_key, program_key, template_key, is_active")
        .eq("is_active", true)
        .in("program_key", ["generic", programKey])
        .order("base_key");

      if (error) throw error;

      // Group by base_key and determine which variant is active
      const baseKeyMap = new Map<string, {
        baseKey: string;
        title: string;
        hasGeneric: boolean;
        hasProgramSpecific: boolean;
        activeVariant: string;
        forms: typeof forms;
      }>();

      forms?.forEach((form) => {
        const key = form.base_key || form.template_key || form.id;
        const existing = baseKeyMap.get(key);

        if (!existing) {
          baseKeyMap.set(key, {
            baseKey: key,
            title: form.title,
            hasGeneric: form.program_key === "generic",
            hasProgramSpecific: form.program_key === programKey && programKey !== "generic",
            activeVariant: form.program_key || "generic",
            forms: [form],
          });
        } else {
          existing.forms.push(form);
          if (form.program_key === "generic") existing.hasGeneric = true;
          if (form.program_key === programKey && programKey !== "generic") {
            existing.hasProgramSpecific = true;
            existing.activeVariant = programKey;
          }
        }
      });

      return {
        programKey,
        baseKeys: Array.from(baseKeyMap.values()),
      };
    },
    enabled: true,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to toggle form active status (for admin controls)
 */
export function useFormActivationMutations() {
  const queryClient = useQueryClient();

  const toggleActive = useMutation({
    mutationFn: async ({ formId, isActive }: { formId: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from("wf_forms")
        .update({ is_active: isActive })
        .eq("id", formId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resolved-form"] });
      queryClient.invalidateQueries({ queryKey: ["available-form-base-keys"] });
      toast.success("Form status updated");
    },
    onError: (error) => {
      toast.error(`Failed to update form: ${error.message}`);
    },
  });

  return { toggleActive };
}

/**
 * Utility: Extract base key from a full template key
 */
export function extractBaseKeyFromTemplate(templateKey: string): string {
  const prefixes = ["generic_", "convene_", "c12_", "eos_"];
  for (const prefix of prefixes) {
    if (templateKey.startsWith(prefix)) {
      return templateKey.slice(prefix.length);
    }
  }
  return templateKey;
}

/**
 * Utility: Build full template key from base key and program
 */
export function buildTemplateKey(baseKey: string, programKey: string = "generic"): string {
  // If already prefixed, return as-is
  if (baseKey.includes("_") && (
    baseKey.startsWith("generic_") || 
    baseKey.startsWith("convene_") ||
    baseKey.startsWith("c12_") ||
    baseKey.startsWith("eos_")
  )) {
    return baseKey;
  }
  return `${programKey}_${baseKey}`;
}
