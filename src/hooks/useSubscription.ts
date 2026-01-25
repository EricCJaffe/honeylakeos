import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { toast } from "sonner";

// Types aligned with Prompt 11
export type SubscriptionSource = "self" | "provisioned_by_coaching_org" | "imported" | "site_admin";
export type SubscriptionStatus = "active" | "grace" | "expired" | "cancelled" | "requires_action" | "trial";

export interface SubscriptionEvent {
  id: string;
  company_id: string;
  event_type: string;
  from_value: string | null;
  to_value: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_by_user_id: string | null;
  created_at: string;
}

export interface CompanySubscription {
  id: string;
  company_id: string;
  plan_tier: string;
  status: SubscriptionStatus;
  source: SubscriptionSource;
  trial_ends_at: string | null;
  grace_ends_at: string | null;
  expires_at: string | null;
  provisioned_by_coaching_org_id: string | null;
}

/**
 * Hook to get subscription events for audit/history
 */
export function useSubscriptionEvents() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["subscription-events", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("subscription_events")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as SubscriptionEvent[];
    },
    enabled: !!activeCompanyId,
  });
}

/**
 * Hook to check if subscription requires action (banner display)
 */
export function useSubscriptionStatus() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["subscription-status", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return null;
      const { data, error } = await supabase
        .from("company_plans")
        .select("status, grace_ends_at, trial_ends_at, source, expires_at")
        .eq("company_id", activeCompanyId)
        .maybeSingle();
      if (error) throw error;
      
      if (!data) return { requiresAction: false, isGrace: false, isTrial: false };
      
      const requiresAction = data.status === "requires_action";
      const isGrace = data.status === "grace" || (requiresAction && data.grace_ends_at);
      const isTrial = data.status === "trial";
      const graceEndsAt = data.grace_ends_at ? new Date(data.grace_ends_at) : null;
      const graceDaysRemaining = graceEndsAt 
        ? Math.max(0, Math.ceil((graceEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

      return {
        status: data.status as SubscriptionStatus,
        requiresAction,
        isGrace,
        isTrial,
        graceDaysRemaining,
        graceEndsAt: data.grace_ends_at,
        source: data.source as SubscriptionSource,
        isProvisionedByCoach: data.source === "provisioned_by_coaching_org",
      };
    },
    enabled: !!activeCompanyId,
  });
}

/**
 * Hook to log subscription events (for admin actions)
 */
export function useLogSubscriptionEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      eventType,
      fromValue,
      toValue,
      reason,
      metadata,
    }: {
      companyId: string;
      eventType: string;
      fromValue?: string;
      toValue?: string;
      reason?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("subscription_events").insert([{
        company_id: companyId,
        event_type: eventType,
        from_value: fromValue,
        to_value: toValue,
        reason,
        metadata: (metadata || {}) as Record<string, never>,
        created_by_user_id: user?.id,
      }]);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscription-events", variables.companyId] });
    },
  });
}

/**
 * Site admin hook to manage company subscriptions
 */
export function useAdminSubscriptionMutations() {
  const queryClient = useQueryClient();
  const logEvent = useLogSubscriptionEvent();

  const updateStatus = useMutation({
    mutationFn: async ({
      companyId,
      status,
      graceEndDays,
    }: {
      companyId: string;
      status: SubscriptionStatus;
      graceEndDays?: number;
    }) => {
      const updates: Record<string, unknown> = { status };
      if (graceEndDays) {
        updates.grace_ends_at = new Date(Date.now() + graceEndDays * 24 * 60 * 60 * 1000).toISOString();
      }
      const { error } = await supabase
        .from("company_plans")
        .update(updates)
        .eq("company_id", companyId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscription-status", variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ["company-plan", variables.companyId] });
      logEvent.mutate({
        companyId: variables.companyId,
        eventType: "status_changed",
        toValue: variables.status,
        reason: "admin_override",
      });
      toast.success("Subscription status updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update subscription: ${error.message}`);
    },
  });

  const extendGrace = useMutation({
    mutationFn: async ({ companyId, days }: { companyId: string; days: number }) => {
      const graceEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from("company_plans")
        .update({ grace_ends_at: graceEndsAt })
        .eq("company_id", companyId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscription-status", variables.companyId] });
      toast.success(`Grace period extended by ${variables.days} days`);
    },
  });

  return { updateStatus, extendGrace };
}
