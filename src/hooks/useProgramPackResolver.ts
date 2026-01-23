import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCoachingRole } from "./useCoachingRole";
import { DEFAULT_COACHING_TERMS } from "./useCoachingTerminology";

/**
 * Program Pack Resolution Engine
 * 
 * Provides dynamic resolution of workflows, forms, dashboards, and terminology
 * based on the selected program_key (generic, convene, custom).
 * 
 * Resolution order:
 * 1. {program_key}_{base_key}
 * 2. generic_{base_key}
 * 
 * If no program_key is set, defaults to 'generic'.
 */

// Types
export interface ResolvedAsset<T = unknown> {
  asset: T;
  sourcePackKey: string;
  baseKey: string;
  resolvedKey: string;
  isDefault: boolean;
}

export interface ProgramPackInfo {
  id: string;
  key: string;
  name: string;
  version: string | null;
  description: string | null;
}

// =============================================
// Core Resolution Hook: Get org's program key
// =============================================

export function useOrgProgramKey(coachingOrgId: string | null) {
  return useQuery({
    queryKey: ["org-program-key", coachingOrgId],
    queryFn: async () => {
      if (!coachingOrgId) return "generic";

      const { data, error } = await supabase
        .from("coaching_orgs")
        .select("program_key, program_name, program_version, seeded_from_pack_id")
        .eq("id", coachingOrgId)
        .single();

      if (error) throw error;
      return data?.program_key || "generic";
    },
    enabled: !!coachingOrgId,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });
}

// Get the active program key using coaching role context
export function useActiveProgramKey() {
  const { activeCoachingOrgId } = useCoachingRole();
  const { data: programKey, isLoading, error } = useOrgProgramKey(activeCoachingOrgId);

  return {
    programKey: programKey || "generic",
    isLoading,
    error,
    coachingOrgId: activeCoachingOrgId,
  };
}

// =============================================
// Terminology Resolution
// =============================================

