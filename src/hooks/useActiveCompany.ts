import { useMembership } from "@/lib/membership";

export function useActiveCompany() {
  const { activeCompanyId, activeCompany, isCompanyAdmin, isSiteAdmin, isSuperAdmin, loading } = useMembership();
  const canAdministerActiveCompany = isCompanyAdmin || isSiteAdmin || isSuperAdmin;

  return {
    activeCompanyId,
    activeCompany,
    isCompanyAdmin: canAdministerActiveCompany,
    loading,
  };
}
