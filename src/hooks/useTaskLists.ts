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
        companyLists = data as TaskList[];
      }

      return [...(personalLists as TaskList[]), ...companyLists];
    },
    enabled: !!user,
  });

  // Split lists into personal and company
  const personalLists = taskLists.filter(l => l.is_personal);
  const companyLists = taskLists.filter(l => !l.is_personal);

  const createList = useMutation({
    mutationFn: async (values: { name: string; color?: string | null; isPersonal?: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      
      const isPersonal = values.isPersonal ?? false;
      
      if (!isPersonal && !activeCompanyId) {
        throw new Error("No active company for company list");
      }

      const relevantLists = isPersonal ? personalLists : companyLists;
      const maxOrder = relevantLists.length > 0 
        ? Math.max(...relevantLists.map(l => l.sort_order)) + 1 
        : 0;

      const { error } = await supabase.from("task_lists").insert({
        name: values.name,
        color: values.color || null,
        sort_order: maxOrder,
        created_by: user.id,
        is_personal: isPersonal,
        owner_user_id: isPersonal ? user.id : null,
        company_id: isPersonal ? null : activeCompanyId,
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
    mutationFn: async ({ id, ...values }: { id: string; name?: string; color?: string | null; status?: string; sort_order?: number }) => {
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
    isLoading,
    isCompanyAdmin,
    canManageList,
    createList,
    updateList,
    deleteList,
    archiveList,
  };
}
