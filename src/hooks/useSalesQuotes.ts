import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { toast } from "sonner";

export type SalesQuoteStatus = "draft" | "sent" | "signed" | "won" | "lost";
export type SalesQuoteType = "psa" | "sow" | "combined";

export interface SalesQuote {
  id: string;
  company_id: string;
  crm_client_id: string;
  opportunity_id: string | null;
  title: string;
  quote_type: SalesQuoteType;
  status: SalesQuoteStatus;
  summary: string | null;
  internal_notes: string | null;
  signed_at: string | null;
  won_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  created_by: string | null;
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

export function useSalesQuotes(params?: { opportunityId?: string; crmClientId?: string }) {
  const { activeCompany } = useMembership();

  return useQuery({
    queryKey: ["sales_quotes", activeCompany?.id, params?.opportunityId, params?.crmClientId],
    queryFn: async () => {
      if (!activeCompany?.id) return [];

      let q = supabase
        .from("sales_quotes")
        .select(`
          *,
          crm_client:crm_clients(id, person_full_name, org_name, entity_kind, type)
        `)
        .eq("company_id", activeCompany.id)
        .order("updated_at", { ascending: false });

      if (params?.opportunityId) q = q.eq("opportunity_id", params.opportunityId);
      if (params?.crmClientId) q = q.eq("crm_client_id", params.crmClientId);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SalesQuote[];
    },
    enabled: !!activeCompany?.id,
  });
}

export function useSalesQuote(quoteId: string | undefined) {
  return useQuery({
    queryKey: ["sales_quote", quoteId],
    queryFn: async () => {
      if (!quoteId) return null;
      const { data, error } = await supabase
        .from("sales_quotes")
        .select(`
          *,
          crm_client:crm_clients(id, person_full_name, org_name, entity_kind, type)
        `)
        .eq("id", quoteId)
        .single();
      if (error) throw error;
      return data as SalesQuote;
    },
    enabled: !!quoteId,
  });
}

export function useCreateSalesQuote() {
  const qc = useQueryClient();
  const { activeCompany } = useMembership();

  return useMutation({
    mutationFn: async (input: {
      crm_client_id: string;
      opportunity_id?: string | null;
      title: string;
      quote_type: SalesQuoteType;
      summary?: string | null;
    }) => {
      if (!activeCompany?.id) throw new Error("No active company");

      const { data, error } = await supabase
        .from("sales_quotes")
        .insert({
          company_id: activeCompany.id,
          crm_client_id: input.crm_client_id,
          opportunity_id: input.opportunity_id || null,
          title: input.title,
          quote_type: input.quote_type,
          summary: input.summary || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SalesQuote;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales_quotes"] });
      toast.success("Quote created");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to create quote"),
  });
}

export function useUpdateSalesQuote() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<SalesQuote> & { id: string }) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from("sales_quotes").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales_quotes"] });
      qc.invalidateQueries({ queryKey: ["sales_quote"] });
      toast.success("Quote updated");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update quote"),
  });
}

export function useConvertQuoteToSalesOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { quoteId: string }) => {
      // Fetch quote
      const { data: quote, error: qErr } = await supabase
        .from("sales_quotes")
        .select("id, company_id, crm_client_id, opportunity_id")
        .eq("id", input.quoteId)
        .single();
      if (qErr) throw qErr;

      const { data: order, error: oErr } = await supabase
        .from("sales_orders")
        .insert({
          company_id: quote.company_id,
          crm_client_id: quote.crm_client_id,
          opportunity_id: quote.opportunity_id,
          quote_id: quote.id,
          status: "open",
        })
        .select()
        .single();
      if (oErr) throw oErr;
      return order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales_quotes"] });
      qc.invalidateQueries({ queryKey: ["sales_quote"] });
      toast.success("Sales order created");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to create sales order"),
  });
}
