import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import type { FinanceAccount } from "./useChartOfAccounts";

export type JournalEntryStatus = "draft" | "posted" | "voided";

export interface JournalEntryLineAccount {
  id: string;
  name: string;
  account_number: string | null;
  account_type: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  description: string | null;
  debit_amount: number;
  credit_amount: number;
  line_order: number;
  created_at: string;
  account?: JournalEntryLineAccount;
}

export interface JournalEntry {
  id: string;
  company_id: string;
  entry_number: string;
  entry_date: string;
  posting_date: string | null;
  memo: string | null;
  status: JournalEntryStatus;
  total_debit: number;
  total_credit: number;
  is_balanced: boolean | null;
  reference_type: string | null;
  reference_id: string | null;
  created_by: string | null;
  posted_by: string | null;
  posted_at: string | null;
  voided_by: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
  lines?: JournalEntryLine[];
}

export interface JournalEntryLineFormData {
  id?: string;
  account_id: string;
  description?: string | null;
  debit_amount: number;
  credit_amount: number;
}

export interface JournalEntryFormData {
  entry_date: string;
  memo?: string | null;
  lines: JournalEntryLineFormData[];
}

export interface JournalEntriesFilter {
  status?: JournalEntryStatus | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string | null;
}

export function useJournalEntries(filter?: JournalEntriesFilter) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["journal-entries", activeCompanyId, filter],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      let query = supabase
        .from("journal_entries")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("is_sample", false)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filter?.status) {
        query = query.eq("status", filter.status);
      }
      if (filter?.dateFrom) {
        query = query.gte("entry_date", filter.dateFrom);
      }
      if (filter?.dateTo) {
        query = query.lte("entry_date", filter.dateTo);
      }
      if (filter?.search) {
        query = query.or(`entry_number.ilike.%${filter.search}%,memo.ilike.%${filter.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as JournalEntry[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useJournalEntry(entryId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["journal-entry", entryId, activeCompanyId],
    queryFn: async () => {
      if (!entryId || !activeCompanyId) return null;

      // Fetch journal entry
      const { data: entry, error: entryError } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("id", entryId)
        .eq("company_id", activeCompanyId)
        .single();

      if (entryError) throw entryError;

      // Fetch lines with account info
      const { data: lines, error: linesError } = await supabase
        .from("journal_entry_lines")
        .select(`
          *,
          account:finance_accounts(id, name, account_number, account_type)
        `)
        .eq("journal_entry_id", entryId)
        .order("line_order");

      if (linesError) throw linesError;

      return {
        ...entry,
        lines: lines || [],
      } as JournalEntry;
    },
    enabled: !!entryId && !!activeCompanyId,
  });
}

export function useJournalEntryMutations() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { log } = useAuditLog();
  const queryClient = useQueryClient();

  const generateEntryNumber = async (): Promise<string> => {
    if (!activeCompanyId) throw new Error("No active company");

    // Get count of entries for this company to generate a number
    const { count } = await supabase
      .from("journal_entries")
      .select("*", { count: "exact", head: true })
      .eq("company_id", activeCompanyId);

    const nextNum = (count || 0) + 1;
    return `JE-${nextNum.toString().padStart(5, "0")}`;
  };

  const createEntry = useMutation({
    mutationFn: async (data: JournalEntryFormData) => {
      if (!activeCompanyId || !user) throw new Error("No active company");

      // Validate lines
      if (data.lines.length < 2) {
        throw new Error("A journal entry must have at least 2 lines");
      }

      // Calculate totals
      const totalDebit = data.lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
      const totalCredit = data.lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);

      // Validate each line has debit XOR credit
      for (const line of data.lines) {
        const hasDebit = line.debit_amount > 0;
        const hasCredit = line.credit_amount > 0;
        if ((hasDebit && hasCredit) || (!hasDebit && !hasCredit)) {
          throw new Error("Each line must have either a debit or credit amount, not both or neither");
        }
      }

      const entryNumber = await generateEntryNumber();
      const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

      // Create journal entry
      const { data: entry, error: entryError } = await supabase
        .from("journal_entries")
        .insert({
          company_id: activeCompanyId,
          entry_number: entryNumber,
          entry_date: data.entry_date,
          memo: data.memo || null,
          status: "draft",
          total_debit: totalDebit,
          total_credit: totalCredit,
          is_balanced: isBalanced,
          created_by: user.id,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create lines
      const lineInserts = data.lines.map((line, index) => ({
        journal_entry_id: entry.id,
        account_id: line.account_id,
        description: line.description || null,
        debit_amount: line.debit_amount || 0,
        credit_amount: line.credit_amount || 0,
        line_order: index + 1,
      }));

      const { error: linesError } = await supabase.from("journal_entry_lines").insert(lineInserts);
      if (linesError) throw linesError;

      return entry as JournalEntry;
    },
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      log("journal_entry.created", "journal_entry", entry.id, {
        entry_number: entry.entry_number,
        total_debit: entry.total_debit,
        total_credit: entry.total_credit,
      });
      toast.success("Journal entry created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create entry: ${error.message}`);
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: JournalEntryFormData }) => {
      if (!activeCompanyId) throw new Error("No active company");

      // Check current status
      const { data: current } = await supabase
        .from("journal_entries")
        .select("status")
        .eq("id", id)
        .single();

      if (current?.status !== "draft") {
        throw new Error("Only draft entries can be edited");
      }

      // Validate lines
      if (data.lines.length < 2) {
        throw new Error("A journal entry must have at least 2 lines");
      }

      // Calculate totals
      const totalDebit = data.lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
      const totalCredit = data.lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);

      // Validate each line
      for (const line of data.lines) {
        const hasDebit = line.debit_amount > 0;
        const hasCredit = line.credit_amount > 0;
        if ((hasDebit && hasCredit) || (!hasDebit && !hasCredit)) {
          throw new Error("Each line must have either a debit or credit amount, not both or neither");
        }
      }

      const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

      // Update entry
      const { data: entry, error: entryError } = await supabase
        .from("journal_entries")
        .update({
          entry_date: data.entry_date,
          memo: data.memo || null,
          total_debit: totalDebit,
          total_credit: totalCredit,
          is_balanced: isBalanced,
        })
        .eq("id", id)
        .eq("company_id", activeCompanyId)
        .select()
        .single();

      if (entryError) throw entryError;

      // Delete existing lines and recreate
      await supabase.from("journal_entry_lines").delete().eq("journal_entry_id", id);

      const lineInserts = data.lines.map((line, index) => ({
        journal_entry_id: id,
        account_id: line.account_id,
        description: line.description || null,
        debit_amount: line.debit_amount || 0,
        credit_amount: line.credit_amount || 0,
        line_order: index + 1,
      }));

      const { error: linesError } = await supabase.from("journal_entry_lines").insert(lineInserts);
      if (linesError) throw linesError;

      return entry as JournalEntry;
    },
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entry", entry.id] });
      log("journal_entry.updated", "journal_entry", entry.id, { entry_number: entry.entry_number });
      toast.success("Journal entry updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update entry: ${error.message}`);
    },
  });

  const postEntry = useMutation({
    mutationFn: async (id: string) => {
      if (!activeCompanyId || !user) throw new Error("No active company");

      // Fetch entry and validate
      const { data: entry, error: fetchError } = await supabase
        .from("journal_entries")
        .select("*, lines:journal_entry_lines(*)")
        .eq("id", id)
        .eq("company_id", activeCompanyId)
        .single();

      if (fetchError) throw fetchError;

      if (entry.status !== "draft") {
        throw new Error("Only draft entries can be posted");
      }

      if (!entry.is_balanced) {
        throw new Error("Entry must be balanced to post (debits must equal credits)");
      }

      const now = new Date().toISOString();

      // Update entry status
      const { data: updatedEntry, error: updateError } = await supabase
        .from("journal_entries")
        .update({
          status: "posted",
          posted_by: user.id,
          posted_at: now,
          posting_date: entry.entry_date,
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Create ledger postings for reporting
      const postings = (entry.lines || []).map((line: JournalEntryLine) => ({
        company_id: activeCompanyId,
        source_type: "journal_entry",
        source_id: id,
        posting_date: entry.entry_date,
        account_id: line.account_id,
        debit_amount: line.debit_amount,
        credit_amount: line.credit_amount,
        memo: entry.memo,
      }));

      if (postings.length > 0) {
        const { error: postingsError } = await supabase.from("ledger_postings").insert(postings);
        if (postingsError) {
          console.error("Failed to create ledger postings:", postingsError);
          // Don't throw - entry is already posted
        }
      }

      return updatedEntry as JournalEntry;
    },
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entry", entry.id] });
      queryClient.invalidateQueries({ queryKey: ["trial-balance"] });
      log("journal_entry.posted", "journal_entry", entry.id, {
        entry_number: entry.entry_number,
        total_debit: entry.total_debit,
        total_credit: entry.total_credit,
      });
      toast.success("Journal entry posted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to post entry: ${error.message}`);
    },
  });

  const voidEntry = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      if (!activeCompanyId || !user) throw new Error("No active company");

      const { data: current } = await supabase
        .from("journal_entries")
        .select("status")
        .eq("id", id)
        .single();

      if (current?.status === "voided") {
        throw new Error("Entry is already voided");
      }

      const now = new Date().toISOString();

      // Update entry status
      const { data: entry, error: updateError } = await supabase
        .from("journal_entries")
        .update({
          status: "voided",
          voided_by: user.id,
          voided_at: now,
          void_reason: reason || null,
        })
        .eq("id", id)
        .eq("company_id", activeCompanyId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Remove associated ledger postings
      await supabase
        .from("ledger_postings")
        .delete()
        .eq("source_type", "journal_entry")
        .eq("source_id", id);

      return entry as JournalEntry;
    },
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entry", entry.id] });
      queryClient.invalidateQueries({ queryKey: ["trial-balance"] });
      log("journal_entry.voided", "journal_entry", entry.id, {
        entry_number: entry.entry_number,
        void_reason: entry.void_reason,
      });
      toast.success("Journal entry voided");
    },
    onError: (error: Error) => {
      toast.error(`Failed to void entry: ${error.message}`);
    },
  });

  return { createEntry, updateEntry, postEntry, voidEntry };
}

