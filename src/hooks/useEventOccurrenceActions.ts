import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog, AuditAction } from "./useAuditLog";
import { toast } from "sonner";

// Event occurrence actions hook
export function useEventOccurrenceActions() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { log: logAudit } = useAuditLog();

  const invalidateEventQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["events"] });
    queryClient.invalidateQueries({ queryKey: ["event"] });
    queryClient.invalidateQueries({ queryKey: ["recurring-events"] });
    queryClient.invalidateQueries({ queryKey: ["event-occurrences"] });
    queryClient.invalidateQueries({ queryKey: ["all-event-occurrences"] });
    queryClient.invalidateQueries({ queryKey: ["override-events"] });
  };

  // Skip/delete an occurrence
  const skipOccurrence = useMutation({
    mutationFn: async ({ 
      seriesEventId, 
      occurrenceDate 
    }: { 
      seriesEventId: string; 
      occurrenceDate: Date;
    }) => {
      const dateStr = occurrenceDate.toISOString().split("T")[0];
      const { data, error } = await supabase.rpc("skip_event_occurrence", {
        p_event_id: seriesEventId,
        p_occurrence_date: dateStr,
      });

      if (error) throw error;
      return { data, seriesEventId, occurrenceDate };
    },
    onSuccess: ({ seriesEventId }) => {
      invalidateEventQueries();
      
      if (activeCompanyId) {
        logAudit("event.occurrence_skipped", "event", seriesEventId, {});
      }
      
      toast.success("Occurrence deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete occurrence");
    },
  });

  // Create an override for a single occurrence
  const createOverride = useMutation({
    mutationFn: async ({ 
      seriesEventId, 
      occurrenceStartAt,
      payload,
    }: { 
      seriesEventId: string; 
      occurrenceStartAt: Date;
      payload: {
        title: string;
        description?: string;
        start_at?: string;
        end_at?: string;
        all_day?: boolean;
        location_text?: string;
        color?: string;
      };
    }) => {
      const { data, error } = await supabase.rpc("create_event_occurrence_override", {
        p_series_event_id: seriesEventId,
        p_occurrence_start_at: occurrenceStartAt.toISOString(),
        p_title: payload.title,
        p_description: payload.description || null,
        p_start_at: payload.start_at || null,
        p_end_at: payload.end_at || null,
        p_all_day: payload.all_day ?? null,
        p_location_text: payload.location_text || null,
        p_color: payload.color || null,
      });

      if (error) throw error;
      return { overrideEventId: data, seriesEventId, occurrenceStartAt };
    },
    onSuccess: ({ seriesEventId }) => {
      invalidateEventQueries();
      
      if (activeCompanyId) {
        logAudit("event.occurrence_overridden", "event", seriesEventId, {});
      }
      
      toast.success("Event updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update occurrence");
    },
  });

  // Split series - edit this and future occurrences
  const splitSeries = useMutation({
    mutationFn: async ({ 
      seriesEventId, 
      occurrenceStartAt,
      newRrule,
      payload,
    }: { 
      seriesEventId: string; 
      occurrenceStartAt: Date;
      newRrule: string;
      payload?: {
        title?: string;
        description?: string;
        start_at?: string;
        end_at?: string;
        all_day?: boolean;
        location_text?: string;
        color?: string;
      };
    }) => {
      const { data, error } = await supabase.rpc("update_event_series_from_occurrence", {
        p_series_event_id: seriesEventId,
        p_occurrence_start_at: occurrenceStartAt.toISOString(),
        p_new_rrule: newRrule,
        p_title: payload?.title || null,
        p_description: payload?.description || null,
        p_start_at: payload?.start_at || null,
        p_end_at: payload?.end_at || null,
        p_all_day: payload?.all_day ?? null,
        p_location_text: payload?.location_text || null,
        p_color: payload?.color || null,
      });

      if (error) throw error;
      return { result: data as { success: boolean; new_series_id: string; old_series_id: string }, seriesEventId };
    },
    onSuccess: ({ seriesEventId }) => {
      invalidateEventQueries();
      
      if (activeCompanyId) {
        logAudit("event.series_split", "event", seriesEventId, {});
      }
      
      toast.success("Series updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update series");
    },
  });

  return {
    skipOccurrence,
    createOverride,
    splitSeries,
  };
}
