import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCoachingRole } from "./useCoachingRole";
import { DEFAULT_COACHING_TERMS } from "./useCoachingTerminology";

/**
 * Program Key Hook (MVP)
 * 
 * Unified access point for program pack resolution across UI, hooks, and services.
 * Exposes the active program_key and all resolved assets cleanly.
 * 
 * Resolution behavior:
 * 1. Read coaching_org.program_key
 * 2. Default to "generic" if null
 * 3. Cache per request/session
 */

// =============================================
// Types
// =============================================

export interface ProgramPack {
  id: string;
  key: string;
  name: string;
  version: string | null;
  description: string | null;
}

export interface TerminologyResult {
  terms: Record<string, string>;
  getTerm: (key: string, defaultValue?: string) => string;
  sourcePackKey: string;
}

export interface ResolvedAssets {
  forms: {
    resolve: (baseKey: string) => Promise<ResolvedFormAsset | null>;
  };
  workflows: {
    resolve: (workflowType: string) => Promise<ResolvedWorkflowAsset[]>;
  };
  dashboards: {
    resolve: (dashboardType: DashboardType) => Promise<ResolvedDashboardWidget[]>;
  };
}

export interface ResolvedFormAsset {
  id: string;
  templateKey: string;
  baseKey: string;
  title: string;
  description: string | null;
  sourcePackKey: string;
  isDefault: boolean;
}

export interface ResolvedWorkflowAsset {
  id: string;
  name: string;
  description: string | null;
  workflowType: string;
  status: string;
  sourcePackKey: string;
  isDefault: boolean;
  steps: unknown[];
}

export interface ResolvedDashboardWidget {
  id: string;
  widgetKey: string;
  dashboardType: string;
  widgetOrder: number;
  description: string | null;
  dataSource: string | null;
  configJson: unknown;
  sourcePackKey: string;
  isDefault: boolean;
}

export type DashboardType = "org_admin" | "manager" | "coach" | "member";

export interface UseProgramKeyResult {
  /** The active program key (e.g., "generic", "convene") */
  programKey: string;
  /** The program pack info if available */
  programPack: ProgramPack | null;
  /** Resolved terminology with helper */
  terminology: TerminologyResult;
  /** Asset resolution functions */
  resolvedAssets: ResolvedAssets;
  /** The coaching org ID for this context */
  coachingOrgId: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Whether a program key change is allowed */
  canChangeProgram: boolean;
  /** Prefetch pack assets for performance */
  prefetch: () => Promise<void>;
}

// =============================================
// Main Hook
// =============================================

/**
 * Unified hook for program pack access across the application.
 * 
 * @param overrideCoachingOrgId - Optional coaching org ID to use instead of active context
 * @returns Program key, pack info, terminology, and asset resolvers
 * 
 * @example
 * ```tsx
 * const { programKey, terminology, resolvedAssets } = useProgramKey();
 * 
 * // Use terminology
 * const label = terminology.getTerm("coach", "Coach");
 * 
 * // Resolve a form
 * const form = await resolvedAssets.forms.resolve("member_covenant");
 * ```
 */
