import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { toast } from "sonner";

// Types
export type PlanType = "company" | "coach_org";
export type PlanTier = "starter" | "growth" | "scale" | "solo_coach" | "coaching_team" | "coaching_firm";
export type PlanStatus = "active" | "grace" | "expired" | "cancelled";

export interface CompanyPlan {
  id: string;
  company_id: string;
  plan_type: PlanType;
  plan_tier: PlanTier;
  started_at: string;
  expires_at: string | null;
  grace_period_days: number;
  status: PlanStatus;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PlanEntitlement {
  id: string;
  plan_tier: PlanTier;
  entitlement_key: string;
  entitlement_value: unknown;
  created_at: string;
  updated_at: string;
}

export interface EntitlementOverride {
  id: string;
  company_id: string;
  entitlement_key: string;
  entitlement_value: unknown;
  reason: string | null;
  granted_by: string | null;
  expires_at: string | null;
  created_at: string;
}

// Entitlement keys for type safety
export type EntitlementKey =
  // Numeric limits
  | "max_users"
  | "max_companies"
  | "max_active_frameworks"
  | "max_published_frameworks"
  | "max_active_clients"
  | "limits.users"
  | "limits.projects"
  | "limits.storage_mb"
  // Module entitlements (v1)
  | "modules.tasks"
  | "modules.projects"
  | "modules.crm"
  | "modules.donors"
  | "modules.finance"
  | "modules.lms"
  | "modules.reports"
  | "coach.enabled"
  // Feature flags (legacy + new)
  | "crm_enabled"
  | "lms_enabled"
  | "coaching_module_enabled"
  | "framework_engine_enabled"
  | "reporting_enabled"
  | "framework_marketplace_publish"
  | "weighted_health_metrics"
  | "coach_manager_views"
  | "private_coach_notes"
  | "advanced_reporting";

// Plan display info
export const PLAN_INFO: Record<PlanTier, { name: string; description: string; type: PlanType }> = {
  starter: { name: "Starter", description: "For small teams getting started", type: "company" },
  growth: { name: "Growth", description: "For growing organizations", type: "company" },
  scale: { name: "Scale", description: "For large organizations", type: "company" },
  solo_coach: { name: "Solo Coach", description: "For independent coaches", type: "coach_org" },
  coaching_team: { name: "Coaching Team", description: "For small coaching teams", type: "coach_org" },
  coaching_firm: { name: "Coaching Firm", description: "For large coaching organizations", type: "coach_org" },
};

// Plan metadata interface (from plans table)
export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  plan_type: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

// Default entitlements for companies without a plan (full access / legacy)
const DEFAULT_ENTITLEMENTS: Record<string, unknown> = {
  max_users: 999999,
  max_companies: 999999,
  max_active_frameworks: 999999,
  max_published_frameworks: 999999,
  max_active_clients: 999999,
  // Module entitlements (v1)
  "modules.tasks": true,
  "modules.projects": true,
  "modules.crm": true,
  "modules.donors": true,
  "modules.finance": true,
  "modules.lms": true,
  "modules.reports": true,
  "limits.users": 999999,
  "limits.projects": 999999,
  "limits.storage_mb": 999999,
  "coach.enabled": true,
  // Legacy feature flags
  crm_enabled: true,
  lms_enabled: true,
  coaching_module_enabled: true,
  framework_engine_enabled: true,
  reporting_enabled: true,
  framework_marketplace_publish: true,
  weighted_health_metrics: true,
  coach_manager_views: true,
  private_coach_notes: true,
  advanced_reporting: true,
};

// ==========================================
// PLAN HOOKS
// ==========================================

/**
 * Fetch all available plans from the database
 */
export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data || []) as Plan[];
    },
  });
}

// ==========================================
// COMPANY PLAN HOOKS
// ==========================================

export function useCompanyPlan() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["company-plan", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return null;

      const { data, error } = await supabase
        .from("company_plans")
        .select("*")
        .eq("company_id", activeCompanyId)
        .maybeSingle();

      if (error) throw error;
      return data as CompanyPlan | null;
    },
    enabled: !!activeCompanyId,
  });
}

export function usePlanEntitlements(planTier: PlanTier | null) {
  return useQuery({
    queryKey: ["plan-entitlements", planTier],
    queryFn: async () => {
      if (!planTier) return {};

      const { data, error } = await supabase
        .from("plan_entitlements")
        .select("*")
        .eq("plan_tier", planTier);

      if (error) throw error;

      // Convert to key-value map
      const entitlements: Record<string, unknown> = {};
      for (const e of data || []) {
        entitlements[e.entitlement_key] = parseEntitlementValue(e.entitlement_value);
      }
      return entitlements;
    },
    enabled: !!planTier,
  });
}

