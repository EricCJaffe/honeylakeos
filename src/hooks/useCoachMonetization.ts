import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { logAuditEvent } from "./useAuditLog";
import { toast } from "sonner";

// ==========================================
// TYPES
// ==========================================

export interface CoachPlan {
  id: string;
  coach_company_id: string;
  base_plan_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  base_plan?: {
    name: string;
    slug: string;
    plan_type: string;
  };
}

export interface CoachPlanOverride {
  id: string;
  coach_plan_id: string;
  entitlement_key: string;
  entitlement_value: unknown;
  created_at: string;
}

export interface CompanyCoachAttribution {
  id: string;
  company_id: string;
  coach_company_id: string;
  coach_plan_id: string | null;
  attributed_at: string;
  attribution_type: "referral" | "managed";
  is_active: boolean;
  referral_code: string | null;
  notes: string | null;
  created_by: string | null;
  // Joined data
  company?: {
    name: string;
  };
  coach_company?: {
    name: string;
  };
  coach_plan?: {
    name: string;
  };
}

export interface CoachReferralLink {
  id: string;
  coach_company_id: string;
  coach_plan_id: string | null;
  code: string;
  name: string | null;
  is_active: boolean;
  uses_count: number;
  max_uses: number | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  // Joined data
  coach_plan?: {
    name: string;
  };
}

export interface RevenueEvent {
  id: string;
  company_id: string;
  coach_company_id: string | null;
  event_type: "plan_started" | "plan_upgraded" | "plan_renewed" | "plan_cancelled";
  plan_tier: string;
  coach_plan_id: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
  // Joined data
  company?: {
    name: string;
  };
}

// ==========================================
// COACH PLANS HOOKS
// ==========================================

/**
 * Fetch coach plans for the active coaching organization
 */
export function useCoachPlans() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["coach-plans", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("coach_plans")
        .select(`
          *,
          base_plan:plans(name, slug, plan_type)
        `)
        .eq("coach_company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as CoachPlan[];
    },
    enabled: !!activeCompanyId,
  });
}

/**
 * Fetch overrides for a specific coach plan
 */
export function useCoachPlanOverrides(coachPlanId: string | null) {
  return useQuery({
    queryKey: ["coach-plan-overrides", coachPlanId],
    queryFn: async () => {
      if (!coachPlanId) return [];

      const { data, error } = await supabase
        .from("coach_plan_overrides")
        .select("*")
        .eq("coach_plan_id", coachPlanId);

      if (error) throw error;
      return (data || []) as CoachPlanOverride[];
    },
    enabled: !!coachPlanId,
  });
}

/**
 * Mutations for managing coach plans
 */
