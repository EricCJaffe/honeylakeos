import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";

export interface TaskOccurrence {
  occurrence_date: string;
  is_exception: boolean;
  override_task_id: string | null;
  is_override: boolean;
}

export function useTaskOccurrences(
  taskId: string | undefined,
  rangeStart: Date,
  rangeEnd: Date,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["task-occurrences", taskId, rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: async (): Promise<TaskOccurrence[]> => {
      if (!taskId) return [];

      const { data, error } = await supabase.rpc("expand_task_series", {
        p_task_id: taskId,
        p_range_start: rangeStart.toISOString(),
        p_range_end: rangeEnd.toISOString(),
      });

      if (error) throw error;
      return (data || []) as TaskOccurrence[];
    },
    enabled: enabled && !!taskId,
  });
}

export function useRecurringTasks(rangeStart: Date, rangeEnd: Date) {
  const { activeCompanyId } = useActiveCompany();

  // Get all recurring template tasks
  const { data: recurringTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["recurring-tasks", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          project:projects(id, name, emoji)
        `)
        .eq("company_id", activeCompanyId)
        .eq("is_recurring_template", true)
        .order("title");

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompanyId,
  });

  // Get occurrences for each recurring task
  const { data: allOccurrences = [], isLoading: loadingOccurrences } = useQuery({
    queryKey: ["all-task-occurrences", activeCompanyId, rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: async () => {
      if (!activeCompanyId || recurringTasks.length === 0) return [];

      // Fetch occurrences for each recurring task
      const occurrencesPromises = recurringTasks.map(async (task) => {
        const { data, error } = await supabase.rpc("expand_task_series", {
          p_task_id: task.id,
          p_range_start: rangeStart.toISOString(),
          p_range_end: rangeEnd.toISOString(),
        });

        if (error) {
          console.error("Error expanding task series:", error);
          return [];
        }

        return ((data || []) as TaskOccurrence[]).map((occ) => ({
          ...occ,
          task,
        }));
      });

      const results = await Promise.all(occurrencesPromises);
      return results.flat();
    },
    enabled: !!activeCompanyId && recurringTasks.length > 0,
  });

  return {
    recurringTasks,
    occurrences: allOccurrences,
    isLoading: loadingTasks || loadingOccurrences,
  };
}

// Get override tasks (expanded from a series)
export function useOverrideTasks(rangeStart: Date, rangeEnd: Date) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["override-tasks", activeCompanyId, rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          project:projects(id, name, emoji)
        `)
        .eq("company_id", activeCompanyId)
        .eq("is_recurrence_exception", true)
        .gte("recurrence_instance_date", rangeStart.toISOString().split("T")[0])
        .lte("recurrence_instance_date", rangeEnd.toISOString().split("T")[0])
        .order("recurrence_instance_date");

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompanyId,
  });
}
