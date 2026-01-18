import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { toast } from "sonner";

export interface FinanceTargets {
  revenue_target_mtd?: number | null;
  revenue_target_ytd?: number | null;
  net_income_target_mtd?: number | null;
  cash_minimum?: number | null;
  ar_max?: number | null;
  ap_max?: number | null;
  gross_margin_minimum?: number | null;
}

export interface FrameworkFinanceTarget {
  id: string;
  company_id: string;
  framework_id: string;
  targets_json: FinanceTargets;
  updated_at: string;
  updated_by_user_id: string | null;
  created_at: string;
}

export function useFrameworkFinanceTargets(frameworkId: string | null) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["framework-finance-targets", activeCompanyId, frameworkId],
    queryFn: async (): Promise<FrameworkFinanceTarget | null> => {
      if (!activeCompanyId || !frameworkId) return null;

      const { data, error } = await supabase
        .from("framework_finance_targets")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("framework_id", frameworkId)
        .maybeSingle();

      if (error) throw error;
      return data as FrameworkFinanceTarget | null;
    },
    enabled: !!activeCompanyId && !!frameworkId,
  });
}

export function useFrameworkFinanceTargetsMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const upsertTargets = useMutation({
    mutationFn: async ({
      frameworkId,
      targets,
    }: {
      frameworkId: string;
      targets: FinanceTargets;
    }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error } = await supabase
        .from("framework_finance_targets")
        .upsert(
          {
            company_id: activeCompanyId,
            framework_id: frameworkId,
            targets_json: targets,
            updated_at: new Date().toISOString(),
            updated_by_user_id: userId,
          },
          { onConflict: "company_id,framework_id" }
        )
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        companyId: activeCompanyId,
        action: "finance_mode_changed",
        entityType: "company",
        entityId: frameworkId,
        metadata: { targets },
      });

      return data as FrameworkFinanceTarget;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["framework-finance-targets", activeCompanyId, variables.frameworkId],
      });
      toast.success("Finance targets saved");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save targets: ${error.message}`);
    },
  });

  return { upsertTargets };
}