export function useResolvedTerminology(coachingOrgId: string | null) {
  const { data: programKey } = useOrgProgramKey(coachingOrgId);

  return useQuery({
    queryKey: ["resolved-terminology", coachingOrgId, programKey],
    queryFn: async () => {
      const resolvedProgramKey = programKey || "generic";

      // First, try to get org-specific custom terms
      const { data: orgTerms, error: orgError } = await supabase
        .from("coaching_terms")
        .select("term_key, term_value")
        .eq("coaching_org_id", coachingOrgId!);

      if (orgError) throw orgError;

      // Then get pack terms for the program key
      const { data: packTerms, error: packError } = await supabase
        .from("coaching_program_packs")
        .select(`
          id,
          key,
          coaching_program_pack_terms(term_key, term_value)
        `)
        .eq("key", resolvedProgramKey)
        .single();

      // If program pack not found, try generic
      let fallbackPackTerms: Record<string, string> = {};
      if (packError || !packTerms) {
        const { data: genericPack } = await supabase
          .from("coaching_program_packs")
          .select(`
            id,
            key,
            coaching_program_pack_terms(term_key, term_value)
          `)
          .eq("key", "generic")
          .single();

        if (genericPack?.coaching_program_pack_terms) {
          (genericPack.coaching_program_pack_terms as any[]).forEach((t) => {
            fallbackPackTerms[t.term_key] = t.term_value;
          });
        }
      }

      // Build merged terms map: DEFAULT → generic pack → program pack → org custom
      const mergedTerms: Record<string, string> = { ...DEFAULT_COACHING_TERMS };

      // Apply generic pack terms first (as fallback)
      if (!packError && packTerms?.key !== "generic") {
        const { data: genericPack } = await supabase
          .from("coaching_program_packs")
          .select(`coaching_program_pack_terms(term_key, term_value)`)
          .eq("key", "generic")
          .single();

        if (genericPack?.coaching_program_pack_terms) {
          (genericPack.coaching_program_pack_terms as any[]).forEach((t) => {
            mergedTerms[t.term_key] = t.term_value;
          });
        }
      }

      // Apply program-specific pack terms
      if (packTerms?.coaching_program_pack_terms) {
        (packTerms.coaching_program_pack_terms as any[]).forEach((t) => {
          mergedTerms[t.term_key] = t.term_value;
        });
      } else {
        Object.assign(mergedTerms, fallbackPackTerms);
      }

      // Apply org-specific custom overrides
      orgTerms?.forEach((t) => {
        mergedTerms[t.term_key] = t.term_value;
      });

      return {
        terms: mergedTerms,
        sourcePackKey: packTerms?.key || "generic",
      };
    },
    enabled: !!coachingOrgId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to get a terminology resolver function
 */
export function useTermResolver(coachingOrgId?: string | null) {
  const { activeCoachingOrgId } = useCoachingRole();
  const orgId = coachingOrgId ?? activeCoachingOrgId;
  
  const { data, isLoading, error } = useResolvedTerminology(orgId);

  const getTerm = (key: string, defaultValue?: string): string => {
    return data?.terms[key] || defaultValue || DEFAULT_COACHING_TERMS[key] || key;
  };

  return {
    terms: data?.terms || DEFAULT_COACHING_TERMS,
    getTerm,
    sourcePackKey: data?.sourcePackKey || "generic",
    isLoading,
    error: error as Error | null,
  };
}

// =============================================
// Form Template Resolution
// =============================================

interface FormTemplateAsset {
  id: string;
  templateKey: string;
  title: string;
  description: string | null;
  fields: unknown[];
}

/**
 * Resolve a form template by base_key with fallback
 * Resolution: {program_key}_{base_key} → generic_{base_key}
 */
export function useResolvedFormTemplate(baseKey: string | null, coachingOrgId?: string | null) {
  const { activeCoachingOrgId } = useCoachingRole();
  const orgId = coachingOrgId ?? activeCoachingOrgId;
  const { data: programKey } = useOrgProgramKey(orgId);

  return useQuery({
    queryKey: ["resolved-form-template", baseKey, programKey],
    queryFn: async (): Promise<ResolvedAsset<FormTemplateAsset> | null> => {
      if (!baseKey) return null;

      const resolvedProgramKey = programKey || "generic";
      const programSpecificKey = `${resolvedProgramKey}_${baseKey}`;
      const genericKey = `generic_${baseKey}`;

      // Try program-specific first
      const { data: programForm } = await supabase
        .from("wf_forms")
        .select("id, template_key, title, description, fields:wf_form_fields(*)")
        .eq("template_key", programSpecificKey)
        .maybeSingle();

      if (programForm) {
        return {
          asset: {
            id: programForm.id,
            templateKey: programForm.template_key!,
            title: programForm.title,
            description: programForm.description,
            fields: programForm.fields || [],
          },
          sourcePackKey: resolvedProgramKey,
          baseKey,
          resolvedKey: programSpecificKey,
          isDefault: false,
        };
      }

      // Fallback to generic
      const { data: genericForm } = await supabase
        .from("wf_forms")
        .select("id, template_key, title, description, fields:wf_form_fields(*)")
        .eq("template_key", genericKey)
        .maybeSingle();

      if (genericForm) {
        return {
          asset: {
            id: genericForm.id,
            templateKey: genericForm.template_key!,
            title: genericForm.title,
            description: genericForm.description,
            fields: genericForm.fields || [],
          },
          sourcePackKey: "generic",
          baseKey,
          resolvedKey: genericKey,
          isDefault: true,
        };
      }

      return null;
    },
    enabled: !!baseKey,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Resolve a form template key (helper for getting the full key)
 */
export function resolveFormTemplateKey(baseKey: string, programKey: string = "generic"): string {
  // If already has a program prefix, return as-is
  if (baseKey.includes("_") && (baseKey.startsWith("generic_") || baseKey.startsWith("convene_"))) {
    return baseKey;
  }
  return `${programKey}_${baseKey}`;
}

// =============================================
// Workflow Template Resolution
// =============================================

interface WorkflowTemplateAsset {
  id: string;
  name: string;
  description: string | null;
  workflowType: string;
  status: string;
  steps: unknown[];
}

/**
 * Resolve workflow templates by type with program pack fallback
 */
export function useResolvedWorkflowTemplates(workflowType: string | null, coachingOrgId?: string | null) {
  const { activeCoachingOrgId } = useCoachingRole();
  const orgId = coachingOrgId ?? activeCoachingOrgId;
  const { data: programKey } = useOrgProgramKey(orgId);

  return useQuery({
    queryKey: ["resolved-workflow-templates", workflowType, programKey, orgId],
    queryFn: async (): Promise<ResolvedAsset<WorkflowTemplateAsset>[]> => {
      if (!workflowType) return [];

      const resolvedProgramKey = programKey || "generic";

      // Get program-specific templates
      const { data: programPack } = await supabase
        .from("coaching_program_packs")
        .select("id")
        .eq("key", resolvedProgramKey)
        .single();

      let templates: any[] = [];

      if (programPack) {
        const { data: programTemplates } = await supabase
          .from("coaching_program_pack_workflow_templates")
          .select(`
            *,
            coaching_program_pack_workflow_steps(*)
          `)
          .eq("pack_id", programPack.id)
          .eq("workflow_type", workflowType as any)
          .eq("status", "active" as any);

        if (programTemplates && programTemplates.length > 0) {
          templates = programTemplates.map((t) => ({
            asset: {
              id: t.id,
              name: t.name,
              description: t.description,
              workflowType: t.workflow_type,
              status: t.status,
              steps: t.coaching_program_pack_workflow_steps || [],
            },
            sourcePackKey: resolvedProgramKey,
            baseKey: workflowType,
            resolvedKey: `${resolvedProgramKey}_${workflowType}`,
            isDefault: false,
          }));
        }
      }

      // Fallback to generic if no program-specific templates
      if (templates.length === 0 && resolvedProgramKey !== "generic") {
        const { data: genericPack } = await supabase
          .from("coaching_program_packs")
          .select("id")
          .eq("key", "generic")
          .single();

        if (genericPack) {
          const { data: genericTemplates } = await supabase
            .from("coaching_program_pack_workflow_templates")
            .select(`
              *,
              coaching_program_pack_workflow_steps(*)
            `)
            .eq("pack_id", genericPack.id)
            .eq("workflow_type", workflowType as any)
            .eq("status", "active" as any);

          if (genericTemplates) {
            templates = genericTemplates.map((t) => ({
              asset: {
                id: t.id,
                name: t.name,
                description: t.description,
                workflowType: t.workflow_type,
                status: t.status,
                steps: t.coaching_program_pack_workflow_steps || [],
              },
              sourcePackKey: "generic",
              baseKey: workflowType,
              resolvedKey: `generic_${workflowType}`,
              isDefault: true,
            }));
          }
        }
      }

      return templates;
    },
    enabled: !!workflowType,
    staleTime: 10 * 60 * 1000,
  });
}

// =============================================
// Dashboard Widget Resolution
// =============================================

interface DashboardWidget {
  id: string;
  widgetKey: string;
  dashboardType: string;
  widgetOrder: number;
  description: string | null;
  dataSource: string | null;
  configJson: unknown;
}

/**
 * Resolve dashboard widgets by role with program pack fallback
 * Merge strategy: Base widgets from generic + add/override from program pack
 */
export function useResolvedDashboardWidgets(
  dashboardType: "org_admin" | "manager" | "coach" | "member" | null,
  coachingOrgId?: string | null
) {
  const { activeCoachingOrgId } = useCoachingRole();
  const orgId = coachingOrgId ?? activeCoachingOrgId;
  const { data: programKey } = useOrgProgramKey(orgId);

  return useQuery({
    queryKey: ["resolved-dashboard-widgets", dashboardType, programKey],
    queryFn: async (): Promise<ResolvedAsset<DashboardWidget>[]> => {
      if (!dashboardType) return [];

      const resolvedProgramKey = programKey || "generic";
      const widgetsMap = new Map<string, ResolvedAsset<DashboardWidget>>();

      // Step 1: Get generic pack widgets as base
      const { data: genericPack } = await supabase
        .from("coaching_program_packs")
        .select("id")
        .eq("key", "generic")
        .single();

      if (genericPack) {
        const { data: genericWidgets } = await supabase
          .from("coaching_program_pack_dashboard_widgets")
          .select("*")
          .eq("pack_id", genericPack.id)
          .eq("dashboard_type", dashboardType)
          .order("widget_order");

        genericWidgets?.forEach((w) => {
          widgetsMap.set(w.widget_key, {
            asset: {
              id: w.id,
              widgetKey: w.widget_key,
              dashboardType: w.dashboard_type,
              widgetOrder: w.widget_order,
              description: w.description,
              dataSource: w.data_source,
              configJson: w.config_json,
            },
            sourcePackKey: "generic",
            baseKey: w.widget_key,
            resolvedKey: `generic_${w.widget_key}`,
            isDefault: true,
          });
        });
      }

      // Step 2: Override/add with program-specific widgets
      if (resolvedProgramKey !== "generic") {
        const { data: programPack } = await supabase
          .from("coaching_program_packs")
          .select("id")
          .eq("key", resolvedProgramKey)
          .single();

        if (programPack) {
          const { data: programWidgets } = await supabase
            .from("coaching_program_pack_dashboard_widgets")
            .select("*")
            .eq("pack_id", programPack.id)
            .eq("dashboard_type", dashboardType)
            .order("widget_order");

          programWidgets?.forEach((w) => {
            widgetsMap.set(w.widget_key, {
              asset: {
                id: w.id,
                widgetKey: w.widget_key,
                dashboardType: w.dashboard_type,
                widgetOrder: w.widget_order,
                description: w.description,
                dataSource: w.data_source,
                configJson: w.config_json,
              },
              sourcePackKey: resolvedProgramKey,
              baseKey: w.widget_key,
              resolvedKey: `${resolvedProgramKey}_${w.widget_key}`,
              isDefault: false,
            });
          });
        }
      }

      // Convert map to sorted array
      return Array.from(widgetsMap.values()).sort(
        (a, b) => a.asset.widgetOrder - b.asset.widgetOrder
      );
    },
    enabled: !!dashboardType,
    staleTime: 10 * 60 * 1000,
  });
}

// =============================================
// Pack Info & Management
// =============================================

/**
 * Get available program packs
 */
export function useAvailableProgramPacks() {
  return useQuery({
    queryKey: ["available-program-packs"],
    queryFn: async (): Promise<ProgramPackInfo[]> => {
      const { data, error } = await supabase
        .from("coaching_program_packs")
        .select("id, key, name, version, description")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return (data || []) as ProgramPackInfo[];
    },
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
  });
}

/**
 * Get current org's pack info
 */
export function useCurrentPackInfo(coachingOrgId?: string | null) {
  const { activeCoachingOrgId } = useCoachingRole();
  const orgId = coachingOrgId ?? activeCoachingOrgId;

  return useQuery({
    queryKey: ["current-pack-info", orgId],
    queryFn: async () => {
      if (!orgId) return null;

      const { data: org, error: orgError } = await supabase
        .from("coaching_orgs")
        .select("program_key, program_name, program_version, seeded_from_pack_id")
        .eq("id", orgId)
        .single();

      if (orgError) throw orgError;
      if (!org) return null;

      // Get pack details
      const { data: pack } = await supabase
        .from("coaching_program_packs")
        .select("id, key, name, version, description")
        .eq("key", org.program_key || "generic")
        .single();

      return {
        orgProgramKey: org.program_key || "generic",
        orgProgramName: org.program_name,
        orgProgramVersion: org.program_version,
        seededFromPackId: org.seeded_from_pack_id,
        pack: pack as ProgramPackInfo | null,
      };
    },
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000,
  });
}

// =============================================
// Cache Utilities
// =============================================

/**
 * Hook to prefetch pack assets for faster resolution
 */
export function usePrefetchPackAssets(coachingOrgId?: string | null) {
  const queryClient = useQueryClient();
  const { activeCoachingOrgId } = useCoachingRole();
  const orgId = coachingOrgId ?? activeCoachingOrgId;

  const prefetch = async () => {
    if (!orgId) return;

    // Prefetch terminology
    await queryClient.prefetchQuery({
      queryKey: ["resolved-terminology", orgId],
      queryFn: async () => {
        const { data } = await supabase
          .from("coaching_orgs")
          .select("program_key")
          .eq("id", orgId)
          .single();
        return data?.program_key || "generic";
      },
    });
  };

  return { prefetch };
}

// =============================================
// Resolution Utilities
// =============================================

/**
 * Build a resolved key from base key and program key
 */
export function buildResolvedKey(baseKey: string, programKey: string = "generic"): string {
  // If already prefixed, return as-is
  if (baseKey.startsWith(`${programKey}_`) || baseKey.startsWith("generic_")) {
    return baseKey;
  }
  return `${programKey}_${baseKey}`;
}

/**
 * Extract base key from a resolved key
 */
export function extractBaseKey(resolvedKey: string): string {
  // Remove known prefixes
  const prefixes = ["generic_", "convene_", "c12_", "eos_"];
  for (const prefix of prefixes) {
    if (resolvedKey.startsWith(prefix)) {
      return resolvedKey.slice(prefix.length);
    }
  }
  return resolvedKey;
}

/**
 * Check if a key has a program prefix
 */
export function hasProgramPrefix(key: string): boolean {
  const prefixes = ["generic_", "convene_", "c12_", "eos_"];
  return prefixes.some((prefix) => key.startsWith(prefix));
}
