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
};

interface CoachingTerminology {
  terms: Record<string, string>;
  getTerm: (key: string, defaultValue?: string) => string;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch and use coaching terminology for a coaching org.
 * Falls back to default terms if no custom terms are set.
 * 
 * For member companies, uses program snapshot from engagement to determine terms.
 */
export function useCoachingTerminology(coachingOrgId?: string | null): CoachingTerminology {
  // Fetch custom terms for the coaching org
  const { data: customTerms, isLoading, error } = useQuery({
    queryKey: ["coaching-terms", coachingOrgId],
    queryFn: async () => {
      if (!coachingOrgId) return null;

      const { data, error } = await supabase
        .from("coaching_terms")
        .select("term_key, term_value")
        .eq("coaching_org_id", coachingOrgId);

      if (error) throw error;

      // Convert to map
      const termsMap: Record<string, string> = {};
      data?.forEach((term) => {
        termsMap[term.term_key] = term.term_value;
      });

      return termsMap;
    },
    enabled: !!coachingOrgId,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Merge custom terms with defaults
  const mergedTerms: Record<string, string> = {
    ...DEFAULT_COACHING_TERMS,
    ...(customTerms || {}),
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
  };
}
