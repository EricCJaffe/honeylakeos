import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";

export interface CoachingRoles {
  /** User has a row in coaching_coach_profiles with archived_at IS NULL */
  isCoachLike: boolean;
  /** User's company has a coaching_orgs row */
  companyHasCoachingOrg: boolean;
  /** User is org_admin role in coaching_coach_profiles OR is company admin of a coaching org company */
  isOrgAdmin: boolean;
  /** User is a manager in coaching system */
  isManager: boolean;
  /** User's company is a member of a coaching org (via coaching_org_engagements) */
  isMember: boolean;
  /** Whether coaching section should show in sidebar */
  showCoachingSection: boolean;
  /** Loading state */
  loading: boolean;
  /** The coaching org ID if the company has one */
  coachingOrgId: string | null;
}

export function useCoachingRoles(): CoachingRoles {
  const { user } = useAuth();
  const { activeCompanyId, isSiteAdmin, isSuperAdmin, isCompanyAdmin } = useMembership();
  
  const [isCoachLike, setIsCoachLike] = useState(false);
  const [companyHasCoachingOrg, setCompanyHasCoachingOrg] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [coachingOrgId, setCoachingOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCoachingRoles() {
      if (!user || !activeCompanyId) {
        setLoading(false);
        return;
      }

      try {
        // 1. Check if user has a coaching coach profile (is_coach_like)
        const { data: coachProfile } = await supabase
          .from("coaching_coach_profiles")
          .select("id, coach_role")
          .eq("user_id", user.id)
          .is("archived_at", null)
          .maybeSingle();

        const hasCoachProfile = !!coachProfile;
        setIsCoachLike(hasCoachProfile);
        
        // Check if user is org_admin via coach profile
        const isProfileOrgAdmin = coachProfile?.coach_role === "org_admin";

        // 2. Check if company has a coaching_orgs row
        const { data: coachingOrg } = await supabase
          .from("coaching_orgs")
          .select("id, name, status")
          .eq("company_id", activeCompanyId)
          .eq("status", "active")
          .maybeSingle();

        const hasCoachingOrg = !!coachingOrg;
        setCompanyHasCoachingOrg(hasCoachingOrg);
        setCoachingOrgId(coachingOrg?.id || null);

        // 3. Determine org admin status
        // User is org admin if:
        // - They have coach_role = 'org_admin' in coaching_coach_profiles, OR
        // - They are company admin of a company that has a coaching org
        const orgAdminStatus = isProfileOrgAdmin || (hasCoachingOrg && isCompanyAdmin);
        setIsOrgAdmin(orgAdminStatus);

        // 4. Check for manager status via coaching_managers table
        if (coachingOrg?.id) {
          const { data: managerData } = await supabase
            .from("coaching_managers")
            .select("id")
            .eq("user_id", user.id)
            .eq("coaching_org_id", coachingOrg.id)
            .eq("status", "active")
            .maybeSingle();
          
          setIsManager(!!managerData);
        }

        // 5. Check if company is a member of any coaching org (via coaching_org_engagements)
        const { data: engagementData } = await supabase
          .from("coaching_org_engagements")
          .select("id")
          .eq("member_company_id", activeCompanyId)
          .eq("status", "active")
          .maybeSingle();

        const isMemberCompany = !!engagementData;
        setIsMember(isMemberCompany);

      } catch (error) {
        console.error("Error fetching coaching roles:", error);
      } finally {
        setLoading(false);
      }
    }

    setLoading(true);
    fetchCoachingRoles();
  }, [user, activeCompanyId, isCompanyAdmin]);

  // Show coaching section if ANY of:
  // - is_site_admin or is_super_admin
  // - is_coach_like (has coaching_coach_profiles row)
  // - company has a coaching_orgs row
  // - company is a member of a coaching org
  const showCoachingSection = 
    isSiteAdmin || 
    isSuperAdmin || 
    isCoachLike || 
    companyHasCoachingOrg ||
    isMember;

  return {
    isCoachLike,
    companyHasCoachingOrg,
    isOrgAdmin,
    isManager,
    isMember,
    showCoachingSection,
    loading,
    coachingOrgId,
  };
}
