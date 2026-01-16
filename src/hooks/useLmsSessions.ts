import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { useCompanyModules } from "./useCompanyModules";
import { toast } from "sonner";

export interface LmsSession {
  id: string;
  company_id: string;
  course_id: string;
  cohort_id: string | null;
  title: string;
  description: string | null;
  start_at: string | null;
  end_at: string | null;
  all_day: boolean;
  location_text: string | null;
  meeting_url: string | null;
  linked_event_id: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lms_courses?: { id: string; title: string };
  lms_cohorts?: { id: string; name: string } | null;
}

export interface CreateSessionInput {
  course_id: string;
  cohort_id?: string;
  title: string;
  description?: string;
  start_at?: string;
  end_at?: string;
  all_day?: boolean;
  location_text?: string;
  meeting_url?: string;
  createCalendarEvent?: boolean;
}

export interface UpdateSessionInput {
  title?: string;
  description?: string;
  start_at?: string | null;
  end_at?: string | null;
  all_day?: boolean;
  location_text?: string | null;
  meeting_url?: string | null;
  sort_order?: number;
}

export interface SessionFilters {
  courseId?: string;
  cohortId?: string;
  search?: string;
}

export function useLmsSessions(filters: SessionFilters = {}) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  return useQuery({
    queryKey: ["lms-sessions", activeCompanyId, filters],
    queryFn: async () => {
      if (!activeCompanyId || !lmsEnabled) return [];

      let query = supabase
        .from("lms_sessions")
        .select("*, lms_courses(id, title), lms_cohorts(id, name)")
        .eq("company_id", activeCompanyId)
        .order("sort_order", { ascending: true })
        .order("start_at", { ascending: true, nullsFirst: false });

      if (filters.courseId) query = query.eq("course_id", filters.courseId);
      if (filters.cohortId) query = query.eq("cohort_id", filters.cohortId);
      if (filters.search) query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data as LmsSession[];
    },
    enabled: !!activeCompanyId && lmsEnabled,
  });
}

export function useLmsSession(sessionId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  return useQuery({
    queryKey: ["lms-session", sessionId],
    queryFn: async () => {
      if (!sessionId || !activeCompanyId || !lmsEnabled) return null;

      const { data, error } = await supabase
        .from("lms_sessions")
        .select("*, lms_courses(id, title), lms_cohorts(id, name)")
        .eq("id", sessionId)
        .eq("company_id", activeCompanyId)
        .maybeSingle();

      if (error) throw error;
      return data as LmsSession | null;
    },
    enabled: !!sessionId && !!activeCompanyId && lmsEnabled,
  });
}

export function useLmsSessionMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { log } = useAuditLog();
  const { isEnabled } = useCompanyModules();

  const createSession = useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      if (!activeCompanyId) throw new Error("No active company");
      const { data: userData } = await supabase.auth.getUser();

      const { data: session, error } = await supabase
        .from("lms_sessions")
        .insert({
          company_id: activeCompanyId,
          course_id: input.course_id,
          cohort_id: input.cohort_id || null,
          title: input.title,
          description: input.description || null,
          start_at: input.start_at || null,
          end_at: input.end_at || null,
          all_day: input.all_day || false,
          location_text: input.location_text || null,
          meeting_url: input.meeting_url || null,
          created_by: userData.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Optionally create a linked calendar event
      if (input.createCalendarEvent && input.start_at && isEnabled("calendar")) {
        const { data: event, error: eventError } = await supabase
          .from("events")
          .insert({
            company_id: activeCompanyId,
            title: input.title,
            description: input.description || null,
            start_at: input.start_at,
            end_at: input.end_at || input.start_at,
            all_day: input.all_day || false,
            location_text: input.location_text || null,
            category: "lms_session",
            created_by: userData.user?.id || null,
          })
          .select()
          .single();

        if (!eventError && event) {
          await supabase.from("lms_sessions").update({ linked_event_id: event.id }).eq("id", session.id);
          session.linked_event_id = event.id;
          log("lms.session_calendar_linked", "lms_session", session.id, { eventId: event.id });
        }
      }

      return session as LmsSession;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lms-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      log("lms.session_created", "lms_session", data.id, { title: data.title, cohortId: data.cohort_id });
      toast.success("Session created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create session: ${error.message}`);
    },
  });

  const updateSession = useMutation({
    mutationFn: async ({ id, ...input }: UpdateSessionInput & { id: string }) => {
      const { data, error } = await supabase
        .from("lms_sessions")
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as LmsSession;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lms-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["lms-session", data.id] });
      log("lms.session_updated", "lms_session", data.id, { title: data.title });
      toast.success("Session updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update session: ${error.message}`);
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.from("lms_sessions").delete().eq("id", sessionId);
      if (error) throw error;
      return sessionId;
    },
    onSuccess: (sessionId) => {
      queryClient.invalidateQueries({ queryKey: ["lms-sessions"] });
      log("lms.session_deleted", "lms_session", sessionId, {});
      toast.success("Session deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete session: ${error.message}`);
    },
  });

  return { createSession, updateSession, deleteSession };
}
