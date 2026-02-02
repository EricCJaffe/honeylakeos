import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { toast } from "sonner";

export interface SalesPipeline {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesPipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  sort_order: number;
  probability_percent: number | null;
  is_closed_won: boolean;
  is_closed_lost: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useSalesPipelines() {
  const { activeCompany } = useMembership();

  return useQuery({
    queryKey: ["sales_pipelines", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data, error } = await supabase
        .from("sales_pipelines")
        .select("*")
        .eq("company_id", activeCompany.id)
        .is("archived_at", null)
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data || []) as SalesPipeline[];
    },
    enabled: !!activeCompany?.id,
  });
}

export function useSalesPipeline(pipelineId: string | undefined) {
  return useQuery({
    queryKey: ["sales_pipeline", pipelineId],
    queryFn: async () => {
      if (!pipelineId) return null;
      const { data, error } = await supabase
        .from("sales_pipelines")
        .select("*")
        .eq("id", pipelineId)
        .single();
      if (error) throw error;
      return data as SalesPipeline;
    },
    enabled: !!pipelineId,
  });
}

export function usePipelineStages(pipelineId: string | undefined) {
  return useQuery({
    queryKey: ["sales_pipeline_stages", pipelineId],
    queryFn: async () => {
      if (!pipelineId) return [];
      const { data, error } = await supabase
        .from("sales_pipeline_stages")
        .select("*")
        .eq("pipeline_id", pipelineId)
        .is("archived_at", null)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as SalesPipelineStage[];
    },
    enabled: !!pipelineId,
  });
}

export function useCreatePipeline() {
  const queryClient = useQueryClient();
  const { activeCompany } = useMembership();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; is_default?: boolean }) => {
      if (!activeCompany?.id) throw new Error("No active company");
      
      const { data: pipeline, error } = await supabase
        .from("sales_pipelines")
        .insert({
          company_id: activeCompany.id,
          name: data.name,
          description: data.description || null,
          is_default: data.is_default || false,
        })
        .select()
        .single();
      if (error) throw error;
      return pipeline;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_pipelines"] });
      toast.success("Pipeline created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; is_default?: boolean }) => {
      const { error } = await supabase
        .from("sales_pipelines")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["sales_pipeline"] });
      toast.success("Pipeline updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useArchivePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sales_pipelines")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_pipelines"] });
      toast.success("Pipeline archived");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCreatePipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      pipeline_id: string;
      name: string;
      sort_order?: number;
      probability_percent?: number;
      is_closed_won?: boolean;
      is_closed_lost?: boolean;
    }) => {
      const { data: stage, error } = await supabase
        .from("sales_pipeline_stages")
        .insert({
          pipeline_id: data.pipeline_id,
          name: data.name,
          sort_order: data.sort_order ?? 0,
          probability_percent: data.probability_percent ?? null,
          is_closed_won: data.is_closed_won ?? false,
          is_closed_lost: data.is_closed_lost ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      return stage;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sales_pipeline_stages", variables.pipeline_id] });
      toast.success("Stage created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, pipeline_id, ...data }: {
      id: string;
      pipeline_id: string;
      name?: string;
      sort_order?: number;
      probability_percent?: number | null;
      is_closed_won?: boolean;
      is_closed_lost?: boolean;
    }) => {
      const { error } = await supabase
        .from("sales_pipeline_stages")
        .update(data)
        .eq("id", id);
      if (error) throw error;
      return pipeline_id;
    },
    onSuccess: (pipelineId) => {
      queryClient.invalidateQueries({ queryKey: ["sales_pipeline_stages", pipelineId] });
      toast.success("Stage updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useArchivePipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, pipeline_id }: { id: string; pipeline_id: string }) => {
      const { error } = await supabase
        .from("sales_pipeline_stages")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return pipeline_id;
    },
    onSuccess: (pipelineId) => {
      queryClient.invalidateQueries({ queryKey: ["sales_pipeline_stages", pipelineId] });
      toast.success("Stage archived");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCreateDefaultPipeline() {
  const queryClient = useQueryClient();
  const { activeCompany } = useMembership();

  return useMutation({
    mutationFn: async () => {
      if (!activeCompany?.id) throw new Error("No active company");

      // Create default pipeline
      const { data: pipeline, error: pipelineError } = await supabase
        .from("sales_pipelines")
        .insert({
          company_id: activeCompany.id,
          name: "Sales Pipeline",
          description: "Default sales pipeline",
          is_default: true,
        })
        .select()
        .single();

      if (pipelineError) throw pipelineError;

      // Create default stages
      const defaultStages = [
        { name: "Lead", sort_order: 0, probability_percent: 10 },
        { name: "Qualified", sort_order: 1, probability_percent: 25 },
        { name: "Proposal", sort_order: 2, probability_percent: 50 },
        { name: "Negotiation", sort_order: 3, probability_percent: 75 },
        { name: "Closed Won", sort_order: 4, probability_percent: 100, is_closed_won: true },
        { name: "Closed Lost", sort_order: 5, probability_percent: 0, is_closed_lost: true },
      ];

      const { error: stagesError } = await supabase
        .from("sales_pipeline_stages")
        .insert(
          defaultStages.map((stage) => ({
            pipeline_id: pipeline.id,
            ...stage,
          }))
        );

      if (stagesError) throw stagesError;
      return pipeline;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_pipelines"] });
      toast.success("Default pipeline created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
