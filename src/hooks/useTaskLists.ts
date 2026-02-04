import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export interface TaskList {
  id: string;
  company_id: string | null;
  owner_user_id: string | null;
  is_personal: boolean;
  name: string;
  color: string | null;
  status: string;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskListWithCount extends TaskList {
  task_count: number;
}

export function useTaskLists() {
  const { activeCompanyId, isCompanyAdmin } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all visible lists (personal + company)
  const { data: taskLists = [], isLoading } = useQuery({
    queryKey: ["task-lists", activeCompanyId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Fetch personal lists (always visible to owner)
      const { data: personalLists, error: personalError } = await supabase
        .from("task_lists")
        .select("*")
        .eq("is_personal", true)
        .eq("owner_user_id", user.id)
        .eq("status", "active")
        .order("sort_order", { ascending: true });
      
      if (personalError) throw personalError;

      // Fetch company lists (if active company)
      let companyLists: TaskList[] = [];
      if (activeCompanyId) {
        const { data, error } = await supabase
          .from("task_lists")
          .select("*")
          .eq("is_personal", false)
          .eq("company_id", activeCompanyId)
          .eq("status", "active")
          .order("sort_order", { ascending: true });
        if (error) throw error;
        companyLists = (data || []) as TaskList[];
      }

      return [...((personalLists || []) as TaskList[]), ...companyLists];
    },
    enabled: !!user,
  });

  // Fetch task counts per list
  const { data: listCounts = {} } = useQuery({
    queryKey: ["task-list-counts", activeCompanyId, user?.id],
    queryFn: async () => {
      if (!user) return {};
      
      const { data, error } = await supabase.rpc("task_list_counts", {
        p_company_id: activeCompanyId || null,
      });
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      (data || []).forEach((row: { list_id: string; task_count: number }) => {
        counts[row.list_id] = row.task_count;
      });
      return counts;
    },
    enabled: !!user,
  });

  // Fetch unlisted task count
  const { data: unlistedCount = 0 } = useQuery({
    queryKey: ["unlisted-task-count", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return 0;
      
      const { data, error } = await supabase.rpc("unlisted_task_count", {
        p_company_id: activeCompanyId,
      });
      
      if (error) throw error;
      return data || 0;
    },
    enabled: !!activeCompanyId,
  });

  // Split lists into personal and company with counts
  // Ensure taskLists is always an array to prevent .filter and .map errors during refetch
  const safeTaskLists = Array.isArray(taskLists) ? taskLists : [];

  const personalLists: TaskListWithCount[] = safeTaskLists
    .filter(l => l.is_personal)
    .map(l => ({ ...l, task_count: listCounts[l.id] || 0 }));

  const companyLists: TaskListWithCount[] = safeTaskLists
    .filter(l => !l.is_personal)
    .map(l => ({ ...l, task_count: listCounts[l.id] || 0 }));

  const createList = useMutation({
    mutationFn: async (values: { name: string; color?: string | null; isPersonal?: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      
      const isPersonal = values.isPersonal ?? false;
      const scope = isPersonal ? "personal" : "company";
      
      if (!isPersonal && !activeCompanyId) {
        throw new Error("No active company for company list");
      }

      const { data, error } = await supabase.rpc("task_list_create", {
        p_name: values.name,
        p_scope: scope,
        p_company_id: isPersonal ? null : activeCompanyId,
        p_color: values.color || null,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-lists"] });
      queryClient.invalidateQueries({ queryKey: ["task-list-counts"] });
      toast.success("List created");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create list");
    },
  });

  const updateList = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name?: string; color?: string | null }) => {
      // Use RPC for rename if name is provided
      if (name !== undefined) {
        const { error } = await supabase.rpc("task_list_rename", {
          p_list_id: id,
          p_name: name,
        });
        if (error) throw error;
      }
      
      // Update color directly (RPC doesn't handle color)
      if (color !== undefined) {
        const { error } = await supabase
          .from("task_lists")
          .update({ color })
          .eq("id", id);
        if (error) throw error;
      }
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
      const { error } = await supabase.rpc("task_list_delete", {
        p_list_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-lists"] });
      queryClient.invalidateQueries({ queryKey: ["task-list-counts"] });
      queryClient.invalidateQueries({ queryKey: ["unlisted-task-count"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("List deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete list");
    },
  });

  const reorderList = useMutation({
    mutationFn: async ({ listId, newIndex }: { listId: string; newIndex: number }) => {
      const { error } = await supabase.rpc("task_list_reorder", {
        p_list_id: listId,
        p_new_index: newIndex,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-lists"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reorder list");
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

  // Check if user can manage a specific list
  const canManageList = (list: TaskList) => {
    if (list.is_personal) {
      return list.owner_user_id === user?.id;
    }
    return isCompanyAdmin;
  };

  return {
    taskLists,
    personalLists,
    companyLists,
    unlistedCount,
    isLoading,
    isCompanyAdmin,
    canManageList,
    createList,
    updateList,
    deleteList,
    reorderList,
    archiveList,
  };
}