// Trial balance hook for reporting
export function useTrialBalance(asOfDate?: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["trial-balance", activeCompanyId, asOfDate],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      // Get all posted entries with their lines
      let query = supabase
        .from("ledger_postings")
        .select(`
          account_id,
          debit_amount,
          credit_amount,
          account:finance_accounts(id, name, account_number, account_type)
        `)
        .eq("company_id", activeCompanyId);

      if (asOfDate) {
        query = query.lte("posting_date", asOfDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by account
      const accountMap = new Map<string, {
        account_id: string;
        account_name: string;
        account_number: string | null;
        account_type: string;
        total_debit: number;
        total_credit: number;
        balance: number;
      }>();

      for (const posting of data || []) {
        const accountId = posting.account_id;
        const existing = accountMap.get(accountId);
        const account = posting.account as FinanceAccount | null;

        if (existing) {
          existing.total_debit += posting.debit_amount;
          existing.total_credit += posting.credit_amount;
        } else {
          accountMap.set(accountId, {
            account_id: accountId,
            account_name: account?.name || "Unknown",
            account_number: account?.account_number || null,
            account_type: account?.account_type || "expense",
            total_debit: posting.debit_amount,
            total_credit: posting.credit_amount,
            balance: 0,
          });
        }
      }

      // Calculate balances based on normal balance side
      const results = Array.from(accountMap.values()).map((row) => {
        const isDebitNormal = ["asset", "expense"].includes(row.account_type);
        row.balance = isDebitNormal
          ? row.total_debit - row.total_credit
          : row.total_credit - row.total_debit;
        return row;
      });

      // Sort by account type then number/name
      return results.sort((a, b) => {
        const typeOrder = ["asset", "liability", "equity", "income", "expense"];
        const typeA = typeOrder.indexOf(a.account_type);
        const typeB = typeOrder.indexOf(b.account_type);
        if (typeA !== typeB) return typeA - typeB;
        return (a.account_number || a.account_name).localeCompare(b.account_number || b.account_name);
      });
    },
    enabled: !!activeCompanyId,
  });
}
