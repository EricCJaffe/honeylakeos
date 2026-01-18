import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

export type FinanceMode = Database["public"]["Enums"]["finance_mode"];

export type DataRetentionAction = "keep" | "archive" | "delete";

export function useFinanceMode() {
  const { activeCompanyId, activeCompany } = useActiveCompany();
  const queryClient = useQueryClient();

  const financeMode = activeCompany?.finance_mode as FinanceMode | null;

  const updateFinanceModeMutation = useMutation({
    mutationFn: async ({
      newMode,
      dataAction,
    }: {
      newMode: FinanceMode;
      dataAction: DataRetentionAction;
    }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const oldMode = financeMode;

      // Update the company's finance mode
      const { error } = await supabase
        .from("companies")
        .update({ finance_mode: newMode })
        .eq("id", activeCompanyId);

      if (error) throw error;

      // Log the change to audit log
      await logAuditEvent({
        companyId: activeCompanyId,
        action: "finance_mode_changed",
        entityType: "company",
        entityId: activeCompanyId,
        metadata: {
          from_mode: oldMode,
          to_mode: newMode,
          data_action: dataAction,
        },
      });

      return { oldMode, newMode, dataAction };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-company"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Finance mode updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update finance mode: ${error.message}`);
    },
  });

  return {
    financeMode,
    isBuiltinBooks: financeMode === "builtin_books",
    isExternalReporting: financeMode === "external_reporting",
    updateFinanceMode: updateFinanceModeMutation.mutate,
    isUpdating: updateFinanceModeMutation.isPending,
  };
}
