import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

// Types
export type CoachingRole = "coach" | "coach_manager" | "org_admin";
export type EngagementStatus = "active" | "paused" | "ended";
export type CoachAssignmentRole = "primary_coach" | "support_coach";
export type RecommendationType = "task" | "project" | "calendar_event" | "note_prompt" | "document_prompt" | "framework_change_suggestion";
export type RecommendationStatus = "proposed" | "accepted" | "rejected" | "expired";

export interface CoachingOrgSettings {
  company_id: string;
  branding_name: string | null;
  default_client_access_level: string;
  coach_manager_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoachingCoachProfile {
  id: string;
  company_id: string;
  user_id: string;
  coach_role: CoachingRole;
  specialties: string[];
  bio: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoachingEngagement {
  id: string;
  coaching_org_company_id: string;
  client_company_id: string;
  engagement_status: EngagementStatus;
  primary_framework_id: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CoachAssignment {
  id: string;
  engagement_id: string;
  coach_user_id: string;
  assignment_role: CoachAssignmentRole;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoachRecommendation {
  id: string;
  engagement_id: string;
  recommended_by: string;
  target_company_id: string;
  recommendation_type: RecommendationType;
  title: string;
  description: string | null;
  payload: Record<string, unknown>;
  status: RecommendationStatus;
  rejection_reason: string | null;
  accepted_at: string | null;
  accepted_by: string | null;
  converted_entity_type: string | null;
  converted_entity_id: string | null;
  created_at: string;
  updated_at: string;
}

// ==========================================
// COACHING ORG SETTINGS
// ==========================================
export function useCoachingOrgSettings() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["coaching-org-settings", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return null;
      const { data, error } = await supabase
        .from("coaching_org_settings")
        .select("*")
        .eq("company_id", activeCompanyId)
        .maybeSingle();
      if (error) throw error;
      return data as CoachingOrgSettings | null;
    },
    enabled: !!activeCompanyId,
  });
}

export function useCoachingOrgSettingsMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const upsertSettings = useMutation({
    mutationFn: async (settings: Partial<CoachingOrgSettings>) => {
      if (!activeCompanyId) throw new Error("No company selected");
      const { data, error } = await supabase
        .from("coaching_org_settings")
        .upsert({ company_id: activeCompanyId, ...settings })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-org-settings"] });
      toast.success("Settings saved");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  return { upsertSettings };
}

// ==========================================
// COACH PROFILES (Internal to coaching org)
// ==========================================
export function useCoachingCoachProfiles() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["coaching-coach-profiles", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("coaching_coach_profiles")
        .select("*")
        .eq("company_id", activeCompanyId)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as CoachingCoachProfile[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useMyCoachProfile() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["my-coach-profile", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("coaching_coach_profiles")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("user_id", user.id)
        .is("archived_at", null)
        .maybeSingle();
      if (error) throw error;
      return data as CoachingCoachProfile | null;
    },
    enabled: !!activeCompanyId,
  });
}

export function useCoachProfileMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const createProfile = useMutation({
    mutationFn: async (profile: Omit<CoachingCoachProfile, "id" | "created_at" | "updated_at" | "archived_at">) => {
      const { data, error } = await supabase
        .from("coaching_coach_profiles")
        .insert(profile)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-coach-profiles"] });
      toast.success("Coach profile created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create profile: ${error.message}`);
    },
  });

  const updateProfile = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CoachingCoachProfile> }) => {
      const { data, error } = await supabase
        .from("coaching_coach_profiles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-coach-profiles"] });
      toast.success("Coach profile updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  const archiveProfile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("coaching_coach_profiles")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-coach-profiles"] });
      toast.success("Coach profile archived");
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive profile: ${error.message}`);
    },
  });

  return { createProfile, updateProfile, archiveProfile };
}

// ==========================================
// ENGAGEMENTS
// ==========================================
export function useCoachingEngagements() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["coaching-engagements", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      
      // Fetch engagements where this company is either the coaching org or the client
      const { data, error } = await supabase
        .from("coaching_engagements")
        .select(`
          *,
          coaching_org:companies!coaching_engagements_coaching_org_company_id_fkey(id, name),
          client:companies!coaching_engagements_client_company_id_fkey(id, name),
          framework:frameworks(id, name)
        `)
        .or(`coaching_org_company_id.eq.${activeCompanyId},client_company_id.eq.${activeCompanyId}`)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompanyId,
  });
}

export function useMyAssignedEngagements() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["my-assigned-engagements", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("coach_assignments")
        .select(`
          *,
          engagement:coaching_engagements(
            *,
            client:companies!coaching_engagements_client_company_id_fkey(id, name),
            framework:frameworks(id, name)
          )
        `)
        .eq("coach_user_id", user.id)
        .is("archived_at", null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompanyId,
  });
}

export function useEngagementMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const createEngagement = useMutation({
    mutationFn: async (engagement: {
      client_company_id: string;
      start_date?: string;
      notes?: string;
    }) => {
      if (!activeCompanyId) throw new Error("No company selected");
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("coaching_engagements")
        .insert({
          coaching_org_company_id: activeCompanyId,
          client_company_id: engagement.client_company_id,
          start_date: engagement.start_date,
          notes: engagement.notes,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-engagements"] });
      toast.success("Engagement created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create engagement: ${error.message}`);
    },
  });

  const updateEngagement = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CoachingEngagement> }) => {
      const { data, error } = await supabase
        .from("coaching_engagements")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-engagements"] });
      toast.success("Engagement updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update engagement: ${error.message}`);
    },
  });

  const archiveEngagement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("coaching_engagements")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-engagements"] });
      toast.success("Engagement archived");
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive engagement: ${error.message}`);
    },
  });

  return { createEngagement, updateEngagement, archiveEngagement };
}

// ==========================================
// COACH ASSIGNMENTS
// ==========================================
export function useCoachAssignments(engagementId: string | null) {
  return useQuery({
    queryKey: ["coach-assignments", engagementId],
    queryFn: async () => {
      if (!engagementId) return [];
      const { data, error } = await supabase
        .from("coach_assignments")
        .select(`
          *,
          coach:coaching_coach_profiles!coach_assignments_coach_user_id_fkey(
            id, user_id, coach_role, specialties, bio
          )
        `)
        .eq("engagement_id", engagementId)
        .is("archived_at", null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!engagementId,
  });
}

export function useAssignmentMutations() {
  const queryClient = useQueryClient();

  const assignCoach = useMutation({
    mutationFn: async (assignment: {
      engagement_id: string;
      coach_user_id: string;
      assignment_role: CoachAssignmentRole;
    }) => {
      const { data, error } = await supabase
        .from("coach_assignments")
        .insert(assignment)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["coach-assignments", variables.engagement_id] });
      toast.success("Coach assigned");
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign coach: ${error.message}`);
    },
  });

  const updateAssignment = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CoachAssignment> }) => {
      const { data, error } = await supabase
        .from("coach_assignments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-assignments"] });
      toast.success("Assignment updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update assignment: ${error.message}`);
    },
  });

  const removeAssignment = useMutation({
    mutationFn: async ({ id, engagementId }: { id: string; engagementId: string }) => {
      const { error } = await supabase
        .from("coach_assignments")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return engagementId;
    },
    onSuccess: (engagementId) => {
      queryClient.invalidateQueries({ queryKey: ["coach-assignments", engagementId] });
      toast.success("Assignment removed");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove assignment: ${error.message}`);
    },
  });

  return { assignCoach, updateAssignment, removeAssignment };
}

// ==========================================
// RECOMMENDATIONS
// ==========================================
export function useCoachRecommendations(engagementId?: string, targetCompanyId?: string) {
  return useQuery({
    queryKey: ["coach-recommendations", engagementId, targetCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("coach_recommendations")
        .select("*")
        .order("created_at", { ascending: false });

      if (engagementId) {
        query = query.eq("engagement_id", engagementId);
      }
      if (targetCompanyId) {
        query = query.eq("target_company_id", targetCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CoachRecommendation[];
    },
    enabled: !!engagementId || !!targetCompanyId,
  });
}

export function usePendingRecommendations() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["pending-recommendations", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("coach_recommendations")
        .select(`
          *,
          engagement:coaching_engagements(
            coaching_org:companies!coaching_engagements_coaching_org_company_id_fkey(id, name)
          )
        `)
        .eq("target_company_id", activeCompanyId)
        .eq("status", "proposed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompanyId,
  });
}

export function useRecommendationMutations() {
  const queryClient = useQueryClient();

  const createRecommendation = useMutation({
    mutationFn: async (recommendation: {
      engagement_id: string;
      target_company_id: string;
      recommendation_type: RecommendationType;
      title: string;
      description?: string;
      payload?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("coach_recommendations")
        .insert({
          engagement_id: recommendation.engagement_id,
          target_company_id: recommendation.target_company_id,
          recommendation_type: recommendation.recommendation_type,
          title: recommendation.title,
          description: recommendation.description,
          payload: recommendation.payload as Json | null,
          recommended_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["coach-recommendations", variables.engagement_id] });
      toast.success("Recommendation sent");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create recommendation: ${error.message}`);
    },
  });

  const acceptRecommendation = useMutation({
    mutationFn: async ({ id, convertedEntityType, convertedEntityId }: {
      id: string;
      convertedEntityType: string;
      convertedEntityId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("coach_recommendations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          accepted_by: user?.id,
          converted_entity_type: convertedEntityType,
          converted_entity_id: convertedEntityId,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["pending-recommendations"] });
      toast.success("Recommendation accepted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to accept recommendation: ${error.message}`);
    },
  });

  const rejectRecommendation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data, error } = await supabase
        .from("coach_recommendations")
        .update({
          status: "rejected",
          rejection_reason: reason,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["pending-recommendations"] });
      toast.success("Recommendation rejected");
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject recommendation: ${error.message}`);
    },
  });

  return { createRecommendation, acceptRecommendation, rejectRecommendation };
}
