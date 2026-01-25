import { useMembership } from "@/lib/membership";

export function useActiveCompany() {
  const { activeCompanyId, activeCompany, isCompanyAdmin, loading } = useMembership();

  return {
    activeCompanyId,
    activeCompany,
    isCompanyAdmin,
    loading,
  };
}
