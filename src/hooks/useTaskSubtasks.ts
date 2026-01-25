import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export interface TaskSubtask {
  id: string;
  company_id: string;
  parent_task_id: string;
  title: string;
  description_rich_text: string | null;
  status: "open" | "done";
  due_date: string | null;
  sort_order: number;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubtaskCounts {
  total_count: number;
  completed_count: number;
}

export function useTaskSubtasks(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task-subtasks", taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from("task_subtasks")
        .select("*")
        .eq("parent_task_id", taskId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as TaskSubtask[];
    },
    enabled: !!taskId,
  });
}

export function useTaskSubtaskCounts(taskIds: string[]) {
  return useQuery({
    queryKey: ["task-subtask-counts", taskIds],
    queryFn: async () => {
      if (taskIds.length === 0) return new Map<string, SubtaskCounts>();

      const { data, error } = await supabase.rpc("get_task_subtask_counts", {
        p_task_ids: taskIds,
      });

      if (error) throw error;

      const countsMap = new Map<string, SubtaskCounts>();
      (data || []).forEach((row: { task_id: string; total_count: number; completed_count: number }) => {
        countsMap.set(row.task_id, {
          total_count: row.total_count,
          completed_count: row.completed_count,
        });
      });
      return countsMap;
    },
    enabled: taskIds.length > 0,
  });
}

export function useCreateSubtask() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      parentTaskId,
      title,
      descriptionRichText,
      dueDate,
    }: {
      parentTaskId: string;
      title: string;
      descriptionRichText?: string;
      dueDate?: string;
    }) => {
      if (!activeCompanyId || !user) throw new Error("Not authenticated");

      // Get current max sort_order
      const { data: existing } = await supabase
        .from("task_subtasks")
        .select("sort_order")
        .eq("parent_task_id", parentTaskId)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

      const { data, error } = await supabase
        .from("task_subtasks")
        .insert({
          company_id: activeCompanyId,
          parent_task_id: parentTaskId,
          title,
          description_rich_text: descriptionRichText || null,
          due_date: dueDate || null,
          sort_order: nextOrder,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TaskSubtask;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-subtasks", variables.parentTaskId] });
      queryClient.invalidateQueries({ queryKey: ["task-subtask-counts"] });
      toast.success("Subtask added");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add subtask");
    },
  });
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      parentTaskId,
      ...updates
    }: {
      id: string;
      parentTaskId: string;
      title?: string;
      description_rich_text?: string | null;
      due_date?: string | null;
      sort_order?: number;
    }) => {
      const { error } = await supabase
        .from("task_subtasks")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-subtasks", variables.parentTaskId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update subtask");
    },
  });
}

export function useToggleSubtaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      parentTaskId,
      currentStatus,
    }: {
      id: string;
      parentTaskId: string;
      currentStatus: "open" | "done";
    }) => {
      const newStatus = currentStatus === "done" ? "open" : "done";
      const completedAt = newStatus === "done" ? new Date().toISOString() : null;

      const { error } = await supabase
        .from("task_subtasks")
        .update({
          status: newStatus,
          completed_at: completedAt,
        })
        .eq("id", id);

      if (error) throw error;
      return newStatus;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-subtasks", variables.parentTaskId] });
      queryClient.invalidateQueries({ queryKey: ["task-subtask-counts"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update subtask");
    },
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      parentTaskId,
    }: {
      id: string;
      parentTaskId: string;
    }) => {
      const { error } = await supabase
        .from("task_subtasks")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-subtasks", variables.parentTaskId] });
      queryClient.invalidateQueries({ queryKey: ["task-subtask-counts"] });
      toast.success("Subtask deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete subtask");
    },
  });
}

export function useReorderSubtasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parentTaskId,
      subtaskIds,
    }: {
      parentTaskId: string;
      subtaskIds: string[];
    }) => {
      // Update each subtask's sort_order based on new position
      const updates = subtaskIds.map((id, index) =>
        supabase
          .from("task_subtasks")
          .update({ sort_order: index })
          .eq("id", id)
      );

      await Promise.all(updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["task-subtasks", variables.parentTaskId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reorder subtasks");
    },
  });
}
