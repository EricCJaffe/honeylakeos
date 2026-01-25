import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export interface BankAccount {
  id: string;
  company_id: string;
  name: string;
  institution_name: string | null;
  account_mask: string | null;
  account_type: string;
  currency: string;
  current_balance: number;
  available_balance: number | null;
  finance_account_id: string | null;
  plaid_account_id: string | null;
  plaid_item_id: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  finance_account?: {
    id: string;
    name: string;
    account_number: string | null;
  };
}

export interface BankAccountFormData {
  name: string;
  institution_name?: string | null;
  account_mask?: string | null;
  account_type?: string;
  current_balance?: number;
  finance_account_id?: string | null;
}

export function useBankAccounts() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["bank-accounts", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("bank_accounts")
        .select(`
          *,
          finance_account:finance_accounts(id, name, account_number)
        `)
        .eq("company_id", activeCompanyId)
        .eq("is_sample", false)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as BankAccount[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useBankAccount(accountId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["bank-account", accountId, activeCompanyId],
    queryFn: async () => {
      if (!accountId || !activeCompanyId) return null;

      const { data, error } = await supabase
        .from("bank_accounts")
        .select(`
          *,
          finance_account:finance_accounts(id, name, account_number)
        `)
        .eq("id", accountId)
        .eq("company_id", activeCompanyId)
        .single();

      if (error) throw error;
      return data as BankAccount;
    },
    enabled: !!accountId && !!activeCompanyId,
  });
}

export function useBankAccountMutations() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { log } = useAuditLog();
  const queryClient = useQueryClient();

  const createAccount = useMutation({
    mutationFn: async (data: BankAccountFormData) => {
      if (!activeCompanyId || !user) throw new Error("No active company");

      const { data: account, error } = await supabase
        .from("bank_accounts")
        .insert({
          company_id: activeCompanyId,
          name: data.name,
          institution_name: data.institution_name || null,
          account_mask: data.account_mask || null,
          account_type: data.account_type || "checking",
          current_balance: data.current_balance ?? 0,
          finance_account_id: data.finance_account_id || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return account as BankAccount;
    },
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      log("bank_account.created", "bank_account", account.id, { name: account.name });
      toast.success("Bank account created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create account: ${error.message}`);
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BankAccountFormData> }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: account, error } = await supabase
        .from("bank_accounts")
        .update({
          name: data.name,
          institution_name: data.institution_name,
          account_mask: data.account_mask,
          account_type: data.account_type,
          current_balance: data.current_balance,
          finance_account_id: data.finance_account_id,
        })
        .eq("id", id)
        .eq("company_id", activeCompanyId)
        .select()
        .single();

      if (error) throw error;
      return account as BankAccount;
    },
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-account", account.id] });
      log("bank_account.updated", "bank_account", account.id, { name: account.name });
      toast.success("Bank account updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update account: ${error.message}`);
    },
  });

  const mapToCoa = useMutation({
    mutationFn: async ({ id, financeAccountId }: { id: string; financeAccountId: string }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: account, error } = await supabase
        .from("bank_accounts")
        .update({ finance_account_id: financeAccountId })
        .eq("id", id)
        .eq("company_id", activeCompanyId)
        .select()
        .single();

      if (error) throw error;
      return account as BankAccount;
    },
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-account", account.id] });
      log("bank_account.mapped_to_coa", "bank_account", account.id, { 
        finance_account_id: account.finance_account_id 
      });
      toast.success("Bank account mapped to COA");
    },
    onError: (error: Error) => {
      toast.error(`Failed to map account: ${error.message}`);
    },
  });

  const deactivateAccount = useMutation({
    mutationFn: async (id: string) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { error } = await supabase
        .from("bank_accounts")
        .update({ is_active: false })
        .eq("id", id)
        .eq("company_id", activeCompanyId);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      log("bank_account.deactivated", "bank_account", id, {});
      toast.success("Bank account deactivated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate account: ${error.message}`);
    },
  });

  return { createAccount, updateAccount, mapToCoa, deactivateAccount };
}
