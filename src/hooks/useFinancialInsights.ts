import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { toast } from "sonner";

// Types
export type ImportType = "pl" | "balance_sheet" | "open_ar" | "open_ap";
export type ImportStatus = "pending" | "completed" | "failed";
export type CategoryType = "income" | "expense" | "asset" | "liability" | "equity";

export interface FinancialImportBatch {
  id: string;
  company_id: string;
  import_type: ImportType;
  period_start: string;
  period_end: string;
  source_filename: string | null;
  status: ImportStatus;
  error_message: string | null;
  row_count: number | null;
  created_by_user_id: string | null;
  created_at: string;
}

export interface FinancialCategory {
  id: string;
  company_id: string;
  name: string;
  category_type: CategoryType;
  sort_order: number;
  created_at: string;
}

export interface FinancialStatementLine {
  id: string;
  company_id: string;
  batch_id: string;
  statement_type: "pl" | "balance_sheet";
  period_start: string;
  period_end: string;
  original_category: string;
  mapped_category_id: string | null;
  amount: number;
  created_at: string;
  mapped_category?: FinancialCategory;
}

export interface OpenArItem {
  id: string;
  company_id: string;
  batch_id: string;
  customer_name: string;
  invoice_number: string | null;
  due_date: string | null;
  amount_due: number;
  created_at: string;
}

export interface OpenApItem {
  id: string;
  company_id: string;
  batch_id: string;
  vendor_name: string;
  bill_number: string | null;
  due_date: string | null;
  amount_due: number;
  created_at: string;
}

