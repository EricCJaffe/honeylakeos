import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useCoachingRole } from "./useCoachingRole";
import { toast } from "sonner";

// ============================================
// Coaching Org Data Hooks
// ============================================

/**
 * Fetch coaching orgs the user can access
 */
export function useCoachingOrgs() {
  const { coachingOrgIds, isLoading: roleLoading } = useCoachingRole();

  return useQuery({
    queryKey: ["coaching-orgs", coachingOrgIds],
    queryFn: async () => {
      if (!coachingOrgIds.length) return [];

      const { data, error } = await supabase
        .from("coaching_orgs")
        .select(`
          *,
          company:companies(id, name, logo_url)
        `)
        .in("id", coachingOrgIds);

      if (error) throw error;
      return data;
    },
    enabled: !roleLoading && coachingOrgIds.length > 0,
  });
}

/**
 * Fetch managers for a coaching org
 */
export function useCoachingManagers(coachingOrgId?: string | null) {
  return useQuery({
    queryKey: ["coaching-managers", coachingOrgId],
    queryFn: async () => {
      if (!coachingOrgId) return [];

      const { data, error } = await supabase
        .from("coaching_managers")
        .select(`
          *,
          profile:profiles(user_id, full_name, email, avatar_url)
        `)
        .eq("coaching_org_id", coachingOrgId)
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
    enabled: !!coachingOrgId,
  });
}

/**
 * Fetch coaches for a coaching org or manager
 */
export function useCoachingCoaches(coachingOrgId?: string | null, managerId?: string | null) {
  return useQuery({
    queryKey: ["coaching-coaches", coachingOrgId, managerId],
    queryFn: async () => {
      if (!coachingOrgId) return [];

      let query = supabase
        .from("coaching_coaches")
        .select(`
          *,
          profile:profiles(user_id, full_name, email, avatar_url)
        `)
        .eq("coaching_org_id", coachingOrgId)
        .eq("status", "active");

      // If manager ID provided, filter to only their coaches
      if (managerId) {
        const { data: assignments } = await supabase
          .from("coaching_manager_assignments")
          .select("coach_id")
          .eq("manager_id", managerId)
          .eq("status", "active");

        const coachIds = assignments?.map((a) => a.coach_id) || [];
        if (coachIds.length === 0) return [];
        
        query = query.in("id", coachIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!coachingOrgId,
  });
}

// ============================================
// Engagement Hooks
// ============================================

/**
 * Fetch engagements for coaching org/manager/coach
 */
export function useCoachingOrgEngagements(
  coachingOrgId?: string | null,
  filters?: {
    status?: string[];
    coachId?: string;
    managerId?: string;
  }
) {
  return useQuery({
    queryKey: ["coaching-org-engagements", coachingOrgId, filters],
    queryFn: async () => {
      if (!coachingOrgId) return [];

      let query = supabase
        .from("coaching_org_engagements")
        .select(`
          *,
          member_company:companies!member_company_id(id, name, logo_url),
          onboarding:coaching_engagement_onboarding(id, status, completed_at)
        `)
        .eq("coaching_org_id", coachingOrgId);

      // Filter by status
      if (filters?.status?.length) {
        query = query.in("status", filters.status as ("active" | "ended" | "suspended")[]);
      } else {
        query = query.in("status", ["active", "suspended"]);
      }

      const { data, error } = await query;
      if (error) throw error;

      // If filtering by coach, get their assignments
      if (filters?.coachId) {
        const { data: assignments } = await supabase
          .from("coaching_org_engagement_assignments")
          .select("coaching_engagement_id")
          .eq("coach_id", filters.coachId)
          .eq("status", "active");

        const engagementIds = assignments?.map((a) => a.coaching_engagement_id) || [];
        return data?.filter((e) => engagementIds.includes(e.id)) || [];
      }

      return data;
    },
    enabled: !!coachingOrgId,
  });
}

/**
 * Fetch member company's active engagement
 */
export function useMemberEngagement() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["member-engagement", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return null;

      const { data, error } = await supabase
        .from("coaching_org_engagements")
        .select(`
          *,
          coaching_org:coaching_orgs(id, name, program_key, program_name),
          onboarding:coaching_engagement_onboarding(id, status, completed_at),
          assignments:coaching_org_engagement_assignments(
            id,
            role,
            coach:coaching_coaches(
              id,
              profile:profiles(user_id, full_name, email, avatar_url)
            )
          )
        `)
        .eq("member_company_id", activeCompanyId)
        .in("status", ["active", "suspended"])
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });
}

// ============================================
// Coaching Plans & Goals
// ============================================

export function useCoachingPlans(engagementId?: string | null) {
  return useQuery({
    queryKey: ["coaching-plans", engagementId],
    queryFn: async () => {
      if (!engagementId) return [];

      // First get the engagement to find the member_company_id
      const { data: engagement } = await supabase
        .from("coaching_org_engagements")
        .select("member_company_id")
        .eq("id", engagementId)
        .single();

      if (!engagement) return [];

      const { data, error } = await supabase
        .from("coaching_plans")
        .select(`
          *,
          goals:coaching_goals(*)
        `)
        .eq("coaching_engagement_id", engagementId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!engagementId,
  });
}

export function useCreateCoachingPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: {
      coaching_engagement_id: string;
      member_company_id: string;
      title: string;
      description?: string;
      start_date?: string;
      end_date?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("coaching_plans")
        .insert({
          ...plan,
          created_by_user_id: user.id,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["coaching-plans", variables.coaching_engagement_id] });
      toast.success("Plan created");
    },
    onError: (error) => {
      toast.error("Failed to create plan: " + error.message);
    },
  });
}

// ============================================
// Coaching Meetings
// ============================================

export function useCoachingMeetings(engagementId?: string | null) {
  return useQuery({
    queryKey: ["coaching-meetings", engagementId],
    queryFn: async () => {
      if (!engagementId) return [];

      const { data, error } = await supabase
        .from("coaching_meetings")
        .select(`
          *,
          prep_items:coaching_meeting_prep_items(*)
        `)
        .eq("coaching_engagement_id", engagementId)
        .order("scheduled_for", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!engagementId,
  });
}

export function useUpcomingMeetings(engagementIds: string[]) {
  return useQuery({
    queryKey: ["upcoming-meetings", engagementIds],
    queryFn: async () => {
      if (!engagementIds.length) return [];

      const { data, error } = await supabase
        .from("coaching_meetings")
        .select(`
          *,
          engagement:coaching_org_engagements(
            id,
            member_company:companies(id, name)
          )
        `)
        .in("coaching_engagement_id", engagementIds)
        .eq("status", "scheduled")
        .gte("scheduled_for", new Date().toISOString())
        .order("scheduled_for", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: engagementIds.length > 0,
  });
}

// ============================================
// Health Checks
// ============================================

export function useCoachingHealthChecks(engagementId?: string | null) {
  return useQuery({
    queryKey: ["coaching-health-checks", engagementId],
    queryFn: async () => {
      if (!engagementId) return [];

      const { data, error } = await supabase
        .from("coaching_health_checks")
        .select(`
          *,
          responses:coaching_health_check_responses(*)
        `)
        .eq("coaching_engagement_id", engagementId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!engagementId,
  });
}

// ============================================
// Engagement Mutations
// ============================================

export function useEndEngagement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      engagementId,
      reason,
      notes,
    }: {
      engagementId: string;
      reason: "member_requested" | "coaching_org_requested";
      notes?: string;
    }) => {
      const { error } = await supabase
        .from("coaching_org_engagements")
        .update({
          status: "ended",
          ends_at: new Date().toISOString(),
          ended_reason: reason,
          ended_notes: notes,
        })
        .eq("id", engagementId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-org-engagements"] });
      queryClient.invalidateQueries({ queryKey: ["member-engagement"] });
      toast.success("Engagement ended successfully");
    },
    onError: (error) => {
      toast.error("Failed to end engagement: " + error.message);
    },
  });
}

// ============================================
// Company Provisioning
// ============================================

export function useProvisionMemberCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      coachingOrgId,
      companyName,
      adminEmail,
      adminName,
      primaryCoachId,
    }: {
      coachingOrgId: string;
      companyName: string;
      adminEmail: string;
      adminName: string;
      primaryCoachId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get the site_id from coaching org
      const { data: coachingOrg, error: orgError } = await supabase
        .from("coaching_orgs")
        .select("id, company:companies(site_id)")
        .eq("id", coachingOrgId)
        .single();

      if (orgError) throw orgError;

      // Create the company
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: companyName,
          site_id: coachingOrg.company?.site_id,
          status: "active",
          created_by: user.id,
          created_by_coaching_org_id: coachingOrgId,
          onboarding_source: "created_by_coaching_org",
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Create engagement
      const { data: engagement, error: engagementError } = await supabase
        .from("coaching_org_engagements")
        .insert({
          coaching_org_id: coachingOrgId,
          member_company_id: company.id,
          status: "active",
          linkage_type: "provisioned_by_coaching_org",
          linked_by_user_id: user.id,
        })
        .select()
        .single();

      if (engagementError) throw engagementError;

      // Create onboarding record
      const { error: onboardingError } = await supabase
        .from("coaching_engagement_onboarding")
        .insert({
          coaching_engagement_id: engagement.id,
          member_company_id: company.id,
          status: "pending",
        });

      if (onboardingError) throw onboardingError;

      // Assign primary coach if specified
      if (primaryCoachId) {
        const { error: assignError } = await supabase
          .from("coaching_org_engagement_assignments")
          .insert({
            coaching_engagement_id: engagement.id,
            coach_id: primaryCoachId,
            role: "primary",
            status: "active",
          });

        if (assignError) throw assignError;
      }

      // TODO: Send invite to admin email
      // For now, just return the created entities

      return { company, engagement };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-org-engagements"] });
      toast.success("Company provisioned successfully");
    },
    onError: (error) => {
      toast.error("Failed to provision company: " + error.message);
    },
  });
}

