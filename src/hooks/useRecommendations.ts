import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { toast } from "sonner";

// Types matching the coach_recommendations schema
export type RecommendationType =
  | "task"
  | "project"
  | "calendar_event"
  | "note_prompt"
  | "document_prompt"
  | "framework_change_suggestion";

export type RecommendationStatus = "proposed" | "accepted" | "rejected" | "expired";

export interface CoachRecommendation {
  id: string;
  engagement_id: string;
  recommended_by: string;
  target_company_id: string;
  recommendation_type: RecommendationType;
  title: string;
  description: string | null;
  payload: Record<string, unknown> | null;
  status: RecommendationStatus;
  rejection_reason: string | null;
  accepted_at: string | null;
  accepted_by: string | null;
  converted_entity_type: string | null;
  converted_entity_id: string | null;
  created_at: string;
  updated_at: string;
}

export type RecommendationFilter = {
  status?: RecommendationStatus | "all";
  type?: RecommendationType | "all";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useRecommendations(filter?: RecommendationFilter) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["recommendations", activeCompanyId, filter],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      let query = db
        .from("coach_recommendations")
        .select("*")
        .eq("target_company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (filter?.status && filter.status !== "all") {
        query = query.eq("status", filter.status);
      }
      if (filter?.type && filter.type !== "all") {
        query = query.eq("recommendation_type", filter.type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CoachRecommendation[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useRecommendationMutations() {
  const queryClient = useQueryClient();

  const acceptRecommendation = useMutation({
    mutationFn: async (id: string) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data, error } = await db
        .from("coach_recommendations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          accepted_by: userId,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CoachRecommendation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      toast.success("Recommendation accepted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to accept: ${error.message}`);
    },
  });

  const rejectRecommendation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data, error } = await db
        .from("coach_recommendations")
        .update({
          status: "rejected",
          rejection_reason: reason || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CoachRecommendation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      toast.success("Recommendation declined");
    },
    onError: (error: Error) => {
      toast.error(`Failed to decline: ${error.message}`);
    },
  });

  return { acceptRecommendation, rejectRecommendation };
}