// Hook for financial categories
export function useFinancialCategories() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["financial-categories", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("financial_categories")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("category_type")
        .order("sort_order");

      if (error) throw error;
      return data as FinancialCategory[];
    },
    enabled: !!activeCompanyId,
  });

  const seedCategoriesMutation = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId) throw new Error("No active company");

      const { error } = await supabase.rpc("seed_financial_categories", {
        p_company_id: activeCompanyId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
      toast.success("Default categories created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to seed categories: ${error.message}`);
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; category_type: CategoryType }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: newCat, error } = await supabase
        .from("financial_categories")
        .insert({
          company_id: activeCompanyId,
          name: data.name,
          category_type: data.category_type,
          sort_order: 999,
        })
        .select()
        .single();

      if (error) throw error;
      return newCat;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
      toast.success("Category created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });

  return {
    categories: categories || [],
    isLoading,
    seedCategories: seedCategoriesMutation.mutate,
    isSeeding: seedCategoriesMutation.isPending,
    createCategory: createCategoryMutation.mutateAsync,
    isCreating: createCategoryMutation.isPending,
  };
}

// Hook for import batches
export function useFinancialImports() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  const { data: imports, isLoading } = useQuery({
    queryKey: ["financial-imports", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("financial_import_batches")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as FinancialImportBatch[];
    },
    enabled: !!activeCompanyId,
  });

  const createImportMutation = useMutation({
    mutationFn: async (data: {
      import_type: ImportType;
      period_start: string;
      period_end: string;
      source_filename?: string;
    }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      const { data: batch, error } = await supabase
        .from("financial_import_batches")
        .insert({
          company_id: activeCompanyId,
          import_type: data.import_type,
          period_start: data.period_start,
          period_end: data.period_end,
          source_filename: data.source_filename,
          status: "pending",
          created_by_user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        companyId: activeCompanyId,
        action: "financial_import.created",
        entityType: "financial_import",
        entityId: batch.id,
        metadata: { import_type: data.import_type, period: `${data.period_start} to ${data.period_end}` },
      });

      return batch as FinancialImportBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-imports"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create import: ${error.message}`);
    },
  });

  const completeImportMutation = useMutation({
    mutationFn: async ({ batchId, rowCount }: { batchId: string; rowCount: number }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { error } = await supabase
        .from("financial_import_batches")
        .update({ status: "completed", row_count: rowCount })
        .eq("id", batchId);

      if (error) throw error;

      await logAuditEvent({
        companyId: activeCompanyId,
        action: "financial_import.completed",
        entityType: "financial_import",
        entityId: batchId,
        metadata: { row_count: rowCount },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-imports"] });
      queryClient.invalidateQueries({ queryKey: ["financial-statement-lines"] });
      queryClient.invalidateQueries({ queryKey: ["open-ar-items"] });
      queryClient.invalidateQueries({ queryKey: ["open-ap-items"] });
      toast.success("Import completed successfully");
    },
  });

  const failImportMutation = useMutation({
    mutationFn: async ({ batchId, errorMessage }: { batchId: string; errorMessage: string }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { error } = await supabase
        .from("financial_import_batches")
        .update({ status: "failed", error_message: errorMessage })
        .eq("id", batchId);

      if (error) throw error;

      await logAuditEvent({
        companyId: activeCompanyId,
        action: "financial_import.failed",
        entityType: "financial_import",
        entityId: batchId,
        metadata: { error: errorMessage },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-imports"] });
    },
  });

  return {
    imports: imports || [],
    isLoading,
    createImport: createImportMutation.mutateAsync,
    completeImport: completeImportMutation.mutateAsync,
    failImport: failImportMutation.mutateAsync,
    isCreating: createImportMutation.isPending,
  };
}

// Hook for statement lines
export function useFinancialStatementLines(batchId?: string, statementType?: "pl" | "balance_sheet") {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  const { data: lines, isLoading } = useQuery({
    queryKey: ["financial-statement-lines", activeCompanyId, batchId, statementType],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      let query = supabase
        .from("financial_statement_lines")
        .select(`
          *,
          mapped_category:financial_categories(*)
        `)
        .eq("company_id", activeCompanyId);

      if (batchId) {
        query = query.eq("batch_id", batchId);
      }
      if (statementType) {
        query = query.eq("statement_type", statementType);
      }

      const { data, error } = await query.order("created_at");

      if (error) throw error;
      return data as FinancialStatementLine[];
    },
    enabled: !!activeCompanyId,
  });

  const insertLinesMutation = useMutation({
    mutationFn: async (data: {
      batchId: string;
      statementType: "pl" | "balance_sheet";
      periodStart: string;
      periodEnd: string;
      lines: Array<{ original_category: string; amount: number; mapped_category_id?: string }>;
    }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const rows = data.lines.map((line) => ({
        company_id: activeCompanyId,
        batch_id: data.batchId,
        statement_type: data.statementType,
        period_start: data.periodStart,
        period_end: data.periodEnd,
        original_category: line.original_category,
        amount: line.amount,
        mapped_category_id: line.mapped_category_id || null,
      }));

      const { error } = await supabase.from("financial_statement_lines").insert(rows);

      if (error) throw error;
      return rows.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-statement-lines"] });
    },
  });

  const updateMappingMutation = useMutation({
    mutationFn: async ({ lineId, categoryId }: { lineId: string; categoryId: string }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { error } = await supabase
        .from("financial_statement_lines")
        .update({ mapped_category_id: categoryId })
        .eq("id", lineId);

      if (error) throw error;

      await logAuditEvent({
        companyId: activeCompanyId,
        action: "financial_category.mapped",
        entityType: "financial_statement_line",
        entityId: lineId,
        metadata: { category_id: categoryId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-statement-lines"] });
      toast.success("Category mapping updated");
    },
  });

  return {
    lines: lines || [],
    isLoading,
    insertLines: insertLinesMutation.mutateAsync,
    updateMapping: updateMappingMutation.mutate,
    isInserting: insertLinesMutation.isPending,
  };
}

// Hook for Open AR items
export function useOpenArItems(batchId?: string) {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["open-ar-items", activeCompanyId, batchId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      let query = supabase
        .from("open_ar_items")
        .select("*")
        .eq("company_id", activeCompanyId);

      if (batchId) {
        query = query.eq("batch_id", batchId);
      }

      const { data, error } = await query.order("due_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as OpenArItem[];
    },
    enabled: !!activeCompanyId,
  });

  const insertItemsMutation = useMutation({
    mutationFn: async (data: {
      batchId: string;
      items: Array<{ customer_name: string; invoice_number?: string; due_date?: string; amount_due: number }>;
    }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const rows = data.items.map((item) => ({
        company_id: activeCompanyId,
        batch_id: data.batchId,
        customer_name: item.customer_name,
        invoice_number: item.invoice_number || null,
        due_date: item.due_date || null,
        amount_due: item.amount_due,
      }));

      const { error } = await supabase.from("open_ar_items").insert(rows);

      if (error) throw error;
      return rows.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-ar-items"] });
    },
  });

  return {
    items: items || [],
    isLoading,
    insertItems: insertItemsMutation.mutateAsync,
    isInserting: insertItemsMutation.isPending,
  };
}

// Hook for Open AP items
export function useOpenApItems(batchId?: string) {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["open-ap-items", activeCompanyId, batchId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      let query = supabase
        .from("open_ap_items")
        .select("*")
        .eq("company_id", activeCompanyId);

      if (batchId) {
        query = query.eq("batch_id", batchId);
      }

      const { data, error } = await query.order("due_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as OpenApItem[];
    },
    enabled: !!activeCompanyId,
  });

  const insertItemsMutation = useMutation({
    mutationFn: async (data: {
      batchId: string;
      items: Array<{ vendor_name: string; bill_number?: string; due_date?: string; amount_due: number }>;
    }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const rows = data.items.map((item) => ({
        company_id: activeCompanyId,
        batch_id: data.batchId,
        vendor_name: item.vendor_name,
        bill_number: item.bill_number || null,
        due_date: item.due_date || null,
        amount_due: item.amount_due,
      }));

      const { error } = await supabase.from("open_ap_items").insert(rows);

      if (error) throw error;
      return rows.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-ap-items"] });
    },
  });

  return {
    items: items || [],
    isLoading,
    insertItems: insertItemsMutation.mutateAsync,
    isInserting: insertItemsMutation.isPending,
  };
}
