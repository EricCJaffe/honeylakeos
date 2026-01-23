import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Default terminology values (fallback when no custom terms are set)
 */
export const DEFAULT_COACHING_TERMS: Record<string, string> = {
  // Entity labels
  member_label: "Member Company",
  coach_label: "Coach",
  manager_label: "Manager",
  engagement_label: "Engagement",
  group_label: "Group",
  
  // Meeting types
  annual_meeting_label: "Annual Meeting",
  quarterly_meeting_label: "Quarterly Meeting",
  monthly_meeting_label: "Monthly Meeting",
  one_on_one_label: "1:1",
  
  // Domain objects
  plan_label: "Coaching Plan",
  goals_label: "Goals",
  health_check_label: "Health Check",
  workflow_label: "Workflow",
  dashboard_label: "Dashboard",
  
  // Module label
  module_label: "Coaching",
  
  // Additional terms from program packs
  chair_label: "Chair",
  forum_label: "Forum",
  meeting_label: "Meeting",
  onboarding_label: "Onboarding",
  review_label: "Review",
  covenant_label: "Covenant",
  commitments_label: "Commitments",
};

interface CoachingTerminology {
  terms: Record<string, string>;
  getTerm: (key: string, defaultValue?: string) => string;
  isLoading: boolean;
  error: Error | null;
  sourcePackKey?: string;
}

/**
 * Hook to fetch and use coaching terminology for a coaching org.
 * Uses program pack resolution: org terms → program pack terms → generic pack → defaults
 * 
 * For member companies, uses program snapshot from engagement to determine terms.
 */
export function useCoachingTerminology(coachingOrgId?: string | null): CoachingTerminology {
  // Fetch org and pack terms with resolution
  const { data, isLoading, error } = useQuery({
    queryKey: ["coaching-terminology-resolved", coachingOrgId],
    queryFn: async () => {
      if (!coachingOrgId) {
        return { terms: DEFAULT_COACHING_TERMS, sourcePackKey: "default" };
      }

      // Get org's program key
      const { data: org, error: orgError } = await supabase
        .from("coaching_orgs")
        .select("program_key")
        .eq("id", coachingOrgId)
        .single();

      if (orgError) throw orgError;
      
      const programKey = org?.program_key || "generic";

      // Fetch org-specific custom terms
      const { data: orgTerms, error: termsError } = await supabase
        .from("coaching_terms")
        .select("term_key, term_value")
        .eq("coaching_org_id", coachingOrgId);

      if (termsError) throw termsError;

      // Build merged terms: defaults → generic pack → program pack → org custom
      const mergedTerms: Record<string, string> = { ...DEFAULT_COACHING_TERMS };

      // Get generic pack terms first (always as base fallback)
      const { data: genericPack } = await supabase
        .from("coaching_program_packs")
        .select(`
          id,
          coaching_program_pack_terms(term_key, term_value)
        `)
        .eq("key", "generic")
        .single();

      if (genericPack?.coaching_program_pack_terms) {
        (genericPack.coaching_program_pack_terms as any[]).forEach((t) => {
          mergedTerms[t.term_key] = t.term_value;
        });
      }

      // Get program-specific pack terms (overrides generic)
      if (programKey !== "generic") {
        const { data: programPack } = await supabase
          .from("coaching_program_packs")
          .select(`
            id,
            coaching_program_pack_terms(term_key, term_value)
          `)
          .eq("key", programKey)
          .single();

        if (programPack?.coaching_program_pack_terms) {
          (programPack.coaching_program_pack_terms as any[]).forEach((t) => {
            mergedTerms[t.term_key] = t.term_value;
          });
        }
      }

      // Apply org-specific custom overrides (highest priority)
      orgTerms?.forEach((t) => {
        mergedTerms[t.term_key] = t.term_value;
      });

      return { terms: mergedTerms, sourcePackKey: programKey };
    },
    enabled: !!coachingOrgId,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Merge with defaults for non-loaded state
  const mergedTerms: Record<string, string> = {
    ...DEFAULT_COACHING_TERMS,
    ...(data?.terms || {}),
  };

  // Helper to get a term with fallback
  const getTerm = (key: string, defaultValue?: string): string => {
    return mergedTerms[key] || defaultValue || DEFAULT_COACHING_TERMS[key] || key;
  };

  return {
    terms: mergedTerms,
    getTerm,
    isLoading,
    error: error as Error | null,
    sourcePackKey: data?.sourcePackKey,
  };
}

/**
 * Hook to get terminology from an engagement's program snapshot.
 * Useful for member companies who may not have direct access to the coaching org.
 */
export function useEngagementTerminology(engagementId?: string | null): CoachingTerminology {
  const { data: engagement, isLoading: engagementLoading, error: engagementError } = useQuery({
    queryKey: ["engagement-program", engagementId],
    queryFn: async () => {
      if (!engagementId) return null;

      const { data, error } = await supabase
        .from("coaching_org_engagements")
        .select(`
          id,
          program_key_snapshot,
          program_name_snapshot,
          coaching_org_id
        `)
        .eq("id", engagementId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!engagementId,
    staleTime: 10 * 60 * 1000,
  });

  // Use the coaching org's terms
  const coachingOrgTerms = useCoachingTerminology(engagement?.coaching_org_id);

  return {
    terms: coachingOrgTerms.terms,
    getTerm: coachingOrgTerms.getTerm,
    isLoading: engagementLoading || coachingOrgTerms.isLoading,
    error: (engagementError || coachingOrgTerms.error) as Error | null,
    sourcePackKey: coachingOrgTerms.sourcePackKey,
  };
}
