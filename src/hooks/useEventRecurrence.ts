import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useCompanyModules } from "./useCompanyModules";
import { RECURRENCE_LIMITS, getCalendarExpansionRange } from "@/lib/readModels";

export interface EventOccurrence {
  occurrence_date: string;
  is_exception: boolean;
  override_event_id: string | null;
  is_override: boolean;
}

/**
 * Expand event occurrences with module safety and default limits.
 */
export function useEventOccurrences(
  eventId: string | undefined,
  rangeStart?: Date,
  rangeEnd?: Date,
  enabled: boolean = true
) {
  const { isEntityModuleEnabled, loading: modulesLoading } = useCompanyModules();
  const isModuleEnabled = isEntityModuleEnabled("event");
  
  // Use default calendar range if not provided
  const defaultRange = getCalendarExpansionRange(new Date(), RECURRENCE_LIMITS.CALENDAR_DAYS);
  const start = rangeStart ?? defaultRange.start;
  const end = rangeEnd ?? defaultRange.end;

  return useQuery({
    queryKey: ["event-occurrences", eventId, start.toISOString(), end.toISOString()],
    queryFn: async (): Promise<EventOccurrence[]> => {
      if (!eventId) return [];

      const { data, error } = await supabase.rpc("expand_event_series", {
        p_event_id: eventId,
        p_range_start: start.toISOString(),
        p_range_end: end.toISOString(),
      });

      if (error) throw error;
      return (data || []) as EventOccurrence[];
    },
    enabled: enabled && !!eventId && isModuleEnabled && !modulesLoading,
  });
}

export function useRecurringEvents(rangeStart: Date, rangeEnd: Date) {
  const { activeCompanyId } = useActiveCompany();

  // Get all recurring template events
  const { data: recurringEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["recurring-events", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("events")
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

  // Get occurrences for all recurring events
  const { data: allOccurrences = [], isLoading: loadingOccurrences } = useQuery({
    queryKey: ["all-event-occurrences", activeCompanyId, rangeStart.toISOString(), rangeEnd.toISOString(), recurringEvents.length],
    queryFn: async () => {
      if (!activeCompanyId || recurringEvents.length === 0) return [];

      // Fetch occurrences for each recurring event
      const occurrencesPromises = recurringEvents.map(async (event) => {
        const { data, error } = await supabase.rpc("expand_event_series", {
          p_event_id: event.id,
          p_range_start: rangeStart.toISOString(),
          p_range_end: rangeEnd.toISOString(),
        });

        if (error) {
          console.error("Error expanding event series:", error);
          return [];
        }

        return ((data || []) as EventOccurrence[])
          .filter(occ => !occ.is_exception)
          .map((occ) => ({
            ...occ,
            event,
          }));
      });

      const results = await Promise.all(occurrencesPromises);
      return results.flat();
    },
    enabled: !!activeCompanyId && recurringEvents.length > 0,
  });

  return {
    recurringEvents,
    occurrences: allOccurrences,
    isLoading: loadingEvents || loadingOccurrences,
  };
}

// Get override events (expanded from a series)
export function useOverrideEvents(rangeStart: Date, rangeEnd: Date) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["override-events", activeCompanyId, rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          project:projects(id, name, emoji)
        `)
        .eq("company_id", activeCompanyId)
        .eq("is_recurrence_exception", true)
        .gte("recurrence_instance_at", rangeStart.toISOString())
        .lte("recurrence_instance_at", rangeEnd.toISOString())
        .order("recurrence_instance_at");

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompanyId,
  });
}
