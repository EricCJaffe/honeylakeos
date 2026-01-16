import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export type AttendeeRole = "required" | "optional";
export type AttendeeResponseStatus = "needs_action" | "accepted" | "declined" | "tentative";

export interface EventAttendee {
  event_id: string;
  user_id: string;
  role: AttendeeRole;
  response_status: AttendeeResponseStatus;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export function useEventAttendees(eventId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["event-attendees", eventId],
    queryFn: async (): Promise<EventAttendee[]> => {
      if (!eventId || !activeCompanyId) return [];

      // Get attendees for this event
      const { data: attendees, error } = await supabase
        .from("event_attendees")
        .select("*")
        .eq("event_id", eventId);

      if (error) throw error;

      // Get profiles for attendees
      if (attendees && attendees.length > 0) {
        const userIds = attendees.map((a) => a.user_id);
        const { data: members } = await supabase.rpc("get_company_member_directory", {
          p_company_id: activeCompanyId,
        });

        const memberMap = new Map(
          (members || []).map((m: any) => [m.user_id, { full_name: m.full_name, email: m.email }])
        );

        return attendees.map((a) => ({
          ...a,
          role: a.role as AttendeeRole,
          response_status: a.response_status as AttendeeResponseStatus,
          profile: memberMap.get(a.user_id) || null,
        }));
      }

      return [];
    },
    enabled: !!eventId && !!activeCompanyId,
  });
}

export function useCompanyMembers() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["company-members", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase.rpc("get_company_member_directory", {
        p_company_id: activeCompanyId,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompanyId,
  });
}

export function useEventAttendeeActions() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const addAttendee = useMutation({
    mutationFn: async ({
      eventId,
      userId,
      role = "required",
    }: {
      eventId: string;
      userId: string;
      role?: AttendeeRole;
    }) => {
      const { error } = await supabase.from("event_attendees").insert({
        event_id: eventId,
        user_id: userId,
        role,
        response_status: "needs_action",
      });

      if (error) throw error;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-attendees", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      toast.success("Attendee added");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add attendee");
    },
  });

  const removeAttendee = useMutation({
    mutationFn: async ({
      eventId,
      userId,
    }: {
      eventId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from("event_attendees")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-attendees", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      toast.success("Attendee removed");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove attendee");
    },
  });

  const updateResponse = useMutation({
    mutationFn: async ({
      eventId,
      responseStatus,
    }: {
      eventId: string;
      responseStatus: AttendeeResponseStatus;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("event_attendees")
        .update({ response_status: responseStatus })
        .eq("event_id", eventId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-attendees", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      toast.success("Response updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update response");
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({
      eventId,
      userId,
      role,
    }: {
      eventId: string;
      userId: string;
      role: AttendeeRole;
    }) => {
      const { error } = await supabase
        .from("event_attendees")
        .update({ role })
        .eq("event_id", eventId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["event-attendees", eventId] });
      toast.success("Role updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update role");
    },
  });

  return {
    addAttendee,
    removeAttendee,
    updateResponse,
    updateRole,
  };
}
