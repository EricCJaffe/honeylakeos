import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { toast } from "sonner";

export type CampaignType = "email" | "event" | "referral" | "content" | "other";

export interface SalesCampaign {
  id: string;
  company_id: string;
  name: string;
  type: CampaignType;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useSalesCampaigns() {
  const { activeCompany } = useMembership();

  return useQuery({
    queryKey: ["sales_campaigns", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data, error } = await supabase
        .from("sales_campaigns")
        .select("*")
        .eq("company_id", activeCompany.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SalesCampaign[];
    },
    enabled: !!activeCompany?.id,
  });
}

export function useSalesCampaign(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["sales_campaign", campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      const { data, error } = await supabase
        .from("sales_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      if (error) throw error;
      return data as SalesCampaign;
    },
    enabled: !!campaignId,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const { activeCompany } = useMembership();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      type: CampaignType;
      start_date?: string;
      end_date?: string;
      description?: string;
    }) => {
      if (!activeCompany?.id) throw new Error("No active company");

      const { data: campaign, error } = await supabase
        .from("sales_campaigns")
        .insert({
          company_id: activeCompany.id,
          name: data.name,
          type: data.type,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          description: data.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_campaigns"] });
      toast.success("Campaign created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      name?: string;
      type?: CampaignType;
      start_date?: string | null;
      end_date?: string | null;
      description?: string | null;
    }) => {
      const { error } = await supabase
        .from("sales_campaigns")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["sales_campaign"] });
      toast.success("Campaign updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useArchiveCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sales_campaigns")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_campaigns"] });
      toast.success("Campaign archived");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  email: "Email",
  event: "Event",
  referral: "Referral",
  content: "Content",
  other: "Other",
};
