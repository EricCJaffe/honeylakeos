import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Vendor } from "./useVendors";

export type BillStatus = "draft" | "approved" | "paid" | "voided";

export interface BillLine {
  id: string;
  bill_id: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  amount: number;
  account_id: string | null;
  line_order: number;
  created_at: string;
}

export interface Bill {
  id: string;
  company_id: string;
  vendor_id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  status: BillStatus;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number | null;
  currency: string;
  memo: string | null;
  payment_date: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  vendor?: {
    id: string;
    name: string;
    email: string | null;
  };
  bill_lines?: BillLine[];
}

export interface BillLineFormData {
  id?: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  account_id?: string | null;
}

export interface BillFormData {
  vendor_id: string;
  bill_number?: string;
  bill_date: string;
  due_date: string;
  memo?: string | null;
  lines: BillLineFormData[];
}

export interface BillsFilter {
  status?: BillStatus | null;
  vendorId?: string | null;
  dueDateFrom?: string | null;
  dueDateTo?: string | null;
  search?: string | null;
}

export function useBills(filter?: BillsFilter) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["bills", activeCompanyId, filter],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      let query = supabase
        .from("bills")
        .select(`
          *,
          vendor:vendors(id, name, email)
        `)
        .eq("company_id", activeCompanyId)
        .is("archived_at", null)
        .eq("is_sample", false)
        .order("due_date", { ascending: true });

      if (filter?.status) {
        query = query.eq("status", filter.status);
      }
      if (filter?.vendorId) {
        query = query.eq("vendor_id", filter.vendorId);
      }
      if (filter?.dueDateFrom) {
        query = query.gte("due_date", filter.dueDateFrom);
      }
      if (filter?.dueDateTo) {
        query = query.lte("due_date", filter.dueDateTo);
      }
      if (filter?.search) {
        query = query.or(`bill_number.ilike.%${filter.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Bill[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useBill(billId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["bill", billId, activeCompanyId],
    queryFn: async () => {
      if (!billId || !activeCompanyId) return null;

      const { data, error } = await supabase
        .from("bills")
        .select(`
          *,
          vendor:vendors(*),
          bill_lines(*)
        `)
        .eq("id", billId)
        .eq("company_id", activeCompanyId)
        .single();

      if (error) throw error;
      return data as Bill;
    },
    enabled: !!billId && !!activeCompanyId,
  });
}

export function useBillMutations() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { log } = useAuditLog();
  const queryClient = useQueryClient();

  const createBill = useMutation({
    mutationFn: async (data: BillFormData) => {
      if (!activeCompanyId || !user) throw new Error("No active company");

      // Calculate totals
      const subtotal = data.lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
      const total = subtotal; // No tax calculation in v1

      // Generate bill number if not provided
      const billNumber = data.bill_number || `BILL-${Date.now()}`;

      // Create bill
      const { data: bill, error: billError } = await supabase
        .from("bills")
        .insert({
          company_id: activeCompanyId,
          vendor_id: data.vendor_id,
          bill_number: billNumber,
          bill_date: data.bill_date,
          due_date: data.due_date,
          status: "draft",
          subtotal_amount: subtotal,
          tax_amount: 0,
          total_amount: total,
          amount_paid: 0,
          balance_due: total,
          currency: "USD",
          memo: data.memo || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (billError) throw billError;

      // Create bill lines
      if (data.lines.length > 0) {
        const lineInserts = data.lines.map((line, index) => ({
          bill_id: bill.id,
          description: line.description || null,
          quantity: line.quantity,
          unit_price: line.unit_price,
          amount: line.quantity * line.unit_price,
          account_id: line.account_id || null,
          line_order: index + 1,
        }));

        const { error: linesError } = await supabase.from("bill_lines").insert(lineInserts);
        if (linesError) throw linesError;
      }

      return bill as Bill;
    },
    onSuccess: (bill) => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      log("bill.created", "bill", bill.id, { bill_number: bill.bill_number, total: bill.total_amount });
      toast.success("Bill created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create bill: ${error.message}`);
    },
  });

  const updateBill = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BillFormData> }) => {
      if (!activeCompanyId) throw new Error("No active company");

      // Calculate totals if lines are provided
      let updates: any = {
        vendor_id: data.vendor_id,
        bill_number: data.bill_number,
        bill_date: data.bill_date,
        due_date: data.due_date,
        memo: data.memo,
      };

      if (data.lines) {
        const subtotal = data.lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
        updates.subtotal_amount = subtotal;
        updates.total_amount = subtotal;
        updates.balance_due = subtotal; // Will be recalculated based on payments
      }

      // Update bill
      const { data: bill, error: billError } = await supabase
        .from("bills")
        .update(updates)
        .eq("id", id)
        .eq("company_id", activeCompanyId)
        .select()
        .single();

      if (billError) throw billError;

      // Update lines if provided
      if (data.lines) {
        // Delete existing lines
        await supabase.from("bill_lines").delete().eq("bill_id", id);

        // Insert new lines
        if (data.lines.length > 0) {
          const lineInserts = data.lines.map((line, index) => ({
            bill_id: id,
            description: line.description || null,
            quantity: line.quantity,
            unit_price: line.unit_price,
            amount: line.quantity * line.unit_price,
            account_id: line.account_id || null,
            line_order: index + 1,
          }));

          const { error: linesError } = await supabase.from("bill_lines").insert(lineInserts);
          if (linesError) throw linesError;
        }
      }

      return bill as Bill;
    },
    onSuccess: (bill) => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["bill", bill.id] });
      log("bill.updated", "bill", bill.id, { bill_number: bill.bill_number });
      toast.success("Bill updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update bill: ${error.message}`);
    },
  });

  const updateBillStatus = useMutation({
    mutationFn: async ({ id, status, paymentInfo }: { 
      id: string; 
      status: BillStatus;
      paymentInfo?: { method?: string; reference?: string };
    }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const updates: any = { status };

      if (status === "paid") {
        // Fetch current bill to get total
        const { data: currentBill } = await supabase
          .from("bills")
          .select("total_amount")
          .eq("id", id)
          .single();

        if (currentBill) {
          updates.amount_paid = currentBill.total_amount;
          updates.balance_due = 0;
          updates.payment_date = new Date().toISOString().split("T")[0];
          updates.payment_method = paymentInfo?.method || null;
          updates.payment_reference = paymentInfo?.reference || null;
        }
      }

      const { data: bill, error } = await supabase
        .from("bills")
        .update(updates)
        .eq("id", id)
        .eq("company_id", activeCompanyId)
        .select()
        .single();

      if (error) throw error;
      return bill as Bill;
    },
    onSuccess: (bill) => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["bill", bill.id] });
      log("bill.status_changed", "bill", bill.id, { 
        bill_number: bill.bill_number, 
        new_status: bill.status 
      });
      toast.success(`Bill marked as ${bill.status}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update bill status: ${error.message}`);
    },
  });

  const deleteBill = useMutation({
    mutationFn: async (id: string) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { error } = await supabase
        .from("bills")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id)
        .eq("company_id", activeCompanyId);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      log("bill.deleted", "bill", id, {});
      toast.success("Bill archived");
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive bill: ${error.message}`);
    },
  });

  return { createBill, updateBill, updateBillStatus, deleteBill };
}