export function useCompanyEntitlementOverrides() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["company-entitlement-overrides", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return {};

      const { data, error } = await supabase
        .from("company_entitlement_overrides")
        .select("*")
        .eq("company_id", activeCompanyId);

      if (error) throw error;

      // Convert to key-value map, excluding expired overrides
      const now = new Date();
      const overrides: Record<string, unknown> = {};
      for (const o of data || []) {
        if (o.expires_at && new Date(o.expires_at) < now) continue;
        overrides[o.entitlement_key] = parseEntitlementValue(o.entitlement_value);
      }
      return overrides;
    },
    enabled: !!activeCompanyId,
  });
}

// ==========================================
// ENTITLEMENT EVALUATION
// ==========================================

interface EntitlementResult {
  value: unknown;
  source: "plan" | "override" | "default";
  isLimited: boolean;
}

/**
 * Central hook for evaluating entitlements.
 * Returns functions to check specific entitlements.
 * 
 * BEHAVIOR:
 * - Company Admin / Site Admin always allowed (admin override)
 * - During grace period: allow access + show warnings
 * - When expired: read-only for restricted features
 * - Never delete data or break dashboards
 */
export function useEntitlements() {
  const { activeCompanyId } = useActiveCompany();
  const { data: plan, isLoading: planLoading } = useCompanyPlan();
  const { data: planEntitlements, isLoading: entitlementsLoading } = usePlanEntitlements(plan?.plan_tier || null);
  const { data: overrides, isLoading: overridesLoading } = useCompanyEntitlementOverrides();

  const isLoading = planLoading || entitlementsLoading || overridesLoading;

  /**
   * Get the effective value for an entitlement.
   * Priority: override > plan > default
   */
  const getEntitlement = (key: EntitlementKey): EntitlementResult => {
    // Check overrides first
    if (overrides && key in overrides) {
      return { value: overrides[key], source: "override", isLimited: false };
    }

    // Check plan entitlements
    if (planEntitlements && key in planEntitlements) {
      return { value: planEntitlements[key], source: "plan", isLimited: true };
    }

    // Fall back to default (full access)
    return { value: DEFAULT_ENTITLEMENTS[key], source: "default", isLimited: false };
  };

  /**
   * Check if a feature is enabled
   */
  const isEnabled = (key: EntitlementKey): boolean => {
    const result = getEntitlement(key);
    return result.value === true || result.value === "true";
  };

  /**
   * Get a numeric limit
   */
  const getLimit = (key: EntitlementKey): number => {
    const result = getEntitlement(key);
    const val = result.value;
    if (typeof val === "number") return val;
    if (typeof val === "string") return parseInt(val, 10) || 0;
    return 0;
  };

  /**
   * Check if current usage is within limit
   */
  const isWithinLimit = (key: EntitlementKey, currentUsage: number): boolean => {
    const limit = getLimit(key);
    return currentUsage < limit;
  };

  /**
   * Get usage info for a limit
   */
  const getUsageInfo = (key: EntitlementKey, currentUsage: number) => {
    const limit = getLimit(key);
    const percentage = limit > 0 ? Math.round((currentUsage / limit) * 100) : 0;
    const remaining = Math.max(0, limit - currentUsage);
    const isAtLimit = currentUsage >= limit;
    const isNearLimit = percentage >= 80;

    return {
      current: currentUsage,
      limit,
      remaining,
      percentage,
      isAtLimit,
      isNearLimit,
    };
  };

  /**
   * Get the current plan status
   */
  const getPlanStatus = () => {
    if (!plan) return { hasPlan: false, status: "none" as const, isActive: true, isGrace: false, isExpired: false, graceDaysRemaining: 0 };
    
    const isActive = plan.status === "active";
    const isGrace = plan.status === "grace";
    const isExpired = plan.status === "expired" || plan.status === "cancelled";

    // Calculate grace days remaining
    let graceDaysRemaining = 0;
    if (isGrace && plan.expires_at) {
      const expiryDate = new Date(plan.expires_at);
      const gracePeriod = plan.grace_period_days || 30;
      const graceEndDate = new Date(expiryDate.getTime() + gracePeriod * 24 * 60 * 60 * 1000);
      graceDaysRemaining = Math.max(0, Math.ceil((graceEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    }

    return {
      hasPlan: true,
      planTier: plan.plan_tier,
      planType: plan.plan_type,
      status: plan.status,
      isActive,
      isGrace,
      isExpired,
      expiresAt: plan.expires_at,
      graceDaysRemaining,
      gracePeriodDays: plan.grace_period_days || 30,
    };
  };

  return {
    isLoading,
    plan,
    getEntitlement,
    isEnabled,
    getLimit,
    isWithinLimit,
    getUsageInfo,
    getPlanStatus,
    // Convenience checks for common entitlements
    canUseCrm: () => isEnabled("crm_enabled"),
    canUseLms: () => isEnabled("lms_enabled"),
    canUseCoaching: () => isEnabled("coaching_module_enabled"),
    canPublishFrameworks: () => isEnabled("framework_marketplace_publish"),
    canUseWeightedMetrics: () => isEnabled("weighted_health_metrics"),
    canUseCoachManagerViews: () => isEnabled("coach_manager_views"),
    canUseAdvancedReporting: () => isEnabled("advanced_reporting"),
  };
}

// ==========================================
// PLAN MANAGEMENT (Admin)
// ==========================================

import { logAuditEvent } from "./useAuditLog";

export function usePlanMutations() {
  const queryClient = useQueryClient();

  const assignPlan = useMutation({
    mutationFn: async ({
      companyId,
      planType,
      planTier,
      expiresAt,
    }: {
      companyId: string;
      planType: PlanType;
      planTier: PlanTier;
      expiresAt?: string;
    }) => {
      const { data, error } = await supabase
        .from("company_plans")
        .upsert({
          company_id: companyId,
          plan_type: planType,
          plan_tier: planTier,
          expires_at: expiresAt,
          status: "active",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      
      // Audit log
      await logAuditEvent({
        companyId,
        action: "plan.assigned",
        entityType: "company_plan",
        entityId: data.id,
        metadata: { planTier, planType, expiresAt },
      });
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["company-plan", variables.companyId] });
      toast.success("Plan assigned successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign plan: ${error.message}`);
    },
  });

  const updatePlanStatus = useMutation({
    mutationFn: async ({
      planId,
      companyId,
      status,
      previousStatus,
    }: {
      planId: string;
      companyId: string;
      status: PlanStatus;
      previousStatus?: PlanStatus;
    }) => {
      const { data, error } = await supabase
        .from("company_plans")
        .update({ status })
        .eq("id", planId)
        .select()
        .single();

      if (error) throw error;
      
      // Audit log
      const action = status === "expired" ? "plan.expired" : "plan.changed";
      await logAuditEvent({
        companyId,
        action,
        entityType: "company_plan",
        entityId: planId,
        metadata: { newStatus: status, previousStatus },
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-plan"] });
      toast.success("Plan status updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const addEntitlementOverride = useMutation({
    mutationFn: async ({
      companyId,
      entitlementKey,
      entitlementValue,
      reason,
      expiresAt,
    }: {
      companyId: string;
      entitlementKey: string;
      entitlementValue: unknown;
      reason?: string;
      expiresAt?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("company_entitlement_overrides")
        .upsert({
          company_id: companyId,
          entitlement_key: entitlementKey,
          entitlement_value: JSON.stringify(entitlementValue),
          reason,
          expires_at: expiresAt,
          granted_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Audit log
      await logAuditEvent({
        companyId,
        action: "entitlement.override_added",
        entityType: "entitlement_override",
        entityId: data.id,
        metadata: { entitlementKey, entitlementValue, reason, expiresAt },
      });
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["company-entitlement-overrides", variables.companyId] });
      toast.success("Entitlement override added");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add override: ${error.message}`);
    },
  });

  const removeEntitlementOverride = useMutation({
    mutationFn: async ({ overrideId, companyId, entitlementKey }: { overrideId: string; companyId: string; entitlementKey: string }) => {
      const { error } = await supabase
        .from("company_entitlement_overrides")
        .delete()
        .eq("id", overrideId);

      if (error) throw error;
      
      // Audit log
      await logAuditEvent({
        companyId,
        action: "entitlement.override_removed",
        entityType: "entitlement_override",
        entityId: overrideId,
        metadata: { entitlementKey },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-entitlement-overrides"] });
      toast.success("Override removed");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove override: ${error.message}`);
    },
  });

  return {
    assignPlan,
    updatePlanStatus,
    addEntitlementOverride,
    removeEntitlementOverride,
  };
}

// ==========================================
// HELPERS
// ==========================================

function parseEntitlementValue(value: unknown): unknown {
  if (typeof value === "string") {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(value);
      return parsed;
    } catch {
      // Return as-is if not valid JSON
      if (value === "true") return true;
      if (value === "false") return false;
      const num = parseInt(value, 10);
      if (!isNaN(num)) return num;
      return value;
    }
  }
  return value;
}

/**
 * Higher-order component/hook guard for features requiring entitlements.
 * 
 * BEHAVIOR:
 * - Admin override: Company admins and site admins always get access
 * - Grace period: Allow access but show warnings
 * - Expired: Read-only for restricted features, never break dashboards
 */
export function useEntitlementGuard(
  entitlementKey: EntitlementKey,
  options?: { isAdmin?: boolean; skipAdminOverride?: boolean }
) {
  const { isEnabled, isLoading, getPlanStatus } = useEntitlements();
  
  const planStatus = getPlanStatus();
  const { isGrace, isExpired, planTier, graceDaysRemaining } = planStatus;
  
  // Admin override - company admins and site admins always allowed
  const hasAdminOverride = options?.isAdmin && !options?.skipAdminOverride;
  
  // Feature enabled check
  const featureEnabled = isEnabled(entitlementKey);
  
  // Grace period allows access with warnings
  const allowedDuringGrace = isGrace && featureEnabled;
  
  // Expired means read-only for restricted features
  const readOnlyMode = isExpired && featureEnabled;
  
  // Final access determination
  const isAllowed = hasAdminOverride || featureEnabled || allowedDuringGrace;
  
  return {
    isLoading,
    isAllowed,
    isGrace,
    isExpired,
    planTier,
    graceDaysRemaining,
    readOnlyMode,
    hasAdminOverride: !!hasAdminOverride,
    showUpgradePrompt: !isAllowed && !isLoading && !hasAdminOverride,
    showGraceWarning: isGrace && !isLoading,
    showExpiredWarning: isExpired && !isLoading,
  };
}

// ==========================================
// USAGE TRACKING HOOKS
// ==========================================

/**
 * Hook to get current usage counts for limit tracking
 */
export function useUsageCounts() {
  const { activeCompanyId } = useActiveCompany();

  const { data: userCount, isLoading: usersLoading } = useQuery({
    queryKey: ["usage-count-users", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return 0;
      const { count, error } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .eq("company_id", activeCompanyId)
        .eq("status", "active");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!activeCompanyId,
  });

  const { data: frameworkCount, isLoading: frameworksLoading } = useQuery({
    queryKey: ["usage-count-frameworks", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return 0;
      const { count, error } = await supabase
        .from("company_frameworks")
        .select("*", { count: "exact", head: true })
        .eq("company_id", activeCompanyId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!activeCompanyId,
  });

  const { data: publishedFrameworkCount, isLoading: publishedLoading } = useQuery({
    queryKey: ["usage-count-published-frameworks", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return 0;
      const { count, error } = await supabase
        .from("frameworks")
        .select("*", { count: "exact", head: true })
        .eq("owner_company_id", activeCompanyId)
        .eq("status", "published")
        .not("marketplace_visibility", "is", null);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!activeCompanyId,
  });

  const { data: clientCount, isLoading: clientsLoading } = useQuery({
    queryKey: ["usage-count-clients", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return 0;
      const { count, error } = await supabase
        .from("coaching_engagements")
        .select("*", { count: "exact", head: true })
        .eq("coaching_org_company_id", activeCompanyId)
        .is("archived_at", null);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!activeCompanyId,
  });

  return {
    isLoading: usersLoading || frameworksLoading || publishedLoading || clientsLoading,
    counts: {
      users: userCount ?? 0,
      frameworks: frameworkCount ?? 0,
      publishedFrameworks: publishedFrameworkCount ?? 0,
      clients: clientCount ?? 0,
    },
  };
}

/**
 * Hook for checking if a specific action can be performed (soft limit enforcement)
 * Prevents new creation only, existing data remains usable
 */
export function useCanPerformAction(action: "add_user" | "add_framework" | "publish_framework" | "add_client") {
  const { getLimit, getPlanStatus } = useEntitlements();
  const { counts, isLoading: usageLoading } = useUsageCounts();

  const actionToEntitlement: Record<typeof action, { key: EntitlementKey; countKey: keyof typeof counts }> = {
    add_user: { key: "max_users", countKey: "users" },
    add_framework: { key: "max_active_frameworks", countKey: "frameworks" },
    publish_framework: { key: "max_published_frameworks", countKey: "publishedFrameworks" },
    add_client: { key: "max_active_clients", countKey: "clients" },
  };

  const { key, countKey } = actionToEntitlement[action];
  const limit = getLimit(key);
  const current = counts[countKey];
  const planStatus = getPlanStatus();

  // During grace period, allow actions
  // When expired, prevent new creation
  const canPerform = planStatus.isExpired ? false : current < limit;
  const wouldExceedLimit = current >= limit;

  return {
    isLoading: usageLoading,
    canPerform,
    wouldExceedLimit,
    current,
    limit,
    remaining: Math.max(0, limit - current),
    isExpired: planStatus.isExpired,
    isGrace: planStatus.isGrace,
    message: planStatus.isExpired
      ? "Your plan has expired. Renew to continue adding new items."
      : wouldExceedLimit
      ? `You've reached your limit of ${limit}. Upgrade your plan to add more.`
      : null,
  };
}
