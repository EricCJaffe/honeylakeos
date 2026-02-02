import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export type ReconciliationStatus = "in_progress" | "completed" | "voided";

export interface BankReconciliation {
  id: string;
  company_id: string;
  bank_account_id: string;
  statement_date: string;
  statement_ending_balance: number;
  cleared_balance: number;
  difference: number | null;
  status: ReconciliationStatus;
  notes: string | null;
  started_at: string;
  completed_at: string | null;
  completed_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  bank_account?: {
    id: string;
    name: string;
    institution_name: string | null;
  };
}

export interface ReconciliationFormData {
  bank_account_id: string;
  statement_date: string;
  statement_ending_balance: number;
  notes?: string | null;
}

export function useBankReconciliations(bankAccountId?: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["bank-reconciliations", activeCompanyId, bankAccountId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      let query = supabase
        .from("bank_reconciliations")
        .select(`
          *,
          bank_account:bank_accounts(id, name, institution_name)
        `)
        .eq("company_id", activeCompanyId)
        .order("statement_date", { ascending: false });

      if (bankAccountId) {
        query = query.eq("bank_account_id", bankAccountId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as BankReconciliation[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useBankReconciliation(reconciliationId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["bank-reconciliation", reconciliationId, activeCompanyId],
    queryFn: async () => {
      if (!reconciliationId || !activeCompanyId) return null;

      const { data, error } = await supabase
        .from("bank_reconciliations")
        .select(`
          *,
          bank_account:bank_accounts(id, name, institution_name, finance_account_id)
        `)
        .eq("id", reconciliationId)
        .eq("company_id", activeCompanyId)
        .single();

      if (error) throw error;
      return data as BankReconciliation;
    },
    enabled: !!reconciliationId && !!activeCompanyId,
  });
}

// Get transactions for reconciliation (posted, not yet reconciled, within date range)
export function useReconciliationTransactions(
  bankAccountId: string | undefined,
  statementDate: string | undefined
) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["reconciliation-transactions", activeCompanyId, bankAccountId, statementDate],
    queryFn: async () => {
      if (!activeCompanyId || !bankAccountId || !statementDate) return [];

      const { data, error } = await supabase
        .from("bank_transactions")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("bank_account_id", bankAccountId)
        .eq("status", "posted")
        .is("reconciliation_id", null)
        .lte("transaction_date", statementDate)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId && !!bankAccountId && !!statementDate,
  });
}

export function useBankReconciliationMutations() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { log } = useAuditLog();
  const queryClient = useQueryClient();

  const startReconciliation = useMutation({
    mutationFn: async (data: ReconciliationFormData) => {
      if (!activeCompanyId || !user) throw new Error("No active company");

      // Check for existing open reconciliation
      const { data: existing } = await supabase
        .from("bank_reconciliations")
        .select("id")
        .eq("bank_account_id", data.bank_account_id)
        .eq("company_id", activeCompanyId)
        .eq("status", "in_progress")
        .single();

      if (existing) {
        throw new Error("There is already an open reconciliation for this account");
      }

      const { data: recon, error } = await supabase
        .from("bank_reconciliations")
        .insert({
          company_id: activeCompanyId,
          bank_account_id: data.bank_account_id,
          statement_date: data.statement_date,
          statement_ending_balance: data.statement_ending_balance,
          notes: data.notes || null,
          status: "in_progress",
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return recon as BankReconciliation;
    },
    onSuccess: (recon) => {
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliations"] });
      log("reconciliation.started", "reconciliation", recon.id, {
        bank_account_id: recon.bank_account_id,
        statement_date: recon.statement_date,
      });
      toast.success("Reconciliation started");
    },
    onError: (error: Error) => {
      toast.error(`Failed to start reconciliation: ${error.message}`);
    },
  });

  const updateClearedBalance = useMutation({
    mutationFn: async ({ id, clearedBalance }: { id: string; clearedBalance: number }) => {
      if (!activeCompanyId) throw new Error("No active company");

      // Get the reconciliation to calculate difference
      const { data: recon } = await supabase
        .from("bank_reconciliations")
        .select("statement_ending_balance")
        .eq("id", id)
        .single();

      const difference = recon ? recon.statement_ending_balance - clearedBalance : null;

      const { data: updated, error } = await supabase
        .from("bank_reconciliations")
        .update({
          cleared_balance: clearedBalance,
          difference,
        })
        .eq("id", id)
        .eq("company_id", activeCompanyId)
        .select()
        .single();

      if (error) throw error;
      return updated as BankReconciliation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliation"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const completeReconciliation = useMutation({
    mutationFn: async ({
      id,
      clearedTransactionIds,
    }: {
      id: string;
      clearedTransactionIds: string[];
    }) => {
      if (!activeCompanyId || !user) throw new Error("No active company");

      // Verify difference is zero
      const { data: recon, error: fetchError } = await supabase
        .from("bank_reconciliations")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      if (recon.difference !== null && Math.abs(recon.difference) > 0.01) {
        throw new Error("Cannot complete reconciliation - difference must be zero");
      }

      // Mark transactions as reconciled
      if (clearedTransactionIds.length > 0) {
        const { error: txnError } = await supabase
          .from("bank_transactions")
          .update({ reconciliation_id: id })
          .in("id", clearedTransactionIds)
          .eq("company_id", activeCompanyId);

        if (txnError) throw txnError;
      }

      // Complete the reconciliation
      const { data: updated, error } = await supabase
        .from("bank_reconciliations")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          completed_by: user.id,
        })
        .eq("id", id)
        .eq("company_id", activeCompanyId)
        .select()
        .single();

      if (error) throw error;
      return updated as BankReconciliation;
    },
    onSuccess: (recon) => {
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliations"] });
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      log("reconciliation.completed", "reconciliation", recon.id, {
        bank_account_id: recon.bank_account_id,
        statement_date: recon.statement_date,
      });
      toast.success("Reconciliation completed");
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete: ${error.message}`);
    },
  });

  const voidReconciliation = useMutation({
    mutationFn: async (id: string) => {
      if (!activeCompanyId || !user) throw new Error("No active company");

      // Unmark transactions
      await supabase
        .from("bank_transactions")
        .update({ reconciliation_id: null })
        .eq("reconciliation_id", id)
        .eq("company_id", activeCompanyId);

      // Void the reconciliation
      const { data: updated, error } = await supabase
        .from("bank_reconciliations")
        .update({ status: "voided" })
        .eq("id", id)
        .eq("company_id", activeCompanyId)
        .select()
        .single();

      if (error) throw error;
      return updated as BankReconciliation;
    },
    onSuccess: (recon) => {
      queryClient.invalidateQueries({ queryKey: ["bank-reconciliations"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      log("reconciliation.voided", "reconciliation", recon.id, {});
      toast.success("Reconciliation voided");
    },
    onError: (error: Error) => {
      toast.error(`Failed to void: ${error.message}`);
    },
  });

  return { startReconciliation, updateClearedBalance, completeReconciliation, voidReconciliation };
}
