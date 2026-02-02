import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { logAuditEvent } from "./useAuditLog";
import { toast } from "sonner";

// ==========================================
// TYPES
// ==========================================

export interface PilotFlag {
  id: string;
  company_id: string;
  is_pilot: boolean;
  cohort_name: string | null;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  created_by: string | null;
}

export type ActivationEventKey =
  | "invited_user_accepted"
  | "created_first_task"
  | "created_first_task_list"
  | "created_first_project"
  | "created_first_note_or_doc"
  | "created_first_crm_record"
  | "ran_first_report"
  | "enabled_framework"
  | "completed_onboarding_checklist";

export interface ActivationEvent {
  id: string;
  company_id: string;
  user_id: string;
  event_key: ActivationEventKey;
  occurred_at: string;
  metadata_json: Record<string, unknown>;
}

export type FeedbackType = "bug" | "idea" | "confusion";
export type FeedbackSeverity = "low" | "medium" | "high";
export type FeedbackStatus = "open" | "triaged" | "done" | "dismissed";

export interface FeedbackItem {
  id: string;
  company_id: string;
  user_id: string;
  module_key: string | null;
  page_path: string | null;
  feedback_type: FeedbackType;
  message: string;
  severity: FeedbackSeverity;
  status: FeedbackStatus;
  triage_notes: string | null;
  triaged_by: string | null;
  triaged_at: string | null;
  created_at: string;
  // Joined data
  company?: { name: string };
  user?: { email: string };
}

// ==========================================
// ACTIVATION SCORE TYPES (v2)
// ==========================================

export interface ScoreCriterion {
  met: boolean;
  points: number;
  label: string;
  value?: number; // For numeric criteria like active_days
}

export interface ScoreSection {
  score: number;
  max: number;
  criteria: Record<string, ScoreCriterion>;
}

export interface ActivationScoreBreakdown {
  setup: ScoreSection;
  engagement: ScoreSection;
  value_signals: ScoreSection;
}

export interface ActivationScore {
  id: string;
  company_id: string;
  score: number;
  breakdown_json: ActivationScoreBreakdown;
  calculated_at: string;
  calculated_by: string;
}

export interface PilotCompanyStats {
  activation_score: number;
  score_breakdown: ActivationScoreBreakdown | null;
  score_calculated_at: string | null;
  active_users_7d: number;
  last_activity: string | null;
  milestones_achieved: string[];
  feedback_count: number;
  open_feedback_count: number;
}

export interface PilotCompany extends PilotFlag {
  company: { name: string };
  stats?: PilotCompanyStats;
}

// ==========================================
// SCORE DISPLAY HELPERS
// ==========================================

export type ScoreBand = "red" | "yellow" | "green";

export function getScoreBand(score: number): ScoreBand {
  if (score >= 70) return "green";
  if (score >= 40) return "yellow";
  return "red";
}

export function getScoreColor(score: number): string {
  const band = getScoreBand(score);
  switch (band) {
    case "green": return "text-green-600 dark:text-green-400";
    case "yellow": return "text-yellow-600 dark:text-yellow-400";
    case "red": return "text-red-600 dark:text-red-400";
  }
}

export function getScoreBgColor(score: number): string {
  const band = getScoreBand(score);
  switch (band) {
    case "green": return "bg-green-100 dark:bg-green-900/30";
    case "yellow": return "bg-yellow-100 dark:bg-yellow-900/30";
    case "red": return "bg-red-100 dark:bg-red-900/30";
  }
}

export function getScoreBorderColor(score: number): string {
  const band = getScoreBand(score);
  switch (band) {
    case "green": return "border-green-500";
    case "yellow": return "border-yellow-500";
    case "red": return "border-red-500";
  }
}

export const SECTION_LABELS: Record<keyof ActivationScoreBreakdown, { label: string; suggestion: string }> = {
  setup: { 
    label: "Setup", 
    suggestion: "Focus on initial configuration: invite team members, create task lists and projects." 
  },
  engagement: { 
    label: "Engagement", 
    suggestion: "Encourage regular usage: complete tasks, log in frequently with multiple users." 
  },
  value_signals: { 
    label: "Value Signals", 
    suggestion: "Unlock advanced features: run reports, use CRM/Donors/LMS, enable a framework." 
  },
};

// ==========================================
// PILOT FLAG HOOKS
// ==========================================