export function useProgramKey(overrideCoachingOrgId?: string | null): UseProgramKeyResult {
  const queryClient = useQueryClient();
  const { activeCoachingOrgId, isLoading: roleLoading } = useCoachingRole();
  
  const coachingOrgId = overrideCoachingOrgId ?? activeCoachingOrgId;

  // Fetch org's program key and pack info
  const { 
    data: orgData, 
    isLoading: orgLoading, 
    error: orgError 
  } = useQuery({
    queryKey: ["program-key-context", coachingOrgId],
    queryFn: async () => {
      if (!coachingOrgId) {
        return { 
          programKey: "generic", 
          pack: null, 
          canChangeProgram: false 
        };
      }

      // Get org's program settings
      const { data: org, error: orgErr } = await supabase
        .from("coaching_orgs")
        .select("program_key, program_name, program_version, seeded_from_pack_id")
        .eq("id", coachingOrgId)
        .single();

      if (orgErr) throw orgErr;

      const programKey = org?.program_key || "generic";

      // Get pack details
      const { data: pack } = await supabase
        .from("coaching_program_packs")
        .select("id, key, name, version, description")
        .eq("key", programKey)
        .single();

      // Check if org has any org-owned workflows (determines if change is risky)
      const { count: workflowCount } = await supabase
        .from("coaching_org_workflows")
        .select("id", { count: "exact", head: true })
        .eq("coaching_org_id", coachingOrgId);

      return {
        programKey,
        pack: pack as ProgramPack | null,
        canChangeProgram: (workflowCount || 0) === 0,
      };
    },
    enabled: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch resolved terminology
  const { 
    data: terminologyData, 
    isLoading: termLoading 
  } = useQuery({
    queryKey: ["program-key-terminology", coachingOrgId, orgData?.programKey],
    queryFn: async (): Promise<{ terms: Record<string, string>; sourcePackKey: string }> => {
      const programKey = orgData?.programKey || "generic";
      const mergedTerms: Record<string, string> = { ...DEFAULT_COACHING_TERMS };

      // Get generic pack terms first
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
          mergedTerms[t.term_key] = t.term_value;
        });
      }

      // Get program-specific pack terms
      let sourcePackKey = "generic";
      if (programKey !== "generic") {
        const { data: programPack } = await supabase
          .from("coaching_program_packs")
          .select(`
            id,
            key,
            coaching_program_pack_terms(term_key, term_value)
          `)
          .eq("key", programKey)
          .single();

        if (programPack?.coaching_program_pack_terms) {
          sourcePackKey = programKey;
          (programPack.coaching_program_pack_terms as any[]).forEach((t) => {
            mergedTerms[t.term_key] = t.term_value;
          });
        }
      }

      // Get org-specific custom overrides
      if (coachingOrgId) {
        const { data: orgTerms } = await supabase
          .from("coaching_terms")
          .select("term_key, term_value")
          .eq("coaching_org_id", coachingOrgId);

        orgTerms?.forEach((t) => {
          mergedTerms[t.term_key] = t.term_value;
        });
      }

      return { terms: mergedTerms, sourcePackKey };
    },
    enabled: !!orgData,
    staleTime: 10 * 60 * 1000,
  });

  // Terminology result with helper function
  const terminology: TerminologyResult = useMemo(() => {
    const terms = terminologyData?.terms || DEFAULT_COACHING_TERMS;
    return {
      terms,
      getTerm: (key: string, defaultValue?: string): string => {
        return terms[key] || defaultValue || DEFAULT_COACHING_TERMS[key] || key;
      },
      sourcePackKey: terminologyData?.sourcePackKey || "generic",
    };
  }, [terminologyData]);

  // Asset resolution functions
  const resolvedAssets: ResolvedAssets = useMemo(() => {
    const programKey = orgData?.programKey || "generic";

    return {
      forms: {
        resolve: async (baseKey: string): Promise<ResolvedFormAsset | null> => {
          const programSpecificKey = `${programKey}_${baseKey}`;
          const genericKey = `generic_${baseKey}`;

          // Try program-specific first
          const { data: programForm } = await supabase
            .from("wf_forms")
            .select("id, template_key, title, description")
            .eq("template_key", programSpecificKey)
            .eq("is_active", true)
            .maybeSingle();

          if (programForm) {
            return {
              id: programForm.id,
              templateKey: programForm.template_key!,
              baseKey,
              title: programForm.title,
              description: programForm.description,
              sourcePackKey: programKey,
              isDefault: false,
            };
          }

          // Fallback to generic
          const { data: genericForm } = await supabase
            .from("wf_forms")
            .select("id, template_key, title, description")
            .eq("template_key", genericKey)
            .eq("is_active", true)
            .maybeSingle();

          if (genericForm) {
            return {
              id: genericForm.id,
              templateKey: genericForm.template_key!,
              baseKey,
              title: genericForm.title,
              description: genericForm.description,
              sourcePackKey: "generic",
              isDefault: true,
            };
          }

          return null;
        },
      },
      workflows: {
        resolve: async (workflowType: string): Promise<ResolvedWorkflowAsset[]> => {
          const templates: ResolvedWorkflowAsset[] = [];

          // Get program-specific pack
          const { data: programPack } = await supabase
            .from("coaching_program_packs")
            .select("id")
            .eq("key", programKey)
            .single();

          if (programPack) {
            const { data: programTemplates } = await supabase
              .from("coaching_program_pack_workflow_templates")
              .select(`*, coaching_program_pack_workflow_steps(*)`)
              .eq("pack_id", programPack.id)
              .eq("workflow_type", workflowType as any)
              .eq("status", "active" as any);

            if (programTemplates && programTemplates.length > 0) {
              programTemplates.forEach((t) => {
                templates.push({
                  id: t.id,
                  name: t.name,
                  description: t.description,
                  workflowType: t.workflow_type,
                  status: t.status,
                  sourcePackKey: programKey,
                  isDefault: false,
                  steps: t.coaching_program_pack_workflow_steps || [],
                });
              });
              return templates;
            }
          }

          // Fallback to generic
          if (programKey !== "generic") {
            const { data: genericPack } = await supabase
              .from("coaching_program_packs")
              .select("id")
              .eq("key", "generic")
              .single();

            if (genericPack) {
              const { data: genericTemplates } = await supabase
                .from("coaching_program_pack_workflow_templates")
                .select(`*, coaching_program_pack_workflow_steps(*)`)
                .eq("pack_id", genericPack.id)
                .eq("workflow_type", workflowType as any)
                .eq("status", "active" as any);

              genericTemplates?.forEach((t) => {
                templates.push({
                  id: t.id,
                  name: t.name,
                  description: t.description,
                  workflowType: t.workflow_type,
                  status: t.status,
                  sourcePackKey: "generic",
                  isDefault: true,
                  steps: t.coaching_program_pack_workflow_steps || [],
                });
              });
            }
          }

          return templates;
        },
      },
      dashboards: {
        resolve: async (dashboardType: DashboardType): Promise<ResolvedDashboardWidget[]> => {
          const widgetsMap = new Map<string, ResolvedDashboardWidget>();

          // Get generic widgets as base
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
                id: w.id,
                widgetKey: w.widget_key,
                dashboardType: w.dashboard_type,
                widgetOrder: w.widget_order,
                description: w.description,
                dataSource: w.data_source,
                configJson: w.config_json,
                sourcePackKey: "generic",
                isDefault: true,
              });
            });
          }

          // Override with program-specific widgets
          if (programKey !== "generic") {
            const { data: programPack } = await supabase
              .from("coaching_program_packs")
              .select("id")
              .eq("key", programKey)
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
                  id: w.id,
                  widgetKey: w.widget_key,
                  dashboardType: w.dashboard_type,
                  widgetOrder: w.widget_order,
                  description: w.description,
                  dataSource: w.data_source,
                  configJson: w.config_json,
                  sourcePackKey: programKey,
                  isDefault: false,
                });
              });
            }
          }

          return Array.from(widgetsMap.values()).sort(
            (a, b) => a.widgetOrder - b.widgetOrder
          );
        },
      },
    };
  }, [orgData?.programKey]);

  // Prefetch function for performance optimization
  const prefetch = async () => {
    if (!coachingOrgId) return;

    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["program-key-context", coachingOrgId],
        staleTime: 10 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: ["program-key-terminology", coachingOrgId],
        staleTime: 10 * 60 * 1000,
      }),
    ]);
  };

  const isLoading = roleLoading || orgLoading || termLoading;

  return {
    programKey: orgData?.programKey || "generic",
    programPack: orgData?.pack || null,
    terminology,
    resolvedAssets,
    coachingOrgId,
    isLoading,
    error: orgError as Error | null,
    canChangeProgram: orgData?.canChangeProgram ?? true,
    prefetch,
  };
}

