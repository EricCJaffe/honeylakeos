import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { useAuth } from "@/lib/auth";
import { useAuditLog } from "@/hooks/useAuditLog";
import { toast } from "sonner";

export type SuggestionStatus = "pending" | "accepted" | "rejected";
export type ShareRequestType = "report" | "document" | "note";

export interface PlaybookAction {
  title: string;
  description: string;
  suggested_duration_minutes?: number;
  cta_type: "create_session" | "suggest_task" | "request_share" | "send_checklist";
  suggested_artifacts?: {
    template_id?: string;
    report_type?: string;
    config_json?: Record<string, unknown>;
  };
}

export interface PlaybookTrigger {
  alert_types?: string[];
  score_threshold?: number;
  trend_drop_threshold?: number;
  inactivity_days?: number;
}

export interface FrameworkPlaybook {
  id: string;
  framework_id: string;
  name: string;
  description: string | null;
  trigger_conditions_json: PlaybookTrigger;
  recommended_actions_json: PlaybookAction[];
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CoachingSession {
  id: string;
  coach_company_id: string;
  client_company_id: string;
  created_by: string;
  title: string;
  agenda_rte: string | null;
  notes_rte: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  playbook_id: string | null;
  created_at: string;
  updated_at: string;
  client_company?: { id: string; name: string };
  playbook?: { id: string; name: string };
}

export interface SuggestedTask {
  id: string;
  coach_company_id: string;
  client_company_id: string;
  created_by: string;
  title: string;
  description_rte: string | null;
  suggested_due_date: string | null;
  status: SuggestionStatus;
  decided_by_user_id: string | null;
  decided_at: string | null;
  converted_task_id: string | null;
  playbook_id: string | null;
  created_at: string;
  updated_at: string;
  client_company?: { id: string; name: string };
  coach_company?: { id: string; name: string };
}

export interface CoachShareRequest {
  id: string;
  coach_company_id: string;
  client_company_id: string;
  requested_by: string;
  request_type: ShareRequestType;
  entity_id: string;
  entity_name: string | null;
  reason: string | null;
  status: SuggestionStatus;
  decided_by_user_id: string | null;
  decided_at: string | null;
  created_at: string;
  client_company?: { id: string; name: string };
  coach_company?: { id: string; name: string };
}

// Get playbooks for a framework
export function useFrameworkPlaybooks(frameworkId: string | undefined) {
  return useQuery({
    queryKey: ["framework-playbooks", frameworkId],
    queryFn: async () => {
      if (!frameworkId) return [];
      const { data, error } = await supabase
        .from("framework_playbooks")
        .select("*")
        .eq("framework_id", frameworkId)
        .eq("enabled", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as unknown as FrameworkPlaybook[];
      if (error) throw error;
      return data as FrameworkPlaybook[];
    },
    enabled: !!frameworkId,
  });
}

// Match playbooks to an alert
export function matchPlaybooksToAlert(
  playbooks: FrameworkPlaybook[],
  alert: { alert_type: string; data_snapshot?: Record<string, unknown> }
): FrameworkPlaybook[] {
  return playbooks.filter((playbook) => {
    const triggers = playbook.trigger_conditions_json;
    if (triggers.alert_types?.length) {
      if (!triggers.alert_types.includes(alert.alert_type)) return false;
    }
    if (triggers.score_threshold !== undefined) {
      const score = (alert.data_snapshot?.current_score as number) || 100;
      if (score > triggers.score_threshold) return false;
    }
    return true;
  });
}

// ========== COACHING SESSIONS ==========

export function useCoachingSessions(clientCompanyId?: string) {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["coaching-sessions", activeCompanyId, clientCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      let query = supabase
        .from("coaching_sessions")
        .select(`*, client_company:companies!coaching_sessions_client_company_id_fkey(id, name)`)
        .eq("coach_company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (clientCompanyId) {
        query = query.eq("client_company_id", clientCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CoachingSession[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useCreateCoachingSession() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useMembership();
  const { user } = useAuth();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async (input: {
      clientCompanyId: string;
      title: string;
      agendaRte?: string;
      scheduledAt?: string;
      playbookId?: string;
    }) => {
      if (!activeCompanyId || !user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("coaching_sessions")
        .insert({
          coach_company_id: activeCompanyId,
          client_company_id: input.clientCompanyId,
          created_by: user.id,
          title: input.title,
          agenda_rte: input.agendaRte,
          scheduled_at: input.scheduledAt,
          playbook_id: input.playbookId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["coaching-sessions"] });
      log("coaching.session_created" as any, "coaching_session" as any, data.id);
      toast.success("Coaching session created");
    },
    onError: (error) => {
      toast.error("Failed to create session", { description: error.message });
    },
  });
}

// ========== SUGGESTED TASKS ==========

export function useSuggestedTasks(options?: { clientCompanyId?: string; status?: SuggestionStatus }) {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["suggested-tasks", activeCompanyId, options?.clientCompanyId, options?.status],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      // First check if we're coach or client
      let query = supabase
        .from("suggested_tasks")
        .select(`*, 
          client_company:companies!suggested_tasks_client_company_id_fkey(id, name),
          coach_company:companies!suggested_tasks_coach_company_id_fkey(id, name)
        `)
        .order("created_at", { ascending: false });

      // Try coach company first
      query = query.eq("coach_company_id", activeCompanyId);

      if (options?.clientCompanyId) {
        query = query.eq("client_company_id", options.clientCompanyId);
      }
      if (options?.status) {
        query = query.eq("status", options.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SuggestedTask[];
    },
    enabled: !!activeCompanyId,
  });
}

// Get suggestions for client admin inbox
export function useIncomingSuggestions() {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["incoming-suggestions", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("suggested_tasks")
        .select(`*, coach_company:companies!suggested_tasks_coach_company_id_fkey(id, name)`)
        .eq("client_company_id", activeCompanyId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SuggestedTask[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useCreateSuggestedTask() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useMembership();
  const { user } = useAuth();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async (input: {
      clientCompanyId: string;
      title: string;
      descriptionRte?: string;
      suggestedDueDate?: string;
      playbookId?: string;
    }) => {
      if (!activeCompanyId || !user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("suggested_tasks")
        .insert({
          coach_company_id: activeCompanyId,
          client_company_id: input.clientCompanyId,
          created_by: user.id,
          title: input.title,
          description_rte: input.descriptionRte,
          suggested_due_date: input.suggestedDueDate,
          playbook_id: input.playbookId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["suggested-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["incoming-suggestions"] });
      log("coaching.task_suggested" as any, "suggested_task" as any, data.id);
      toast.success("Task suggestion sent to client");
    },
    onError: (error) => {
      toast.error("Failed to suggest task", { description: error.message });
    },
  });
}

export function useAcceptSuggestedTask() {
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async ({ suggestionId, assigneeUserId }: { suggestionId: string; assigneeUserId?: string }) => {
      const { data, error } = await supabase.rpc("accept_suggested_task", {
        _suggestion_id: suggestionId,
        _assignee_user_id: assigneeUserId || null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (taskId, { suggestionId }) => {
      queryClient.invalidateQueries({ queryKey: ["suggested-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["incoming-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      log("coaching.task_accepted" as any, "suggested_task" as any, suggestionId, { task_id: taskId });
      toast.success("Task created from suggestion");
    },
    onError: (error) => {
      toast.error("Failed to accept suggestion", { description: error.message });
    },
  });
}

export function useRejectSuggestedTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("suggested_tasks")
        .update({
          status: "rejected",
          decided_by_user_id: user.id,
          decided_at: new Date().toISOString(),
        })
        .eq("id", suggestionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["suggested-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["incoming-suggestions"] });
      log("coaching.task_rejected" as any, "suggested_task" as any, data.id);
      toast.success("Suggestion declined");
    },
    onError: (error) => {
      toast.error("Failed to reject suggestion", { description: error.message });
    },
  });
}

// ========== SHARE REQUESTS ==========

export function useShareRequests(options?: { clientCompanyId?: string; status?: SuggestionStatus }) {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["share-requests", activeCompanyId, options?.clientCompanyId, options?.status],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      let query = supabase
        .from("coach_share_requests")
        .select(`*, client_company:companies!coach_share_requests_client_company_id_fkey(id, name)`)
        .eq("coach_company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (options?.clientCompanyId) {
        query = query.eq("client_company_id", options.clientCompanyId);
      }
      if (options?.status) {
        query = query.eq("status", options.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CoachShareRequest[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useIncomingShareRequests() {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["incoming-share-requests", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("coach_share_requests")
        .select(`*, coach_company:companies!coach_share_requests_coach_company_id_fkey(id, name)`)
        .eq("client_company_id", activeCompanyId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CoachShareRequest[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useCreateShareRequest() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useMembership();
  const { user } = useAuth();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async (input: {
      clientCompanyId: string;
      requestType: ShareRequestType;
      entityId: string;
      entityName?: string;
      reason?: string;
    }) => {
      if (!activeCompanyId || !user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("coach_share_requests")
        .insert({
          coach_company_id: activeCompanyId,
          client_company_id: input.clientCompanyId,
          requested_by: user.id,
          request_type: input.requestType,
          entity_id: input.entityId,
          entity_name: input.entityName,
          reason: input.reason,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["share-requests"] });
      queryClient.invalidateQueries({ queryKey: ["incoming-share-requests"] });
      log("coaching.share_requested" as any, "coach_share_request" as any, data.id);
      toast.success("Share request sent to client");
    },
    onError: (error) => {
      toast.error("Failed to request share", { description: error.message });
    },
  });
}

export function useDecideShareRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async ({ requestId, approve }: { requestId: string; approve: boolean }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("coach_share_requests")
        .update({
          status: approve ? "accepted" : "rejected",
          decided_by_user_id: user.id,
          decided_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .select()
        .single();

      if (error) throw error;

      // If approved and it's a report, update report visibility
      if (approve && data.request_type === "report") {
        await supabase
          .from("reports")
          .update({ visibility: "coach_shared" })
          .eq("id", data.entity_id);
      }

      return data;
    },
    onSuccess: (data, { approve }) => {
      queryClient.invalidateQueries({ queryKey: ["share-requests"] });
      queryClient.invalidateQueries({ queryKey: ["incoming-share-requests"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      const action = approve ? "coaching.share_approved" : "coaching.share_denied";
      log(action as any, "coach_share_request" as any, data.id);
      toast.success(approve ? "Share request approved" : "Share request denied");
    },
    onError: (error) => {
      toast.error("Failed to process request", { description: error.message });
    },
  });
}