export function useCoachPlanMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const createCoachPlan = useMutation({
    mutationFn: async ({
      basePlanId,
      name,
      description,
    }: {
      basePlanId: string;
      name: string;
      description?: string;
    }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data, error } = await supabase
        .from("coach_plans")
        .insert({
          coach_company_id: activeCompanyId,
          base_plan_id: basePlanId,
          name,
          description,
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        companyId: activeCompanyId,
        action: "coach_plan.created",
        entityType: "coach_plan",
        entityId: data.id,
        metadata: { name, basePlanId },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-plans", activeCompanyId] });
      toast.success("Coach plan created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create coach plan: ${error.message}`);
    },
  });

  const updateCoachPlan = useMutation({
    mutationFn: async ({
      planId,
      name,
      description,
      isActive,
    }: {
      planId: string;
      name?: string;
      description?: string;
      isActive?: boolean;
    }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (isActive !== undefined) updates.is_active = isActive;

      const { data, error } = await supabase
        .from("coach_plans")
        .update(updates)
        .eq("id", planId)
        .select()
        .single();

      if (error) throw error;

      const action = isActive === false ? "coach_plan.deactivated" : "coach_plan.updated";
      await logAuditEvent({
        companyId: activeCompanyId,
        action,
        entityType: "coach_plan",
        entityId: planId,
        metadata: updates,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-plans", activeCompanyId] });
      toast.success("Coach plan updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update coach plan: ${error.message}`);
    },
  });

  const setCoachPlanOverride = useMutation({
    mutationFn: async ({
      coachPlanId,
      entitlementKey,
      entitlementValue,
    }: {
      coachPlanId: string;
      entitlementKey: string;
      entitlementValue: unknown;
    }) => {
      const { data, error } = await supabase
        .from("coach_plan_overrides")
        .upsert({
          coach_plan_id: coachPlanId,
          entitlement_key: entitlementKey,
          entitlement_value: JSON.stringify(entitlementValue),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["coach-plan-overrides", variables.coachPlanId] });
      toast.success("Entitlement override set");
    },
    onError: (error: Error) => {
      toast.error(`Failed to set override: ${error.message}`);
    },
  });

  const removeCoachPlanOverride = useMutation({
    mutationFn: async (overrideId: string) => {
      const { error } = await supabase
        .from("coach_plan_overrides")
        .delete()
        .eq("id", overrideId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-plan-overrides"] });
      toast.success("Override removed");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove override: ${error.message}`);
    },
  });

  return {
    createCoachPlan,
    updateCoachPlan,
    setCoachPlanOverride,
    removeCoachPlanOverride,
  };
}

// ==========================================
// ATTRIBUTION HOOKS
// ==========================================

/**
 * Fetch attribution for a company (who brought them in)
 */
export function useCompanyAttribution() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["company-attribution", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return null;

      const { data, error } = await supabase
        .from("company_coach_attribution")
        .select(`
          *,
          coach_company:companies!company_coach_attribution_coach_company_id_fkey(name),
          coach_plan:coach_plans(name)
        `)
        .eq("company_id", activeCompanyId)
        .maybeSingle();

      if (error) throw error;
      return data as CompanyCoachAttribution | null;
    },
    enabled: !!activeCompanyId,
  });
}

/**
 * Fetch companies attributed to a coach organization
 */
export function useAttributedCompanies() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["attributed-companies", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("company_coach_attribution")
        .select(`
          *,
          company:companies!company_coach_attribution_company_id_fkey(name),
          coach_plan:coach_plans(name)
        `)
        .eq("coach_company_id", activeCompanyId)
        .eq("is_active", true)
        .order("attributed_at", { ascending: false });

      if (error) throw error;
      return (data || []) as CompanyCoachAttribution[];
    },
    enabled: !!activeCompanyId,
  });
}

/**
 * Mutations for managing attributions (Site Admin only)
 */
export function useAttributionMutations() {
  const queryClient = useQueryClient();

  const createAttribution = useMutation({
    mutationFn: async ({
      companyId,
      coachCompanyId,
      coachPlanId,
      attributionType,
      referralCode,
      notes,
    }: {
      companyId: string;
      coachCompanyId: string;
      coachPlanId?: string;
      attributionType?: "referral" | "managed";
      referralCode?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("company_coach_attribution")
        .insert({
          company_id: companyId,
          coach_company_id: coachCompanyId,
          coach_plan_id: coachPlanId,
          attribution_type: attributionType || "referral",
          referral_code: referralCode,
          notes,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        companyId,
        action: "attribution.created",
        entityType: "coach_attribution",
        entityId: data.id,
        metadata: { coachCompanyId, attributionType, coachPlanId },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-attribution"] });
      queryClient.invalidateQueries({ queryKey: ["attributed-companies"] });
      toast.success("Company attributed to coach");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create attribution: ${error.message}`);
    },
  });

  const updateAttribution = useMutation({
    mutationFn: async ({
      attributionId,
      companyId,
      coachPlanId,
      attributionType,
      isActive,
      notes,
    }: {
      attributionId: string;
      companyId: string;
      coachPlanId?: string;
      attributionType?: "referral" | "managed";
      isActive?: boolean;
      notes?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (coachPlanId !== undefined) updates.coach_plan_id = coachPlanId;
      if (attributionType !== undefined) updates.attribution_type = attributionType;
      if (isActive !== undefined) updates.is_active = isActive;
      if (notes !== undefined) updates.notes = notes;

      const { data, error } = await supabase
        .from("company_coach_attribution")
        .update(updates)
        .eq("id", attributionId)
        .select()
        .single();

      if (error) throw error;

      const action = isActive === false ? "attribution.deactivated" : "attribution.updated";
      await logAuditEvent({
        companyId,
        action,
        entityType: "coach_attribution",
        entityId: attributionId,
        metadata: updates,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-attribution"] });
      queryClient.invalidateQueries({ queryKey: ["attributed-companies"] });
      toast.success("Attribution updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update attribution: ${error.message}`);
    },
  });

  return {
    createAttribution,
    updateAttribution,
  };
}

// ==========================================
// REFERRAL LINKS HOOKS
// ==========================================

/**
 * Fetch referral links for the coach organization
 */
export function useCoachReferralLinks() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["coach-referral-links", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("coach_referral_links")
        .select(`
          *,
          coach_plan:coach_plans(name)
        `)
        .eq("coach_company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as CoachReferralLink[];
    },
    enabled: !!activeCompanyId,
  });
}

/**
 * Validate a referral code (public, no auth required)
 */
export async function validateReferralCode(code: string) {
  const { data, error } = await supabase
    .from("coach_referral_links")
    .select(`
      id,
      coach_company_id,
      coach_plan_id,
      is_active,
      uses_count,
      max_uses,
      expires_at,
      coach_plan:coach_plans(name, base_plan_id)
    `)
    .eq("code", code)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { valid: false, reason: "Invalid referral code" };
  if (!data.is_active) return { valid: false, reason: "Referral code is no longer active" };
  if (data.max_uses && data.uses_count >= data.max_uses) {
    return { valid: false, reason: "Referral code has reached its usage limit" };
  }
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, reason: "Referral code has expired" };
  }

  return {
    valid: true,
    coachCompanyId: data.coach_company_id,
    coachPlanId: data.coach_plan_id,
    coachPlanName: data.coach_plan?.name,
  };
}

/**
 * Mutations for managing referral links
 */
export function useReferralLinkMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const createReferralLink = useMutation({
    mutationFn: async ({
      name,
      coachPlanId,
      maxUses,
      expiresAt,
    }: {
      name?: string;
      coachPlanId?: string;
      maxUses?: number;
      expiresAt?: string;
    }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: { user } } = await supabase.auth.getUser();
      const code = generateReferralCode();

      const { data, error } = await supabase
        .from("coach_referral_links")
        .insert({
          coach_company_id: activeCompanyId,
          coach_plan_id: coachPlanId,
          code,
          name,
          max_uses: maxUses,
          expires_at: expiresAt,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        companyId: activeCompanyId,
        action: "referral_link.created",
        entityType: "referral_link",
        entityId: data.id,
        metadata: { code, name, coachPlanId },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-referral-links", activeCompanyId] });
      toast.success("Referral link created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create referral link: ${error.message}`);
    },
  });

  const updateReferralLink = useMutation({
    mutationFn: async ({
      linkId,
      name,
      isActive,
      maxUses,
      expiresAt,
    }: {
      linkId: string;
      name?: string;
      isActive?: boolean;
      maxUses?: number;
      expiresAt?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (isActive !== undefined) updates.is_active = isActive;
      if (maxUses !== undefined) updates.max_uses = maxUses;
      if (expiresAt !== undefined) updates.expires_at = expiresAt;

      const { data, error } = await supabase
        .from("coach_referral_links")
        .update(updates)
        .eq("id", linkId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-referral-links", activeCompanyId] });
      toast.success("Referral link updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update referral link: ${error.message}`);
    },
  });

  const incrementReferralLinkUse = useMutation({
    mutationFn: async (linkId: string) => {
      // Increment uses_count directly
      const { data: current, error: fetchError } = await supabase
        .from("coach_referral_links")
        .select("uses_count")
        .eq("id", linkId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from("coach_referral_links")
        .update({ uses_count: (current.uses_count || 0) + 1 })
        .eq("id", linkId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  return {
    createReferralLink,
    updateReferralLink,
    incrementReferralLinkUse,
  };
}

// ==========================================
// REVENUE EVENTS HOOKS
// ==========================================

/**
 * Fetch revenue events for a coach organization
 */
export function useRevenueEvents() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["revenue-events", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("revenue_events")
        .select(`
          *,
          company:companies!revenue_events_company_id_fkey(name)
        `)
        .eq("coach_company_id", activeCompanyId)
        .order("occurred_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as RevenueEvent[];
    },
    enabled: !!activeCompanyId,
  });
}

/**
 * Record a revenue event (called when plans are assigned/changed)
 */
export async function recordRevenueEvent({
  companyId,
  coachCompanyId,
  eventType,
  planTier,
  coachPlanId,
  metadata = {},
}: {
  companyId: string;
  coachCompanyId?: string;
  eventType: "plan_started" | "plan_upgraded" | "plan_renewed" | "plan_cancelled";
  planTier: string;
  coachPlanId?: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from("revenue_events")
    .insert([{
      company_id: companyId,
      coach_company_id: coachCompanyId,
      event_type: eventType,
      plan_tier: planTier,
      coach_plan_id: coachPlanId,
      metadata: (metadata || {}) as never,
    }])
    .select()
    .single();

  if (error) throw error;

  await logAuditEvent({
    companyId,
    action: "revenue_event.recorded",
    entityType: "revenue_event",
    entityId: data.id,
    metadata: { eventType, planTier, coachCompanyId },
  });

  return data;
}

// ==========================================
// HELPERS
// ==========================================

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Compute effective entitlements with coach plan overrides
 */
export function computeEffectiveEntitlements(
  baseEntitlements: Record<string, unknown>,
  coachOverrides: CoachPlanOverride[]
): Record<string, unknown> {
  const effective = { ...baseEntitlements };
  
  for (const override of coachOverrides) {
    const key = override.entitlement_key;
    const value = parseOverrideValue(override.entitlement_value);
    
    // Coach can only increase boolean features or decrease limits
    const baseValue = effective[key];
    if (typeof baseValue === "boolean" && value === true) {
      // Can enable a disabled feature
      effective[key] = true;
    } else if (typeof baseValue === "number" && typeof value === "number") {
      // Can only provide value up to the base limit
      effective[key] = Math.min(baseValue, value);
    } else {
      effective[key] = value;
    }
  }
  
  return effective;
}

function parseOverrideValue(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      if (value === "true") return true;
      if (value === "false") return false;
      const num = parseInt(value, 10);
      if (!isNaN(num)) return num;
      return value;
    }
  }
  return value;
}
