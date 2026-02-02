import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { toast } from "sonner";
import { SalesPipelineStage } from "./useSalesPipelines";

export type OpportunityStatus = "open" | "won" | "lost";

export interface SalesOpportunity {
  id: string;
  company_id: string;
  pipeline_id: string;
  stage_id: string;
  name: string;
  description_rich_text: string | null;
  crm_client_id: string | null;
  owner_user_id: string | null;
  value_amount: number | null;
  expected_close_date: string | null;
  source_campaign_id: string | null;
  status: OpportunityStatus;
  lost_reason: string | null;
  closed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  stage?: SalesPipelineStage;
  crm_client?: {
    id: string;
    person_full_name: string | null;
    org_name: string | null;
    entity_kind: string;
    type: string;
  } | null;
}

export interface OpportunityStageHistory {
  id: string;
  opportunity_id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  changed_by: string | null;
  changed_at: string;
  from_stage?: SalesPipelineStage | null;
  to_stage?: SalesPipelineStage | null;
}

export function useSalesOpportunities(pipelineId?: string) {
  const { activeCompany } = useMembership();

  return useQuery({
    queryKey: ["sales_opportunities", activeCompany?.id, pipelineId],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      
      let query = supabase
        .from("sales_opportunities")
        .select(`
          *,
          stage:sales_pipeline_stages(*),
          crm_client:crm_clients(id, person_full_name, org_name, entity_kind, type)
        `)
        .eq("company_id", activeCompany.id)
        .order("updated_at", { ascending: false });

      if (pipelineId) {
        query = query.eq("pipeline_id", pipelineId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SalesOpportunity[];
    },
    enabled: !!activeCompany?.id,
  });
}

export function useSalesOpportunity(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ["sales_opportunity", opportunityId],
    queryFn: async () => {
      if (!opportunityId) return null;
      const { data, error } = await supabase
        .from("sales_opportunities")
        .select(`
          *,
          stage:sales_pipeline_stages(*),
          crm_client:crm_clients(id, person_full_name, org_name, entity_kind, type)
        `)
        .eq("id", opportunityId)
        .single();
      if (error) throw error;
      return data as SalesOpportunity;
    },
    enabled: !!opportunityId,
  });
}

export function useOpportunityStageHistory(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ["sales_opportunity_stage_history", opportunityId],
    queryFn: async () => {
      if (!opportunityId) return [];
      const { data, error } = await supabase
        .from("sales_opportunity_stage_history")
        .select(`
          *,
          from_stage:sales_pipeline_stages!sales_opportunity_stage_history_from_stage_id_fkey(*),
          to_stage:sales_pipeline_stages!sales_opportunity_stage_history_to_stage_id_fkey(*)
        `)
        .eq("opportunity_id", opportunityId)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return (data || []) as OpportunityStageHistory[];
    },
    enabled: !!opportunityId,
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  const { activeCompany } = useMembership();

  return useMutation({
    mutationFn: async (data: {
      pipeline_id: string;
      stage_id: string;
      name: string;
      description_rich_text?: string;
      crm_client_id?: string;
      owner_user_id?: string;
      value_amount?: number;
      expected_close_date?: string;
      source_campaign_id?: string;
    }) => {
      if (!activeCompany?.id) throw new Error("No active company");

      const { data: opportunity, error } = await supabase
        .from("sales_opportunities")
        .insert({
          company_id: activeCompany.id,
          pipeline_id: data.pipeline_id,
          stage_id: data.stage_id,
          name: data.name,
          description_rich_text: data.description_rich_text || null,
          crm_client_id: data.crm_client_id || null,
          owner_user_id: data.owner_user_id || null,
          value_amount: data.value_amount || null,
          expected_close_date: data.expected_close_date || null,
          source_campaign_id: data.source_campaign_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return opportunity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_opportunities"] });
      toast.success("Opportunity created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      stage_id?: string;
      name?: string;
      description_rich_text?: string | null;
      crm_client_id?: string | null;
      owner_user_id?: string | null;
      value_amount?: number | null;
      expected_close_date?: string | null;
      source_campaign_id?: string | null;
      lost_reason?: string | null;
    }) => {
      const { error } = await supabase
        .from("sales_opportunities")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["sales_opportunity"] });
      queryClient.invalidateQueries({ queryKey: ["sales_opportunity_stage_history"] });
      toast.success("Opportunity updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useMoveOpportunityStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, stageId }: { opportunityId: string; stageId: string }) => {
      const { error } = await supabase
        .from("sales_opportunities")
        .update({ stage_id: stageId })
        .eq("id", opportunityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["sales_opportunity"] });
      queryClient.invalidateQueries({ queryKey: ["sales_opportunity_stage_history"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useOpportunitiesByStage(pipelineId: string | undefined) {
  const { data: opportunities = [], ...rest } = useSalesOpportunities(pipelineId);

  const byStage = opportunities.reduce((acc, opp) => {
    const stageId = opp.stage_id;
    if (!acc[stageId]) acc[stageId] = [];
    acc[stageId].push(opp);
    return acc;
  }, {} as Record<string, SalesOpportunity[]>);

  return { byStage, opportunities, ...rest };
}
