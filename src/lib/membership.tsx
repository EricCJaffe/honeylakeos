import * as React from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type MembershipRole = "company_admin" | "location_admin" | "module_admin" | "user" | "external";
export type SiteRole = "super_admin" | "site_admin";

export interface Membership {
  id: string;
  user_id: string;
  company_id: string;
  role: MembershipRole;
  member_type: string;
  status: string;
  default_location_id: string | null;
  expires_at: string | null;
  created_at: string;
  can_access_finance: boolean;
  company: {
    id: string;
    name: string;
    logo_url: string | null;
    status: string;
    finance_mode: "builtin_books" | "external_reporting" | null;
  };
}

export interface SiteMembership {
  id: string;
  user_id: string;
  site_id: string;
  role: SiteRole;
}

interface MembershipContextType {
  memberships: Membership[];
  siteMemberships: SiteMembership[];
  activeCompanyId: string | null;
  activeCompany: Membership["company"] | null;
  activeMembership: Membership | null;
  loading: boolean;
  setActiveCompany: (companyId: string) => Promise<void>;
  isSuperAdmin: boolean;
  isSiteAdmin: boolean;
  isCompanyAdmin: boolean;
  refreshMemberships: () => Promise<void>;
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [siteMemberships, setSiteMemberships] = useState<SiteMembership[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMemberships = useCallback(async () => {
    setLoading(true);

    if (!user) {
      setMemberships([]);
      setSiteMemberships([]);
      setActiveCompanyId(null);
      setLoading(false);
      return;
    }

    try {
      let validMemberships: Membership[] = [];

      // Fetch company memberships with company details
      const { data: membershipData, error: membershipError } = await supabase
        .from("memberships")
        .select(`
          id,
          user_id,
          company_id,
          role,
          member_type,
          status,
          default_location_id,
          expires_at,
          created_at,
          can_access_finance,
          company:companies (
            id,
            name,
            logo_url,
            status,
            finance_mode
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active");

      if (membershipError) {
        console.error("Error fetching memberships:", membershipError);
      } else {
        validMemberships = (membershipData || [])
          .filter((m) => m.company !== null && typeof m.company === 'object')
          .map(m => ({
            id: m.id,
            user_id: m.user_id,
            company_id: m.company_id,
            role: m.role as MembershipRole,
            member_type: m.member_type,
            status: m.status,
            default_location_id: m.default_location_id,
            expires_at: m.expires_at,
            created_at: m.created_at,
            can_access_finance: m.can_access_finance ?? false,
            company: {
              id: (m.company as any).id,
              name: (m.company as any).name,
              logo_url: (m.company as any).logo_url,
              status: (m.company as any).status,
              finance_mode: (m.company as any).finance_mode,
            }
          }));
        setMemberships(validMemberships);
      }

      // Fetch site memberships
      const { data: siteData, error: siteError } = await supabase
        .from("site_memberships")
        .select("id, user_id, site_id, role")
        .eq("user_id", user.id);

      if (siteError) {
        console.error("Error fetching site memberships:", siteError);
      } else {
        setSiteMemberships(siteData || []);
      }

      // Fetch active company from profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("active_company_id")
        .eq("user_id", user.id)
        .single();

      if (!profileError && profileData?.active_company_id) {
        const hasProfileCompany = validMemberships.some((m) => m.company_id === profileData.active_company_id);
        if (hasProfileCompany) {
          setActiveCompanyId(profileData.active_company_id);
        } else {
          setActiveCompanyId(validMemberships[0]?.company_id ?? null);
        }
      } else {
        setActiveCompanyId(validMemberships[0]?.company_id ?? null);
      }
    } catch (err) {
      console.error("Error in fetchMemberships:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchMemberships();
    }
  }, [authLoading, fetchMemberships]);

  // Self-heal stale active company values when membership set changes.
  useEffect(() => {
    if (!memberships.length) {
      if (activeCompanyId !== null) {
        setActiveCompanyId(null);
      }
      return;
    }

    if (!activeCompanyId || !memberships.some((m) => m.company_id === activeCompanyId)) {
      setActiveCompanyId(memberships[0].company_id);
    }
  }, [activeCompanyId, memberships]);

  const setActiveCompany = async (companyId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ active_company_id: companyId })
      .eq("user_id", user.id);

    if (error) {
      console.error("Error setting active company:", error);
      throw error;
    }

    setActiveCompanyId(companyId);
  };

  const activeCompany = memberships.find(m => m.company_id === activeCompanyId)?.company || null;
  const activeMembership = memberships.find(m => m.company_id === activeCompanyId) || null;
  
  const isSuperAdmin = siteMemberships.some(sm => sm.role === "super_admin");
  const isSiteAdmin = siteMemberships.some(sm => sm.role === "site_admin" || sm.role === "super_admin");
  const isCompanyAdmin = activeMembership?.role === "company_admin";

  return (
    <MembershipContext.Provider
      value={{
        memberships,
        siteMemberships,
        activeCompanyId,
        activeCompany,
        activeMembership,
        loading,
        setActiveCompany,
        isSuperAdmin,
        isSiteAdmin,
        isCompanyAdmin,
        refreshMemberships: fetchMemberships,
      }}
    >
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  const context = useContext(MembershipContext);
  if (context === undefined) {
    throw new Error("useMembership must be used within a MembershipProvider");
  }
  return context;
}
