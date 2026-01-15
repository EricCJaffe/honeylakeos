import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { toast } from "sonner";

export interface TaskOccurrenceCompletion {
  id: string;
  company_id: string;
  series_task_id: string;
  occurrence_start_at: string;
  completed_at: string;
  completed_by: string;
}

export interface ExpandedTaskOccurrence {
  occurrence_date: string;
  occurrence_start_at: string;
  is_exception: boolean;
  is_override: boolean;
  is_completed: boolean;
  override_task_id: string | null;
  completed_at: string | null;
  completed_by: string | null;
}

// Fetch completions for a series task
export function useTaskOccurrenceCompletions(seriesTaskId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["task-occurrence-completions", seriesTaskId],
    queryFn: async (): Promise<TaskOccurrenceCompletion[]> => {
      if (!seriesTaskId || !activeCompanyId) return [];

      const { data, error } = await supabase
        .from("task_occurrence_completions")
        .select("*")
        .eq("series_task_id", seriesTaskId)
        .eq("company_id", activeCompanyId)
        .order("occurrence_start_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as TaskOccurrenceCompletion[];
    },
    enabled: !!seriesTaskId && !!activeCompanyId,
  });
}

// Expanded occurrences with completion status
export function useExpandedTaskOccurrences(
  taskId: string | undefined,
  rangeStart: Date,
  rangeEnd: Date,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["expanded-task-occurrences", taskId, rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: async (): Promise<ExpandedTaskOccurrence[]> => {
      if (!taskId) return [];

      const { data, error } = await supabase.rpc("expand_task_series", {
        p_task_id: taskId,
        p_range_start: rangeStart.toISOString(),
        p_range_end: rangeEnd.toISOString(),
      });

      if (error) throw error;
      return (data || []) as ExpandedTaskOccurrence[];
    },
    enabled: enabled && !!taskId,
  });
}

// Complete/uncomplete an occurrence
export function useTaskOccurrenceActions() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { log: logAudit } = useAuditLog();

  const completeOccurrence = useMutation({
    mutationFn: async ({ 
      seriesTaskId, 
      occurrenceStartAt 
    }: { 
      seriesTaskId: string; 
      occurrenceStartAt: Date;
    }) => {
      const { data, error } = await supabase.rpc("complete_task_occurrence", {
        p_series_task_id: seriesTaskId,
        p_occurrence_start_at: occurrenceStartAt.toISOString(),
      });

      if (error) throw error;
      return { data, seriesTaskId, occurrenceStartAt };
    },
    onSuccess: ({ seriesTaskId }) => {
      queryClient.invalidateQueries({ queryKey: ["task-occurrence-completions"] });
      queryClient.invalidateQueries({ queryKey: ["expanded-task-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["task-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["all-task-occurrences"] });
      
      if (activeCompanyId) {
        logAudit("task.occurrence_completed", "task", seriesTaskId, {});
      }
      
      toast.success("Occurrence completed");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to complete occurrence");
    },
  });

  const uncompleteOccurrence = useMutation({
    mutationFn: async ({ 
      seriesTaskId, 
      occurrenceStartAt 
    }: { 
      seriesTaskId: string; 
      occurrenceStartAt: Date;
    }) => {
      const { data, error } = await supabase.rpc("uncomplete_task_occurrence", {
        p_series_task_id: seriesTaskId,
        p_occurrence_start_at: occurrenceStartAt.toISOString(),
      });

      if (error) throw error;
      return { data, seriesTaskId, occurrenceStartAt };
    },
    onSuccess: ({ seriesTaskId }) => {
      queryClient.invalidateQueries({ queryKey: ["task-occurrence-completions"] });
      queryClient.invalidateQueries({ queryKey: ["expanded-task-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["task-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["all-task-occurrences"] });
      
      if (activeCompanyId) {
        logAudit("task.occurrence_uncompleted", "task", seriesTaskId, {});
      }
      
      toast.success("Occurrence marked incomplete");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to uncomplete occurrence");
    },
  });

  const skipOccurrence = useMutation({
    mutationFn: async ({ 
      seriesTaskId, 
      occurrenceDate 
    }: { 
      seriesTaskId: string; 
      occurrenceDate: Date;
    }) => {
      const dateStr = occurrenceDate.toISOString().split("T")[0];
      const { data, error } = await supabase.rpc("skip_task_occurrence", {
        p_task_id: seriesTaskId,
        p_occurrence_date: dateStr,
      });

      if (error) throw error;
      return { data, seriesTaskId, occurrenceDate };
    },
    onSuccess: ({ seriesTaskId }) => {
      queryClient.invalidateQueries({ queryKey: ["task-occurrence-completions"] });
      queryClient.invalidateQueries({ queryKey: ["expanded-task-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["task-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["all-task-occurrences"] });
      
      if (activeCompanyId) {
        logAudit("task.occurrence_skipped", "task", seriesTaskId, {});
      }
      
      toast.success("Occurrence skipped");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to skip occurrence");
    },
  });

  const createOverride = useMutation({
    mutationFn: async ({ 
      seriesTaskId, 
      occurrenceStartAt,
      payload,
    }: { 
      seriesTaskId: string; 
      occurrenceStartAt: Date;
      payload: {
        title: string;
        description?: string;
        due_date?: string;
        priority?: string;
        status?: string;
      };
    }) => {
      const { data, error } = await supabase.rpc("create_task_occurrence_override", {
        p_series_task_id: seriesTaskId,
        p_occurrence_start_at: occurrenceStartAt.toISOString(),
        p_title: payload.title,
        p_description: payload.description || null,
        p_due_date: payload.due_date || null,
        p_priority: payload.priority || null,
        p_status: payload.status || null,
      });

      if (error) throw error;
      return { overrideTaskId: data, seriesTaskId, occurrenceStartAt };
    },
    onSuccess: ({ seriesTaskId }) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["expanded-task-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["all-task-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["override-tasks"] });
      
      if (activeCompanyId) {
        logAudit("task.occurrence_overridden_created", "task", seriesTaskId, {});
      }
      
      toast.success("Occurrence edited");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to edit occurrence");
    },
  });

  return {
    completeOccurrence,
    uncompleteOccurrence,
    skipOccurrence,
    createOverride,
  };
}
