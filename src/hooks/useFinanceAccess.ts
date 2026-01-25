import { useMembership } from "@/lib/membership";

/**
 * Hook to check if the current user has finance access.
 * 
 * Finance access is granted if:
 * 1. User is a company_admin (always has access)
 * 2. User has can_access_finance = true in their membership
 * 3. User is a site_admin or super_admin
 */
export function useFinanceAccess() {
  const { 
    activeMembership, 
    isCompanyAdmin, 
    isSiteAdmin, 
    isSuperAdmin,
    activeCompanyId,
    loading 
  } = useMembership();

  // Company admin, site admin, or super admin always has finance access
  const hasAdminAccess = isCompanyAdmin || isSiteAdmin || isSuperAdmin;
  
  // Check explicit finance permission from membership
  const hasExplicitFinanceAccess = activeMembership?.can_access_finance === true;
  
  const hasFinanceAccess = hasAdminAccess || hasExplicitFinanceAccess;

  return {
    hasFinanceAccess,
    hasAdminAccess,
    hasExplicitFinanceAccess,
    loading,
    activeCompanyId,
  };
}
