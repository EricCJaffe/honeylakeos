import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { useActiveCompany } from "./useActiveCompany";

/**
 * Coaching role hierarchy (highest to lowest priority):
 * - site_admin: Platform admin with full access
 * - coaching_org_admin: Admin of a coaching organization
 * - manager: Manages coaches within a coaching org
 * - coach: Assigned coach working with member companies
 * - member: Member company user receiving coaching
 * - none: No coaching role
 */
export type CoachingRole = 
  | "site_admin" 
  | "coaching_org_admin" 
  | "manager" 
  | "coach" 
  | "member" 
  | "none";

export interface CoachingRoleInfo {
  /** Primary role (highest in hierarchy) */
  role: CoachingRole;
  /** All roles the user has */
  roles: CoachingRole[];
  /** The coaching org ID(s) the user belongs to */
  coachingOrgIds: string[];
  /** The active coaching org (for context switching) */
  activeCoachingOrgId: string | null;
  /** Whether the user is in a coaching org context */
  isCoachingOrgContext: boolean;
  /** Whether the user is in a member company context */
  isMemberContext: boolean;
  /** Active engagement IDs the user can access */
  engagementIds: string[];
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
}

/**
 * Role priority for determining primary role
 */
const ROLE_PRIORITY: Record<CoachingRole, number> = {
  site_admin: 5,
  coaching_org_admin: 4,
  manager: 3,
  coach: 2,
  member: 1,
  none: 0,
};

/**
 * Hook to resolve the current user's coaching role(s) and context.
 * Uses RLS-protected database functions for security.
 */
export function useCoachingRole(): CoachingRoleInfo {
  const { isSiteAdmin, isSuperAdmin, loading: membershipLoading } = useMembership();
  const { activeCompanyId } = useActiveCompany();

  // Fetch coaching org memberships and roles
  const { data, isLoading, error } = useQuery({
    queryKey: ["coaching-role", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check if user is part of a coaching org
      const { data: coachingOrgs, error: orgsError } = await supabase
        .from("coaching_orgs")
        .select(`
          id,
          company_id,
          name,
          coaching_org_memberships!inner(
            id,
            role,
            status
          )
        `)
        .eq("coaching_org_memberships.user_id", user.id)
        .eq("coaching_org_memberships.status", "active");

      if (orgsError) throw orgsError;

      // Check if user is a manager
      const { data: managerData, error: managerError } = await supabase
        .from("coaching_managers")
        .select("id, coaching_org_id, status")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (managerError) throw managerError;

      // Check if user is a coach
      const { data: coachData, error: coachError } = await supabase
        .from("coaching_coaches")
        .select("id, coaching_org_id, status")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (coachError) throw coachError;

      // Check if active company is a member of any coaching engagement
      const { data: memberEngagements, error: memberError } = await supabase
        .from("coaching_org_engagements")
        .select("id, coaching_org_id, member_company_id, status")
        .eq("member_company_id", activeCompanyId)
        .in("status", ["active", "suspended"]);

      if (memberError) throw memberError;

      // Get user's accessible engagement IDs via coach assignments
      const { data: coachEngagements, error: assignError } = await supabase
        .from("coaching_org_engagement_assignments")
        .select(`
          id,
          coaching_engagement_id,
          coaching_engagement:coaching_org_engagements!inner(
            id,
            coaching_org_id,
            member_company_id,
            status
          )
        `)
        .eq("coach_id", coachData?.[0]?.id || "00000000-0000-0000-0000-000000000000")
        .eq("status", "active");

      // Determine roles
      const roles: CoachingRole[] = [];
      const coachingOrgIds: string[] = [];
      const engagementIds: string[] = [];

      // Check org admin status
      const orgAdminOrgs = coachingOrgs?.filter(
        (org: any) => org.coaching_org_memberships?.some(
          (m: any) => m.role === "org_admin"
        )
      ) || [];
      
      if (orgAdminOrgs.length > 0) {
        roles.push("coaching_org_admin");
        orgAdminOrgs.forEach((org: any) => coachingOrgIds.push(org.id));
      }

      // Check manager status
      if (managerData && managerData.length > 0) {
        roles.push("manager");
        managerData.forEach((m) => {
          if (!coachingOrgIds.includes(m.coaching_org_id)) {
            coachingOrgIds.push(m.coaching_org_id);
          }
        });
      }

      // Check coach status
      if (coachData && coachData.length > 0) {
        roles.push("coach");
        coachData.forEach((c) => {
          if (!coachingOrgIds.includes(c.coaching_org_id)) {
            coachingOrgIds.push(c.coaching_org_id);
          }
        });
        
        // Add engagement IDs from coach assignments
        coachEngagements?.forEach((a: any) => {
          if (a.coaching_engagement?.status !== "ended") {
            engagementIds.push(a.coaching_engagement_id);
          }
        });
      }

      // Check member company status
      if (memberEngagements && memberEngagements.length > 0) {
        roles.push("member");
        memberEngagements.forEach((e) => engagementIds.push(e.id));
      }

      // Determine if in coaching org context or member context
      const isCoachingOrgContext = coachingOrgs?.some(
        (org: any) => org.company_id === activeCompanyId
      ) || false;

      return {
        roles,
        coachingOrgIds,
        engagementIds,
        isCoachingOrgContext,
        isMemberContext: !isCoachingOrgContext && memberEngagements && memberEngagements.length > 0,
      };
    },
    enabled: !!activeCompanyId && !membershipLoading,
    staleTime: 5 * 60 * 1000,
  });

  // Build role list including site admin
  const allRoles: CoachingRole[] = [];
  
  if (isSiteAdmin || isSuperAdmin) {
    allRoles.push("site_admin");
  }
  
  if (data?.roles) {
    allRoles.push(...data.roles);
  }

  if (allRoles.length === 0) {
    allRoles.push("none");
  }

  // Get primary role (highest priority)
  const primaryRole = allRoles.reduce((highest, current) => {
    return ROLE_PRIORITY[current] > ROLE_PRIORITY[highest] ? current : highest;
  }, "none" as CoachingRole);

  return {
    role: primaryRole,
    roles: allRoles,
    coachingOrgIds: data?.coachingOrgIds || [],
    activeCoachingOrgId: data?.coachingOrgIds?.[0] || null,
    isCoachingOrgContext: data?.isCoachingOrgContext || false,
    isMemberContext: data?.isMemberContext || false,
    engagementIds: data?.engagementIds || [],
    isLoading: membershipLoading || isLoading,
    error: error as Error | null,
  };
}

/**
 * Get the dashboard route for a coaching role
 */
export function getCoachingDashboardRoute(role: CoachingRole): string {
  switch (role) {
    case "site_admin":
    case "coaching_org_admin":
      return "/app/coaching/org";
    case "manager":
      return "/app/coaching/manager";
    case "coach":
      return "/app/coaching/coach";
    case "member":
      return "/app/coaching/member";
    default:
      return "/app/coaching";
  }
}
