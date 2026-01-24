import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export type BankTransactionStatus = "unmatched" | "matched" | "posted" | "excluded";

export interface BankTransaction {
  id: string;
  company_id: string;
  bank_account_id: string;
  transaction_date: string;
  posted_date: string | null;
  description: string;
  original_description: string | null;
  amount: number;
  transaction_type: string | null;
  category: string | null;
  status: BankTransactionStatus;
  matched_account_id: string | null;
  matched_vendor_id: string | null;
  matched_crm_client_id: string | null;
  journal_entry_id: string | null;
  reconciliation_id: string | null;
  notes: string | null;
  plaid_transaction_id: string | null;
  import_batch_id: string | null;
  created_at: string;
  updated_at: string;
  matched_account?: {
    id: string;
    name: string;
    account_number: string | null;
    account_type: string;
  };
  matched_vendor?: {
    id: string;
    name: string;
  };
}

export interface BankTransactionsFilter {
  bankAccountId?: string | null;
  status?: BankTransactionStatus | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string | null;
}

export function useBankTransactions(filter?: BankTransactionsFilter) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["bank-transactions", activeCompanyId, filter],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      let query = supabase
        .from("bank_transactions")
        .select(`
          *,
          matched_account:finance_accounts(id, name, account_number, account_type),
          matched_vendor:vendors(id, name)
        `)
        .eq("company_id", activeCompanyId)
        .eq("is_sample", false)
        .order("transaction_date", { ascending: false });

      if (filter?.bankAccountId) {
        query = query.eq("bank_account_id", filter.bankAccountId);
      }
      if (filter?.status) {
        query = query.eq("status", filter.status);
      }
      if (filter?.dateFrom) {
        query = query.gte("transaction_date", filter.dateFrom);
      }
      if (filter?.dateTo) {
        query = query.lte("transaction_date", filter.dateTo);
      }
      if (filter?.search) {
        query = query.ilike("description", `%${filter.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BankTransaction[];
    },
    enabled: !!activeCompanyId,
  });
}

export interface CategorizeData {
  matched_account_id: string;
  matched_vendor_id?: string | null;
  matched_crm_client_id?: string | null;
  notes?: string | null;
}

export function useBankTransactionMutations() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { log } = useAuditLog();
  const queryClient = useQueryClient();

  const categorize = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategorizeData }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: txn, error } = await supabase
        .from("bank_transactions")
        .update({
          matched_account_id: data.matched_account_id,
          matched_vendor_id: data.matched_vendor_id || null,
          matched_crm_client_id: data.matched_crm_client_id || null,
          notes: data.notes || null,
          status: "matched",
        })
        .eq("id", id)
        .eq("company_id", activeCompanyId)
        .select()
        .single();

      if (error) throw error;
      return txn as BankTransaction;
    },
    onSuccess: (txn) => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      log("bank_transaction.categorized", "bank_transaction", txn.id, {
        matched_account_id: txn.matched_account_id,
      });
      toast.success("Transaction categorized");
    },
    onError: (error: Error) => {
      toast.error(`Failed to categorize: ${error.message}`);
    },
  });

  const postTransaction = useMutation({
    mutationFn: async (id: string) => {
      if (!activeCompanyId || !user) throw new Error("No active company");

      // Fetch transaction with bank account info
      const { data: txn, error: txnError } = await supabase
        .from("bank_transactions")
        .select(`
          *,
          bank_account:bank_accounts(id, finance_account_id, name)
        `)
        .eq("id", id)
        .eq("company_id", activeCompanyId)
        .single();

      if (txnError) throw txnError;

      if (!txn.matched_account_id) {
        throw new Error("Transaction must be categorized before posting");
      }

      const bankAccount = txn.bank_account as { id: string; finance_account_id: string | null; name: string };
      if (!bankAccount?.finance_account_id) {
        throw new Error("Bank account must be mapped to a COA account before posting");
      }

      // Create ledger postings
      // Positive amount = money in (debit bank, credit income/asset)
      // Negative amount = money out (credit bank, debit expense/asset)
      const isMoneyIn = txn.amount > 0;
      const absAmount = Math.abs(txn.amount);

      const postings = [
        {
          company_id: activeCompanyId,
          source_type: "bank_txn",
          source_id: id,
          posting_date: txn.transaction_date,
          account_id: bankAccount.finance_account_id,
          debit_amount: isMoneyIn ? absAmount : 0,
          credit_amount: isMoneyIn ? 0 : absAmount,
          memo: txn.description,
        },
        {
          company_id: activeCompanyId,
          source_type: "bank_txn",
          source_id: id,
          posting_date: txn.transaction_date,
          account_id: txn.matched_account_id,
          debit_amount: isMoneyIn ? 0 : absAmount,
          credit_amount: isMoneyIn ? absAmount : 0,
          memo: txn.description,
        },
      ];

      const { error: postingError } = await supabase.from("ledger_postings").insert(postings);
      if (postingError) throw postingError;

      // Update transaction status
      const { data: updated, error: updateError } = await supabase
        .from("bank_transactions")
        .update({
          status: "posted",
          posted_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;
      return updated as BankTransaction;
    },
    onSuccess: (txn) => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["trial-balance"] });
      log("bank_transaction.posted", "bank_transaction", txn.id, { amount: txn.amount });
      toast.success("Transaction posted to ledger");
    },
    onError: (error: Error) => {
      toast.error(`Failed to post: ${error.message}`);
    },
  });

  const excludeTransaction = useMutation({
    mutationFn: async (id: string) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: txn, error } = await supabase
        .from("bank_transactions")
        .update({ status: "excluded" })
        .eq("id", id)
        .eq("company_id", activeCompanyId)
        .select()
        .single();

      if (error) throw error;
      return txn as BankTransaction;
    },
    onSuccess: (txn) => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      log("bank_transaction.excluded", "bank_transaction", txn.id, {});
      toast.success("Transaction excluded");
    },
    onError: (error: Error) => {
      toast.error(`Failed to exclude: ${error.message}`);
    },
  });

  const importCsvTransactions = useMutation({
    mutationFn: async ({
      bankAccountId,
      transactions,
    }: {
      bankAccountId: string;
      transactions: Array<{
        transaction_date: string;
        description: string;
        amount: number;
      }>;
    }) => {
      if (!activeCompanyId || !user) throw new Error("No active company");

      // Generate import batch ID
      const batchId = `csv-${Date.now()}`;

      // Create hash for dedup
      const createHash = (t: { transaction_date: string; description: string; amount: number }) =>
        `${t.transaction_date}|${t.amount}|${t.description.substring(0, 50)}`;

      // Check for existing transactions
      const { data: existing } = await supabase
        .from("bank_transactions")
        .select("transaction_date, description, amount")
        .eq("bank_account_id", bankAccountId)
        .eq("company_id", activeCompanyId);

      const existingHashes = new Set((existing || []).map(createHash));

      const newTransactions = transactions.filter((t) => !existingHashes.has(createHash(t)));
      const skippedCount = transactions.length - newTransactions.length;

      if (newTransactions.length === 0) {
        return { imported: 0, skipped: skippedCount };
      }

      const inserts = newTransactions.map((t) => ({
        company_id: activeCompanyId,
        bank_account_id: bankAccountId,
        transaction_date: t.transaction_date,
        description: t.description,
        original_description: t.description,
        amount: t.amount,
        status: "unmatched" as const,
        import_batch_id: batchId,
      }));

      const { error } = await supabase.from("bank_transactions").insert(inserts);
      if (error) throw error;

      return { imported: newTransactions.length, skipped: skippedCount };
    },
    onSuccess: ({ imported, skipped }) => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      log("bank_transactions.imported", "bank_transaction", activeCompanyId!, {
        source: "csv",
        imported,
        skipped,
      });
      toast.success(`Imported ${imported} transactions${skipped > 0 ? `, skipped ${skipped} duplicates` : ""}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to import: ${error.message}`);
    },
  });

  return { categorize, postTransaction, excludeTransaction, importCsvTransactions };
}
