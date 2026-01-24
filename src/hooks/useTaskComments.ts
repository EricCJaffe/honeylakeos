import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { useAuditLog } from "@/hooks/useAuditLog";
import { toast } from "sonner";

export interface TaskComment {
  id: string;
  task_id: string;
  company_id: string;
  author_user_id: string;
  body_rte: string;
  created_at: string;
}

export function useTaskComments(taskId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: async () => {
      if (!taskId || !activeCompanyId) return [];
      
      const { data, error } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", taskId)
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as TaskComment[];
    },
    enabled: !!taskId && !!activeCompanyId,
  });
}

export function useTaskCommentMutations(taskId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  const createComment = useMutation({
    mutationFn: async (body: string) => {
      if (!taskId || !activeCompanyId || !user) {
        throw new Error("Missing context");
      }

      const { data, error } = await supabase
        .from("task_comments")
        .insert({
          task_id: taskId,
          company_id: activeCompanyId,
          author_user_id: user.id,
          body_rte: body,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
      
      // Audit log
      log("task.occurrence_completed", "task", data.id, { task_id: taskId, action: "comment_created" });
      
      toast.success("Comment added");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add comment");
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("task_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
      return commentId;
    },
    onSuccess: (commentId) => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
      
      // Audit log
      log("task.occurrence_uncompleted", "task", commentId, { task_id: taskId, action: "comment_deleted" });
      
      toast.success("Comment deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete comment");
    },
  });

  return {
    createComment,
    deleteComment,
  };
}