// =============================================
// Convenience Hooks
// =============================================

/**
 * Get just the program key without full resolution
 */
export function useSimpleProgramKey(coachingOrgId?: string | null) {
  const { activeCoachingOrgId } = useCoachingRole();
  const orgId = coachingOrgId ?? activeCoachingOrgId;

  return useQuery({
    queryKey: ["simple-program-key", orgId],
    queryFn: async () => {
      if (!orgId) return "generic";

      const { data, error } = await supabase
        .from("coaching_orgs")
        .select("program_key")
        .eq("id", orgId)
        .single();

      if (error) throw error;
      return data?.program_key || "generic";
    },
    enabled: true,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Get all available program packs
 */
export function useAvailableProgramPacks() {
  return useQuery({
    queryKey: ["available-program-packs"],
    queryFn: async (): Promise<ProgramPack[]> => {
      const { data, error } = await supabase
        .from("coaching_program_packs")
        .select("id, key, name, version, description")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return (data || []) as ProgramPack[];
    },
    staleTime: 30 * 60 * 1000,
  });
}

// =============================================
// Resolution Utilities
// =============================================

/**
 * Build a resolved key from base key and program key
 */
export function buildResolvedKey(baseKey: string, programKey: string = "generic"): string {
  if (baseKey.startsWith(`${programKey}_`) || baseKey.startsWith("generic_")) {
    return baseKey;
  }
  return `${programKey}_${baseKey}`;
}

/**
 * Extract base key from a resolved key
 */
export function extractBaseKey(resolvedKey: string): string {
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

export default useProgramKey;
