import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export interface FinanceAccount {
  id: string;
  company_id: string;
  account_number: string | null;
  name: string;
  account_type: AccountType;
  account_subtype: string | null;
  parent_account_id: string | null;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  normal_balance: string | null;
  opening_balance: number;
  current_balance: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface AccountFormData {
  account_number?: string | null;
  name: string;
  account_type: AccountType;
  account_subtype?: string | null;
  description?: string | null;
  parent_account_id?: string | null;
  is_active?: boolean;
}

export interface CoaTemplate {
  id: string;
  site_id: string | null;
  name: string;
  description: string | null;
  template_json: Array<{
    account_number?: string;
    name: string;
    account_type: AccountType;
    description?: string;
  }>;
  is_default: boolean;
  created_at: string;
}

export function useFinanceAccounts() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["finance-accounts", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("finance_accounts")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("account_type")
        .order("account_number")
        .order("name");

      if (error) throw error;
      return (data || []) as FinanceAccount[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useActiveFinanceAccounts() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["finance-accounts-active", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("finance_accounts")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("is_active", true)
        .order("account_type")
        .order("account_number")
        .order("name");

      if (error) throw error;
      return (data || []) as FinanceAccount[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useCoaTemplates() {
  return useQuery({
    queryKey: ["coa-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coa_templates")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name");

      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        template_json: t.template_json as CoaTemplate["template_json"],
      })) as CoaTemplate[];
    },
  });
}

export function useHasChartOfAccounts() {
  const { data: accounts, isLoading } = useFinanceAccounts();
  return {
    hasAccounts: (accounts?.length ?? 0) > 0,
    isLoading,
    accountCount: accounts?.length ?? 0,
  };
}

export function useFinanceAccountMutations() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { log } = useAuditLog();
  const queryClient = useQueryClient();

  const createAccount = useMutation({
    mutationFn: async (data: AccountFormData) => {
      if (!activeCompanyId || !user) throw new Error("No active company");

      const normalBalance = ["asset", "expense"].includes(data.account_type) ? "debit" : "credit";

      const { data: account, error } = await supabase
        .from("finance_accounts")
        .insert({
          company_id: activeCompanyId,
          account_number: data.account_number || null,
          name: data.name,
          account_type: data.account_type,
          account_subtype: data.account_subtype || null,
          description: data.description || null,
          parent_account_id: data.parent_account_id || null,
          is_active: data.is_active ?? true,
          normal_balance: normalBalance,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return account as FinanceAccount;
    },
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: ["finance-accounts"] });
      log("coa.account_created", "finance_account", account.id, { 
        name: account.name, 
        account_type: account.account_type 
      });
      toast.success("Account created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create account: ${error.message}`);
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AccountFormData> }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const updates: Record<string, unknown> = {};
      if (data.account_number !== undefined) updates.account_number = data.account_number;
      if (data.name !== undefined) updates.name = data.name;
      if (data.account_type !== undefined) {
        updates.account_type = data.account_type;
        updates.normal_balance = ["asset", "expense"].includes(data.account_type) ? "debit" : "credit";
      }
      if (data.account_subtype !== undefined) updates.account_subtype = data.account_subtype;
      if (data.description !== undefined) updates.description = data.description;
      if (data.parent_account_id !== undefined) updates.parent_account_id = data.parent_account_id;
      if (data.is_active !== undefined) updates.is_active = data.is_active;

      const { data: account, error } = await supabase
        .from("finance_accounts")
        .update(updates)
        .eq("id", id)
        .eq("company_id", activeCompanyId)
        .select()
        .single();

      if (error) throw error;
      return account as FinanceAccount;
    },
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: ["finance-accounts"] });
      log("coa.account_updated", "finance_account", account.id, { name: account.name });
      toast.success("Account updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update account: ${error.message}`);
    },
  });

  const deactivateAccount = useMutation({
    mutationFn: async (id: string) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: account, error } = await supabase
        .from("finance_accounts")
        .update({ is_active: false })
        .eq("id", id)
        .eq("company_id", activeCompanyId)
        .select()
        .single();

      if (error) throw error;
      return account as FinanceAccount;
    },
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: ["finance-accounts"] });
      log("coa.account_deactivated", "finance_account", account.id, { name: account.name });
      toast.success("Account deactivated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate account: ${error.message}`);
    },
  });

  const applyTemplate = useMutation({
    mutationFn: async (template: CoaTemplate) => {
      if (!activeCompanyId || !user) throw new Error("No active company");

      const accounts = template.template_json.map((item, index) => ({
        company_id: activeCompanyId,
        account_number: item.account_number || null,
        name: item.name,
        account_type: item.account_type,
        description: item.description || null,
        is_active: true,
        is_system: false,
        normal_balance: ["asset", "expense"].includes(item.account_type) ? "debit" : "credit",
        display_order: index + 1,
        created_by: user.id,
      }));

      const { error } = await supabase.from("finance_accounts").insert(accounts);
      if (error) throw error;

      return template;
    },
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ["finance-accounts"] });
      log("coa.template_applied", "coa_template", template.id, { 
        template_name: template.name,
        account_count: template.template_json.length,
      });
      toast.success(`Applied "${template.name}" template with ${template.template_json.length} accounts`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to apply template: ${error.message}`);
    },
  });

  const importAccounts = useMutation({
    mutationFn: async (accounts: AccountFormData[]) => {
      if (!activeCompanyId || !user) throw new Error("No active company");

      const inserts = accounts.map((item, index) => ({
        company_id: activeCompanyId,
        account_number: item.account_number || null,
        name: item.name,
        account_type: item.account_type,
        account_subtype: item.account_subtype || null,
        description: item.description || null,
        is_active: true,
        is_system: false,
        normal_balance: ["asset", "expense"].includes(item.account_type) ? "debit" : "credit",
        display_order: index + 1,
        created_by: user.id,
      }));

      const { error } = await supabase.from("finance_accounts").insert(inserts);
      if (error) throw error;

      return accounts.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["finance-accounts"] });
      log("coa.import_completed", "finance_account", activeCompanyId!, { account_count: count });
      toast.success(`Imported ${count} accounts`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to import accounts: ${error.message}`);
    },
  });

  return { createAccount, updateAccount, deactivateAccount, applyTemplate, importAccounts };
}
