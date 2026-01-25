import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";

export interface CoachingOrgOption {
  id: string;
  name: string;
  programKey: string | null;
  programVersion: string | number | null;
  companyId: string;
  status: string;
}

export interface ActiveCoachingOrgState {
  /** Available coaching orgs the user can access */
  availableOrgs: CoachingOrgOption[];
  /** Currently selected org */
  activeOrg: CoachingOrgOption | null;
  /** Active coaching org ID */
  activeCoachingOrgId: string | null;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Set the active coaching org */
  setActiveCoachingOrg: (orgId: string) => void;
  /** Whether the user has multiple orgs to choose from */
  hasMultipleOrgs: boolean;
}

/**
 * Hook to manage the active coaching org selection with persistence.
 * 
 * Resolves available orgs based on:
 * - User's company memberships
 * - coaching_coach_profiles (for coaches)
 * - coaching_managers (for managers)
 * - coaching_coaches (for coaches in org)
 * - RLS policies
 */
export function useActiveCoachingOrg(): ActiveCoachingOrgState {
  const { user } = useAuth();
  const { activeCompanyId, isSiteAdmin, isSuperAdmin } = useMembership();
  const queryClient = useQueryClient();

  // Fetch available coaching orgs
  const { data: orgsData, isLoading: orgsLoading, error: orgsError } = useQuery({
    queryKey: ["available-coaching-orgs", user?.id, activeCompanyId],
    queryFn: async () => {
      if (!user?.id) return { orgs: [], preferredOrgId: null };

      // Get user's preference
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("active_coaching_org_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const preferredOrgId = prefs?.active_coaching_org_id || null;

      // For site admins, get all coaching orgs
      if (isSiteAdmin || isSuperAdmin) {
        const { data: allOrgs, error } = await supabase
          .from("coaching_orgs")
          .select("id, name, program_key, program_version, company_id, status")
          .eq("status", "active")
          .order("name");

        if (error) throw error;

        const orgs: CoachingOrgOption[] = (allOrgs || []).map((org) => ({
          id: org.id,
          name: org.name,
          programKey: org.program_key,
          programVersion: org.program_version,
          companyId: org.company_id,
          status: org.status,
        }));

        return { orgs, preferredOrgId };
      }

      // For regular users, get orgs they can access
      const orgIds = new Set<string>();
      const orgsMap = new Map<string, CoachingOrgOption>();

      // 1. Check if user's company owns a coaching org
      if (activeCompanyId) {
        const { data: ownedOrgs } = await supabase
          .from("coaching_orgs")
          .select("id, name, program_key, program_version, company_id, status")
          .eq("company_id", activeCompanyId)
          .eq("status", "active");

        ownedOrgs?.forEach((org) => {
          orgIds.add(org.id);
          orgsMap.set(org.id, {
            id: org.id,
            name: org.name,
            programKey: org.program_key,
            programVersion: org.program_version,
            companyId: org.company_id,
            status: org.status,
          });
        });
      }

      // 2. Check coaching_coach_profiles for org access via company_id
      const { data: coachProfiles } = await supabase
        .from("coaching_coach_profiles")
        .select(`
          id,
          company_id,
          company:companies!coaching_coach_profiles_company_id_fkey(
            coaching_orgs(id, name, program_key, program_version, company_id, status)
          )
        `)
        .eq("user_id", user.id)
        .is("archived_at", null);

      coachProfiles?.forEach((profile: any) => {
        profile.company?.coaching_orgs?.forEach((org: any) => {
          if (org.status === "active" && !orgIds.has(org.id)) {
            orgIds.add(org.id);
            orgsMap.set(org.id, {
              id: org.id,
              name: org.name,
              programKey: org.program_key,
              programVersion: org.program_version,
              companyId: org.company_id,
              status: org.status,
            });
          }
        });
      });

      // 3. Check coaching_managers
      const { data: managers } = await supabase
        .from("coaching_managers")
        .select(`
          id,
          coaching_org:coaching_orgs(id, name, program_key, program_version, company_id, status)
        `)
        .eq("user_id", user.id)
        .eq("status", "active");

      managers?.forEach((manager: any) => {
        const org = manager.coaching_org;
        if (org && org.status === "active" && !orgIds.has(org.id)) {
          orgIds.add(org.id);
          orgsMap.set(org.id, {
            id: org.id,
            name: org.name,
            programKey: org.program_key,
            programVersion: org.program_version,
            companyId: org.company_id,
            status: org.status,
          });
        }
      });

      // 4. Check coaching_coaches
      const { data: coaches } = await supabase
        .from("coaching_coaches")
        .select(`
          id,
          coaching_org:coaching_orgs(id, name, program_key, program_version, company_id, status)
        `)
        .eq("user_id", user.id)
        .eq("status", "active");

      coaches?.forEach((coach: any) => {
        const org = coach.coaching_org;
        if (org && org.status === "active" && !orgIds.has(org.id)) {
          orgIds.add(org.id);
          orgsMap.set(org.id, {
            id: org.id,
            name: org.name,
            programKey: org.program_key,
            programVersion: org.program_version,
            companyId: org.company_id,
            status: org.status,
          });
        }
      });

      // 5. Check coaching_org_engagements for member companies
      if (activeCompanyId) {
        const { data: engagements } = await supabase
          .from("coaching_org_engagements")
          .select(`
            id,
            coaching_org:coaching_orgs(id, name, program_key, program_version, company_id, status)
          `)
          .eq("member_company_id", activeCompanyId)
          .eq("status", "active");

        engagements?.forEach((engagement: any) => {
          const org = engagement.coaching_org;
          if (org && org.status === "active" && !orgIds.has(org.id)) {
            orgIds.add(org.id);
            orgsMap.set(org.id, {
              id: org.id,
              name: org.name,
              programKey: org.program_key,
              programVersion: org.program_version,
              companyId: org.company_id,
              status: org.status,
            });
          }
        });
      }

      const orgs = Array.from(orgsMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );

      return { orgs, preferredOrgId };
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const availableOrgs = orgsData?.orgs || [];
  const preferredOrgId = orgsData?.preferredOrgId;

  // Determine active org
  let activeOrg: CoachingOrgOption | null = null;
  
  if (availableOrgs.length > 0) {
    // Check if preferred org is still valid
    if (preferredOrgId) {
      activeOrg = availableOrgs.find((org) => org.id === preferredOrgId) || null;
    }
    // Fall back to first org if preferred not found
    if (!activeOrg) {
      activeOrg = availableOrgs[0];
    }
  }

  // Mutation to update preference
  const updatePreference = useMutation({
    mutationFn: async (orgId: string) => {
      if (!user?.id) throw new Error("No user");

      // Upsert user preference
      const { error } = await supabase
        .from("user_preferences")
        .upsert(
          {
            user_id: user.id,
            active_coaching_org_id: orgId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;
      return orgId;
    },
    onSuccess: () => {
      // Invalidate queries to refetch with new org context
      queryClient.invalidateQueries({ queryKey: ["available-coaching-orgs"] });
      queryClient.invalidateQueries({ queryKey: ["coaching-role"] });
      queryClient.invalidateQueries({ queryKey: ["coaching-orgs"] });
      queryClient.invalidateQueries({ queryKey: ["coaching-org-engagements"] });
    },
  });

  const setActiveCoachingOrg = (orgId: string) => {
    updatePreference.mutate(orgId);
  };

  return {
    availableOrgs,
    activeOrg,
    activeCoachingOrgId: activeOrg?.id || null,
    isLoading: orgsLoading || updatePreference.isPending,
    error: (orgsError as Error) || null,
    setActiveCoachingOrg,
    hasMultipleOrgs: availableOrgs.length > 1,
  };
}