/**
 * Check if the active company is a pilot
 */
export function useIsPilot() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["is-pilot", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return false;

      const { data, error } = await supabase
        .from("pilot_flags")
        .select("is_pilot, ended_at")
        .eq("company_id", activeCompanyId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return false;
      
      // Check if pilot is active (not ended)
      if (data.ended_at && new Date(data.ended_at) < new Date()) {
        return false;
      }
      
      return data.is_pilot;
    },
    enabled: !!activeCompanyId,
  });
}

/**
 * Fetch all pilot companies (Site Admin only)
 */
export function usePilotCompanies() {
  return useQuery({
    queryKey: ["pilot-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pilot_flags")
        .select(`
          *,
          company:companies(name)
        `)
        .eq("is_pilot", true)
        .is("ended_at", null)
        .order("started_at", { ascending: false });

      if (error) throw error;

      // Fetch stats for each pilot company
      const companiesWithStats = await Promise.all(
        (data || []).map(async (pilot) => {
          const { data: stats } = await supabase.rpc("get_pilot_company_stats", {
            p_company_id: pilot.company_id,
          });
          return {
            ...pilot,
            stats: stats as unknown as PilotCompanyStats,
          } as PilotCompany;
        })
      );

      return companiesWithStats;
    },
  });
}

/**
 * Mutations for managing pilot flags (Site Admin only)
 */
