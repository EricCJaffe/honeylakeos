import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export interface TaskList {
  id: string;
  company_id: string;
  name: string;
  color: string | null;
  status: string;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useTaskLists() {
  const { activeCompanyId, isCompanyAdmin } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: taskLists = [], isLoading } = useQuery({
    queryKey: ["task-lists", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("task_lists")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("status", "active")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as TaskList[];
    },
    enabled: !!activeCompanyId,
  });

  const createList = useMutation({
    mutationFn: async (values: { name: string; color?: string | null }) => {
      if (!activeCompanyId || !user) throw new Error("Missing context");
      const maxOrder = taskLists.length > 0 
        ? Math.max(...taskLists.map(l => l.sort_order)) + 1 
        : 0;
      const { error } = await supabase.from("task_lists").insert({
        company_id: activeCompanyId,
        name: values.name,
        color: values.color || null,
        sort_order: maxOrder,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-lists"] });
      toast.success("List created");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create list");
    },
  });

  const updateList = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; name?: string; color?: string | null; status?: string }) => {
      const { error } = await supabase
        .from("task_lists")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-lists"] });
      toast.success("List updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update list");
    },
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      // First, unset list_id on any tasks using this list
      const { error: unlinkError } = await supabase
        .from("tasks")
        .update({ list_id: null })
        .eq("list_id", id);
      if (unlinkError) throw unlinkError;

      // Then delete the list
      const { error } = await supabase
        .from("task_lists")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-lists"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("List deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete list");
    },
  });

  const archiveList = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("task_lists")
        .update({ status: "archived" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-lists"] });
      toast.success("List archived");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to archive list");
    },
  });

  return {
    taskLists,
    isLoading,
    isCompanyAdmin,
    createList,
    updateList,
    deleteList,
    archiveList,
  };
}
