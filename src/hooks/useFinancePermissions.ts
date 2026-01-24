import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { toast } from "sonner";

interface MemberFinanceAccess {
  id: string;
  user_id: string;
  can_access_finance: boolean;
  role: string;
  status: string;
  profile?: {
    display_name: string | null;
    email: string | null;
  };
}

export function useFinancePermissions() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  // Fetch all memberships with finance access info
  const { data: memberships, isLoading } = useQuery({
    queryKey: ["finance-permissions", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("memberships")
        .select(`
          id,
          user_id,
          can_access_finance,
          role,
          status,
          profiles:user_id (
            display_name,
            email
          )
        `)
        .eq("company_id", activeCompanyId)
        .eq("status", "active");

      if (error) throw error;

      return (data || []).map(m => ({
        id: m.id,
        user_id: m.user_id,
        can_access_finance: m.can_access_finance,
        role: m.role,
        status: m.status,
        profile: m.profiles ? {
          display_name: (m.profiles as any).display_name,
          email: (m.profiles as any).email,
        } : undefined,
      })) as MemberFinanceAccess[];
    },
    enabled: !!activeCompanyId,
  });

  // Toggle finance access for a member
  const toggleFinanceAccessMutation = useMutation({
    mutationFn: async ({ 
      membershipId, 
      userId,
      enabled 
    }: { 
      membershipId: string; 
      userId: string;
      enabled: boolean;
    }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { error } = await supabase
        .from("memberships")
        .update({ can_access_finance: enabled })
        .eq("id", membershipId);

      if (error) throw error;

      // Log to audit
      await logAuditEvent({
        companyId: activeCompanyId,
        action: "finance_permission_changed",
        entityType: "membership",
        entityId: membershipId,
        metadata: {
          user_id: userId,
          enabled,
        },
      });

      return { membershipId, enabled };
    },
    onSuccess: ({ enabled }) => {
      queryClient.invalidateQueries({ queryKey: ["finance-permissions"] });
      toast.success(`Finance access ${enabled ? "granted" : "revoked"}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update finance access: ${error.message}`);
    },
  });

  return {
    memberships: memberships || [],
    isLoading,
    toggleFinanceAccess: toggleFinanceAccessMutation.mutate,
    isUpdating: toggleFinanceAccessMutation.isPending,
  };
}
