import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useActiveCompany } from "./useActiveCompany";

export interface UserDepartmentMembership {
  id: string;
  department_id: string;
  user_id: string;
  role: "member" | "manager";
  department: {
    id: string;
    name: string;
    description: string | null;
  };
}

/**
 * Fetches the departments the current user belongs to in the active company
 */
export function useUserDepartmentMembership() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["user-department-membership", user?.id, activeCompanyId],
    queryFn: async () => {
      if (!user?.id || !activeCompanyId) return [];

      const { data, error } = await supabase
        .from("department_members")
        .select(`
          id,
          department_id,
          user_id,
          role,
          department:departments!inner(
            id,
            name,
            description,
            company_id
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      // Filter to only the active company's departments
      const filtered = (data || []).filter(
        (dm: any) => dm.department?.company_id === activeCompanyId
      );

      return filtered as UserDepartmentMembership[];
    },
    enabled: !!user?.id && !!activeCompanyId,
  });
}

/**
 * Check if user is a manager in a specific department
 */
export function useIsDepartmentManager(departmentId: string | undefined) {
  const { data: memberships } = useUserDepartmentMembership();
  
  if (!departmentId || !memberships) return false;
  
  const membership = memberships.find(m => m.department_id === departmentId);
  return membership?.role === "manager";
}

/**
 * Check if user is a member (or manager) of a specific department
 */
export function useIsDepartmentMember(departmentId: string | undefined) {
  const { data: memberships } = useUserDepartmentMembership();
  
  if (!departmentId || !memberships) return false;
  
  return memberships.some(m => m.department_id === departmentId);
}
