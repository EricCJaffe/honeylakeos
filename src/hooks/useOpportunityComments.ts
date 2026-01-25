import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export interface OpportunityComment {
  id: string;
  opportunity_id: string;
  author_user_id: string;
  body_rich_text: string;
  company_id: string;
  created_at: string;
  author?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useOpportunityComments(opportunityId: string | undefined) {
  const { activeCompany } = useMembership();

  return useQuery({
    queryKey: ["opportunity-comments", opportunityId],
    queryFn: async () => {
      if (!opportunityId || !activeCompany?.id) return [];

      // First fetch comments
      const { data: comments, error } = await supabase
        .from("sales_opportunity_comments")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .eq("company_id", activeCompany.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Then fetch author profiles
      const authorIds = [...new Set(comments.map(c => c.author_user_id))];
      let profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", authorIds);

        profileMap = new Map(profiles?.map(p => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }]) || []);
      }

      return comments.map(comment => ({
        ...comment,
        author: profileMap.get(comment.author_user_id) || null,
      })) as OpportunityComment[];
    },
    enabled: !!opportunityId && !!activeCompany?.id,
  });
}

export function useCreateOpportunityComment() {
  const queryClient = useQueryClient();
  const { activeCompany } = useMembership();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ opportunityId, bodyRichText }: { opportunityId: string; bodyRichText: string }) => {
      if (!activeCompany?.id || !user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("sales_opportunity_comments")
        .insert({
          opportunity_id: opportunityId,
          author_user_id: user.id,
          body_rich_text: bodyRichText,
          company_id: activeCompany.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["opportunity-comments", variables.opportunityId] });
      toast.success("Comment added");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add comment");
    },
  });
}