export function usePilotFlagMutations() {
  const queryClient = useQueryClient();

  const enablePilot = useMutation({
    mutationFn: async ({
      companyId,
      cohortName,
      notes,
    }: {
      companyId: string;
      cohortName?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("pilot_flags")
        .upsert({
          company_id: companyId,
          is_pilot: true,
          cohort_name: cohortName,
          notes,
          created_by: user?.id,
          ended_at: null,
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        companyId,
        action: "pilot.enabled" as never,
        entityType: "company" as never,
        entityId: companyId,
        metadata: { cohortName },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pilot-companies"] });
      queryClient.invalidateQueries({ queryKey: ["is-pilot"] });
      toast.success("Pilot mode enabled");
    },
    onError: (error: Error) => {
      toast.error(`Failed to enable pilot: ${error.message}`);
    },
  });

  const disablePilot = useMutation({
    mutationFn: async (companyId: string) => {
      const { data, error } = await supabase
        .from("pilot_flags")
        .update({
          is_pilot: false,
          ended_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        companyId,
        action: "pilot.disabled" as never,
        entityType: "company" as never,
        entityId: companyId,
        metadata: {},
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pilot-companies"] });
      queryClient.invalidateQueries({ queryKey: ["is-pilot"] });
      toast.success("Pilot mode disabled");
    },
    onError: (error: Error) => {
      toast.error(`Failed to disable pilot: ${error.message}`);
    },
  });

  return { enablePilot, disablePilot };
}

// ==========================================
// ACTIVATION EVENTS HOOKS
// ==========================================

/**
 * Fetch activation events for a company
 */
export function useActivationEvents(companyId?: string) {
  const { activeCompanyId } = useActiveCompany();
  const targetCompanyId = companyId || activeCompanyId;

  return useQuery({
    queryKey: ["activation-events", targetCompanyId],
    queryFn: async () => {
      if (!targetCompanyId) return [];

      const { data, error } = await supabase
        .from("activation_events")
        .select("*")
        .eq("company_id", targetCompanyId)
        .order("occurred_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ActivationEvent[];
    },
    enabled: !!targetCompanyId,
  });
}

/**
 * Record an activation event
 */
export function useRecordActivation() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventKey,
      metadata = {},
    }: {
      eventKey: ActivationEventKey;
      metadata?: Record<string, unknown>;
    }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if this event already exists for this company (dedupe)
      const { data: existing } = await supabase
        .from("activation_events")
        .select("id")
        .eq("company_id", activeCompanyId)
        .eq("event_key", eventKey)
        .maybeSingle();

      if (existing) {
        // Already recorded, skip
        return null;
      }

      const { data, error } = await supabase
        .from("activation_events")
        .insert([{
          company_id: activeCompanyId,
          user_id: user.id,
          event_key: eventKey,
          metadata_json: metadata as never,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["activation-events", activeCompanyId] });
      }
    },
  });
}

/**
 * Hook to auto-track activation events based on actions
 */
export function useActivationTracker() {
  const { mutate: recordActivation } = useRecordActivation();

  const track = (eventKey: ActivationEventKey, metadata?: Record<string, unknown>) => {
    recordActivation({ eventKey, metadata });
  };

  return { track };
}

// ==========================================
// FEEDBACK HOOKS
// ==========================================

/**
 * Fetch feedback items (with filters)
 */
export function useFeedbackItems(filters?: {
  companyId?: string;
  status?: FeedbackStatus;
  feedbackType?: FeedbackType;
  moduleKey?: string;
}) {
  return useQuery({
    queryKey: ["feedback-items", filters],
    queryFn: async () => {
      let query = supabase
        .from("feedback_items")
        .select(`
          *,
          company:companies(name)
        `)
        .order("created_at", { ascending: false });

      if (filters?.companyId) {
        query = query.eq("company_id", filters.companyId);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.feedbackType) {
        query = query.eq("feedback_type", filters.feedbackType);
      }
      if (filters?.moduleKey) {
        query = query.eq("module_key", filters.moduleKey);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return (data || []) as FeedbackItem[];
    },
  });
}

/**
 * Submit feedback
 */
export function useSubmitFeedback() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  // Rate limiting - track last submission time
  let lastSubmission = 0;

  return useMutation({
    mutationFn: async ({
      feedbackType,
      message,
      severity = "medium",
      moduleKey,
      pagePath,
    }: {
      feedbackType: FeedbackType;
      message: string;
      severity?: FeedbackSeverity;
      moduleKey?: string;
      pagePath?: string;
    }) => {
      if (!activeCompanyId) throw new Error("No active company");

      // Rate limit: 1 submission per 30 seconds
      const now = Date.now();
      if (now - lastSubmission < 30000) {
        throw new Error("Please wait before submitting more feedback");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("feedback_items")
        .insert([{
          company_id: activeCompanyId,
          user_id: user.id,
          feedback_type: feedbackType,
          message,
          severity,
          module_key: moduleKey,
          page_path: pagePath,
        }])
        .select()
        .single();

      if (error) throw error;

      lastSubmission = now;

      await logAuditEvent({
        companyId: activeCompanyId,
        action: "feedback.submitted" as never,
        entityType: "feedback" as never,
        entityId: data.id,
        metadata: { feedbackType, severity, moduleKey },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-items"] });
      toast.success("Thank you for your feedback!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Triage feedback (Site Admin only)
 */
export function useTriageFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      feedbackId,
      companyId,
      status,
      triageNotes,
    }: {
      feedbackId: string;
      companyId: string;
      status: FeedbackStatus;
      triageNotes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("feedback_items")
        .update({
          status,
          triage_notes: triageNotes,
          triaged_by: user?.id,
          triaged_at: new Date().toISOString(),
        })
        .eq("id", feedbackId)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        companyId,
        action: "feedback.status_changed" as never,
        entityType: "feedback" as never,
        entityId: feedbackId,
        metadata: { status, triageNotes },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-items"] });
      toast.success("Feedback updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update feedback: ${error.message}`);
    },
  });
}

// ==========================================
// ACTIVATION MILESTONE HELPERS (Legacy)
// ==========================================

export const ACTIVATION_MILESTONES: Record<ActivationEventKey, { label: string; points: number }> = {
  invited_user_accepted: { label: "Invited a team member", points: 10 },
  created_first_task: { label: "Created first task", points: 10 },
  created_first_task_list: { label: "Created first task list", points: 10 },
  created_first_project: { label: "Created first project", points: 15 },
  created_first_note_or_doc: { label: "Created first note or document", points: 10 },
  created_first_crm_record: { label: "Added first CRM record", points: 15 },
  ran_first_report: { label: "Ran first report", points: 10 },
  enabled_framework: { label: "Enabled a framework", points: 15 },
  completed_onboarding_checklist: { label: "Completed onboarding", points: 5 },
};

/**
 * Calculate detailed activation progress (Legacy - kept for backwards compatibility)
 */
export function useActivationProgress() {
  const { data: events = [], isLoading } = useActivationEvents();

  const achievedKeys = new Set(events.map((e) => e.event_key));
  const totalMilestones = Object.keys(ACTIVATION_MILESTONES).length;
  const achievedCount = achievedKeys.size;
  
  const milestones = Object.entries(ACTIVATION_MILESTONES).map(([key, info]) => ({
    key: key as ActivationEventKey,
    ...info,
    achieved: achievedKeys.has(key as ActivationEventKey),
    achievedAt: events.find((e) => e.event_key === key)?.occurred_at,
  }));

  const score = milestones
    .filter((m) => m.achieved)
    .reduce((sum, m) => sum + m.points, 0);

  const maxScore = milestones.reduce((sum, m) => sum + m.points, 0);

  return {
    isLoading,
    milestones,
    achievedCount,
    totalMilestones,
    score,
    maxScore,
    percentage: Math.round((achievedCount / totalMilestones) * 100),
  };
}

// ==========================================
// ACTIVATION SCORE HOOKS (v2)
// ==========================================

/**
 * Fetch the stored activation score for a company
 */
export function useActivationScore(companyId?: string) {
  const { activeCompanyId } = useActiveCompany();
  const targetCompanyId = companyId || activeCompanyId;

  return useQuery({
    queryKey: ["activation-score", targetCompanyId],
    queryFn: async () => {
      if (!targetCompanyId) return null;

      const { data, error } = await supabase
        .from("activation_scores")
        .select("*")
        .eq("company_id", targetCompanyId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        breakdown_json: data.breakdown_json as unknown as ActivationScoreBreakdown,
      } as ActivationScore;
    },
    enabled: !!targetCompanyId,
  });
}

/**
 * Calculate activation score on-demand (without storing)
 */
export function useCalculateActivationScore() {
  const { activeCompanyId } = useActiveCompany();

  return useMutation({
    mutationFn: async (companyId?: string) => {
      const targetCompanyId = companyId || activeCompanyId;
      if (!targetCompanyId) throw new Error("No company ID");

      const { data, error } = await supabase.rpc("calculate_activation_score", {
        p_company_id: targetCompanyId,
      });

      if (error) throw error;
      return data as unknown as { score: number; breakdown: ActivationScoreBreakdown; calculated_at: string };
    },
  });
}

/**
 * Compute and store activation score
 */
export function useComputeAndStoreScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, calculatedBy }: { companyId: string; calculatedBy?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc("compute_and_store_activation_score", {
        p_company_id: companyId,
        p_calculated_by: calculatedBy || user?.id || "system",
      });

      if (error) throw error;
      return data as unknown as { score: number; breakdown: ActivationScoreBreakdown; calculated_at: string };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["activation-score", variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ["pilot-companies"] });
      toast.success("Activation score calculated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to calculate score: ${error.message}`);
    },
  });
}

/**
 * Recalculate all pilot company scores (Site Admin)
 */
export function useRecalculateAllPilotScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("recalculate_all_pilot_scores");
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["activation-score"] });
      queryClient.invalidateQueries({ queryKey: ["pilot-companies"] });
      toast.success(`Recalculated scores for ${count} pilot companies`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to recalculate scores: ${error.message}`);
    },
  });
}

/**
 * Get the lowest-scoring section for coaching focus
 */
export function getLowestScoringSection(breakdown: ActivationScoreBreakdown | null): keyof ActivationScoreBreakdown | null {
  if (!breakdown) return null;

  const sections = Object.entries(breakdown) as [keyof ActivationScoreBreakdown, ScoreSection][];
  
  // Find section with lowest percentage (score/max)
  let lowest: keyof ActivationScoreBreakdown | null = null;
  let lowestPercentage = 1;

  for (const [key, section] of sections) {
    const percentage = section.max > 0 ? section.score / section.max : 1;
    if (percentage < lowestPercentage) {
      lowestPercentage = percentage;
      lowest = key;
    }
  }

  return lowest;
}

/**
 * Get coaching suggestions based on unmet criteria
 */
export function getCoachingSuggestions(breakdown: ActivationScoreBreakdown | null): string[] {
  if (!breakdown) return [];

  const suggestions: string[] = [];

  // Check each section
  for (const [sectionKey, section] of Object.entries(breakdown) as [keyof ActivationScoreBreakdown, ScoreSection][]) {
    const sectionInfo = SECTION_LABELS[sectionKey];
    const unmetCriteria = Object.values(section.criteria).filter(c => !c.met);
    
    if (unmetCriteria.length > 0 && section.score < section.max) {
      suggestions.push(sectionInfo.suggestion);
    }
  }

  return suggestions;
}