// ============================================
// Access Wizard / Onboarding
// ============================================

export function useCompleteOnboardingWizard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      onboardingId,
      engagementId,
      grants,
    }: {
      onboardingId: string;
      engagementId: string;
      grants: Array<{
        module: string;
        role: string;
        coaching_scoped_only: boolean;
      }>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get engagement to find coaching org and member company
      const { data: engagement, error: engError } = await supabase
        .from("coaching_org_engagements")
        .select(`
          id,
          coaching_org_id,
          member_company_id,
          assignments:coaching_org_engagement_assignments(
            coach:coaching_coaches(id, user_id)
          )
        `)
        .eq("id", engagementId)
        .single();

      if (engError) throw engError;

      // Create access grants for each coach
      const coachUserIds = engagement.assignments
        ?.map((a: any) => a.coach?.user_id)
        .filter(Boolean) || [];

      for (const coachUserId of coachUserIds) {
        for (const grant of grants) {
          // Check if grant already exists
          const { data: existingGrant } = await supabase
            .from("access_grants")
            .select("id")
            .eq("grantor_company_id", engagement.member_company_id)
            .eq("grantee_user_id", coachUserId)
            .eq("module", grant.module as any)
            .eq("source_type", "coaching_engagement")
            .eq("source_id", engagementId)
            .maybeSingle();

          if (existingGrant) {
            // Update existing grant
            const { error: updateError } = await supabase
              .from("access_grants")
              .update({
                role: grant.role as any,
                constraints: { coaching_scoped_only: grant.coaching_scoped_only },
                status: "active",
              })
              .eq("id", existingGrant.id);

            if (updateError) throw updateError;
          } else {
            // Insert new grant
            const { error: insertError } = await supabase
              .from("access_grants")
              .insert({
                grantor_company_id: engagement.member_company_id,
                grantee_user_id: coachUserId,
                module: grant.module as any,
                role: grant.role as any,
                source_type: "coaching_engagement",
                source_id: engagementId,
                constraints: { coaching_scoped_only: grant.coaching_scoped_only },
                status: "active",
              });

            if (insertError) throw insertError;
          }
        }
      }

      // Mark onboarding as completed
      const { error: completeError } = await supabase
        .from("coaching_engagement_onboarding")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          completed_by_user_id: user.id,
        })
        .eq("id", onboardingId);

      if (completeError) throw completeError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-engagement"] });
      toast.success("Access configured successfully");
    },
    onError: (error) => {
      toast.error("Failed to configure access: " + error.message);
    },
  });
}
