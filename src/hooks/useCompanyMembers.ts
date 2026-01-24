import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";

export interface CompanyMember {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  member_type: string;
}

/**
 * Fetch all active members of the current company
 */
export function useCompanyMembers() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["company-members", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      // First get memberships
      const { data: memberships, error: membershipError } = await supabase
        .from("memberships")
        .select("user_id, role, member_type")
        .eq("company_id", activeCompanyId)
        .eq("status", "active");

      if (membershipError) throw membershipError;
      if (!memberships?.length) return [];

      // Get unique user IDs
      const userIds = memberships.map((m) => m.user_id);

      // Fetch profiles for those users
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .in("user_id", userIds);

      if (profileError) throw profileError;

      // Create a lookup map for profiles
      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      // Combine membership and profile data
      const result: CompanyMember[] = [];
      for (const m of memberships) {
        const profile = profileMap.get(m.user_id);
        if (profile) {
          result.push({
            user_id: m.user_id,
            email: profile.email || "",
            full_name: profile.full_name || null,
            role: m.role,
            member_type: m.member_type,
          });
        }
      }
      return result;
    },
    enabled: !!activeCompanyId,
  });
}

/**
 * Fetch assignees for a specific task
 */
export function useTaskAssignees(taskId?: string) {
  return useQuery({
    queryKey: ["task-assignees", taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from("task_assignees")
        .select("user_id")
        .eq("task_id", taskId);

      if (error) throw error;
      return data.map((a) => a.user_id);
    },
    enabled: !!taskId,
  });
}
