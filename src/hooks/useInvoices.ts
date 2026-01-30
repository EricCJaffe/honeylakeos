import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { toast } from "sonner";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void" | "partial";

export interface Invoice {
  id: string;
  company_id: string;
  crm_client_id: string | null;
  sales_order_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  balance_due: number;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;

  crm_client?: {
    id: string;
    person_full_name: string | null;
    org_name: string | null;
    entity_kind: string;
    type: string;
  } | null;
}

function makeInvoiceNumber() {
  // Simple unique-ish invoice number. Replace later with a proper sequence.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${y}${m}${day}-${rand}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function useInvoices() {
  const { activeCompany } = useMembership();

  return useQuery({
    queryKey: ["invoices", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];

      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          crm_client:crm_clients(id, person_full_name, org_name, entity_kind, type)
        `)
        .eq("company_id", activeCompany.id)
        .order("issue_date", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as unknown as Invoice[];
    },
    enabled: !!activeCompany?.id,
  });
}

export function useInvoice(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          crm_client:crm_clients(id, person_full_name, org_name, entity_kind, type)
        `)
        .eq("id", invoiceId)
        .single();
      if (error) throw error;
      return data as unknown as Invoice;
    },
    enabled: !!invoiceId,
  });
}

export function useCreateDraftInvoiceFromQuote() {
  const qc = useQueryClient();
  const { activeCompany } = useMembership();

  return useMutation({
    mutationFn: async (input: { quoteId: string; termsDays?: number }) => {
      if (!activeCompany?.id) throw new Error("No active company");

      // Fetch quote
      const { data: quote, error: qErr } = await supabase
        .from("sales_quotes")
        .select("id, company_id, crm_client_id")
        .eq("id", input.quoteId)
        .single();
      if (qErr) throw qErr;

      // Find or create sales order
      const { data: existingOrder, error: soErr } = await supabase
        .from("sales_orders")
        .select("id, company_id, crm_client_id")
        .eq("company_id", quote.company_id)
        .eq("quote_id", quote.id)
        .maybeSingle();
      if (soErr) throw soErr;

      let salesOrderId = existingOrder?.id;
      if (!salesOrderId) {
        const { data: order, error: createErr } = await supabase
          .from("sales_orders")
          .insert({
            company_id: quote.company_id,
            crm_client_id: quote.crm_client_id,
            quote_id: quote.id,
            status: "open",
          })
          .select("id")
          .single();
        if (createErr) throw createErr;
        salesOrderId = order.id;
      }

      // Check for existing invoice for this sales order
      const { data: existingInvoice, error: invErr } = await supabase
        .from("invoices")
        .select("id, invoice_number")
        .eq("company_id", quote.company_id)
        .eq("sales_order_id", salesOrderId)
        .maybeSingle();
      if (invErr) throw invErr;
      if (existingInvoice) return { invoiceId: existingInvoice.id, invoiceNumber: existingInvoice.invoice_number, existed: true };

      const now = new Date();
      const due = addDays(now, input.termsDays ?? 30);

      const invoice_number = makeInvoiceNumber();

      const { data: createdInvoice, error: createInvErr } = await supabase
        .from("invoices")
        .insert({
          company_id: quote.company_id,
          crm_client_id: quote.crm_client_id,
          sales_order_id: salesOrderId,
          invoice_number,
          status: "draft",
          issue_date: now.toISOString().slice(0, 10),
          due_date: due.toISOString().slice(0, 10),
          subtotal_amount: 0,
          tax_amount: 0,
          total_amount: 0,
          balance_due: 0,
          currency: "USD",
        })
        .select("id, invoice_number")
        .single();

      if (createInvErr) throw createInvErr;

      return { invoiceId: createdInvoice.id, invoiceNumber: createdInvoice.invoice_number, existed: false };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(res.existed ? `Invoice already exists: ${res.invoiceNumber}` : `Draft invoice created: ${res.invoiceNumber}`);
    },
    onError: (e: any) => toast.error(e?.message || "Failed to create invoice"),
  });
}
