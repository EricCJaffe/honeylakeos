import * as React from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type MembershipRole = "admin" | "member" | "viewer" | "Company_Admin";

export interface Membership {
  id: string;
  user_id: string;
  company_id: string;
  role: MembershipRole;
  member_type: string | null;
  status: string | null;
  default_location_id: string | null;
  expires_at: string | null;
  created_at: string;
  can_access_finance: boolean | null;
  company: {
    id: string;
    name: string;
    logo_url: string | null;
    status: string | null;
    finance_mode: string | null;
  };
}

interface MembershipContextType {
  memberships: Membership[];
  activeCompanyId: string | null;
  activeCompany: Membership["company"] | null;
  activeMembership: Membership | null;
  loading: boolean;
  setActiveCompany: (companyId: string) => Promise<void>;
  isCompanyAdmin: boolean;
  isSiteAdmin: boolean;
  isSuperAdmin: boolean;
  refreshMemberships: () => Promise<void>;
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMemberships = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setActiveCompanyId(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch company memberships with company details
      // Note: We filter by status = 'active' OR status IS NULL for backwards compatibility
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
        .eq("user_id", user.id);

      if (membershipError) {
        console.error("Error fetching memberships:", membershipError);
      } else {
        const validMemberships = (membershipData || [])
          .filter((m) => m.company !== null && typeof m.company === 'object')
          // Filter for active status (or null for backwards compatibility)
          .filter((m) => m.status === 'active' || m.status === null)
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
            can_access_finance: m.can_access_finance,
            company: {
              id: (m.company as any).id,
              name: (m.company as any).name,
              logo_url: (m.company as any).logo_url,
              status: (m.company as any).status,
              finance_mode: (m.company as any).finance_mode,
            }
          }));
        setMemberships(validMemberships);

        // Auto-select first company if no active company is set
        if (validMemberships.length > 0 && !activeCompanyId) {
          setActiveCompanyId(validMemberships[0].company_id);
        }
      }
    } catch (err) {
      console.error("Error in fetchMemberships:", err);
    } finally {
      setLoading(false);
    }
  }, [user, activeCompanyId]);

  useEffect(() => {
    if (!authLoading) {
      fetchMemberships();
    }
  }, [authLoading, fetchMemberships]);

  const setActiveCompany = async (companyId: string) => {
    if (!user) return;
    setActiveCompanyId(companyId);
  };

  const activeCompany = memberships.find(m => m.company_id === activeCompanyId)?.company || null;
  const activeMembership = memberships.find(m => m.company_id === activeCompanyId) || null;
  
  const isCompanyAdmin = activeMembership?.role === "admin" || activeMembership?.role === "Company_Admin";
  // These are stubbed out - can be implemented when site_memberships table is added
  const isSiteAdmin = false;
  const isSuperAdmin = false;

  return (
    <MembershipContext.Provider
      value={{
        memberships,
        activeCompanyId,
        activeCompany,
        activeMembership,
        loading,
        setActiveCompany,
        isCompanyAdmin,
        isSiteAdmin,
        isSuperAdmin,
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
