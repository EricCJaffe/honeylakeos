import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Types
export interface HealthCheckTemplate {
  id: string;
  coaching_org_id: string;
  name: string;
  subject_type: string;
  cadence: string;
  status: string;
  questions?: HealthCheckTemplateQuestion[];
}

export interface HealthCheckTemplateQuestion {
  id: string;
  template_id: string;
  question_order: number;
  question_text: string;
  response_type: string;
  is_required: boolean;
}

export interface HealthCheckTemplatePartial {
  id: string;
  name: string;
  subject_type: string;
}

export interface HealthCheck {
  id: string;
  coaching_engagement_id: string;
  template_id?: string;
  subject_type: string;
  assessment_period: string;
  status: string;
  period_start?: string;
  period_end?: string;
  overall_score?: number;
  submitted_at?: string;
  created_at: string;
  responses?: HealthCheckResponse[];
  template?: HealthCheckTemplatePartial;
}

export interface HealthCheckResponse {
  id: string;
  coaching_health_check_id: string;
  template_question_id?: string;
  question: string;
  numeric_value?: number;
  text_value?: string;
  bool_value?: boolean;
}

export interface HealthCheckTrend {
  coaching_engagement_id: string;
  subject_type: string;
  period_start: string;
  overall_score: number;
  prior_overall_score?: number;
  delta?: number;
}

// Fetch health check templates for a coaching org
export function useHealthCheckTemplates(coachingOrgId?: string) {
  return useQuery({
    queryKey: ["health-check-templates", coachingOrgId],
    queryFn: async () => {
      if (!coachingOrgId) return [];
      
      const { data, error } = await supabase
        .from("coaching_health_check_templates")
        .select(`
          *,
          questions:coaching_health_check_template_questions(*)
        `)
        .eq("coaching_org_id", coachingOrgId)
        .eq("status", "active")
        .order("name");
      
      if (error) throw error;
      return (data || []) as HealthCheckTemplate[];
    },
    enabled: !!coachingOrgId,
  });
}

// Fetch health checks for an engagement
export function useEngagementHealthChecks(engagementId?: string) {
  return useQuery({
    queryKey: ["engagement-health-checks", engagementId],
    queryFn: async () => {
      if (!engagementId) return [];
      
      const { data, error } = await supabase
        .from("coaching_health_checks")
        .select(`
          *,
          template:coaching_health_check_templates(id, name, subject_type),
          responses:coaching_health_check_responses(*)
        `)
        .eq("coaching_engagement_id", engagementId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data || []) as HealthCheck[];
    },
    enabled: !!engagementId,
  });
}

// Fetch health check trends for an engagement
export function useHealthCheckTrends(engagementId?: string) {
  return useQuery({
    queryKey: ["health-check-trends", engagementId],
    queryFn: async () => {
      if (!engagementId) return [];
      
      const { data, error } = await supabase
        .from("v_health_check_trend_delta")
        .select("*")
        .eq("coaching_engagement_id", engagementId);
      
      if (error) throw error;
      return (data || []) as HealthCheckTrend[];
    },
    enabled: !!engagementId,
  });
}

// Create a new health check
export function useCreateHealthCheck() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      engagementId: string;
      templateId?: string;
      subjectType: string;
      assessmentPeriod: string;
      periodStart?: string;
      periodEnd?: string;
    }) => {
      const { data, error } = await supabase
        .from("coaching_health_checks")
        .insert({
          coaching_engagement_id: params.engagementId,
          template_id: params.templateId,
          subject_type: params.subjectType as "leader" | "organization" | "team",
          assessment_period: params.assessmentPeriod as "quarterly" | "annual" | "ad_hoc",
          period_start: params.periodStart,
          period_end: params.periodEnd,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["engagement-health-checks", variables.engagementId] });
      toast({ title: "Health check created" });
    },
    onError: (error) => {
      toast({ title: "Failed to create health check", description: error.message, variant: "destructive" });
    },
  });
}

// Submit health check responses
export function useSubmitHealthCheckResponses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      healthCheckId: string;
      engagementId: string;
      responses: Array<{
        templateQuestionId?: string;
        question: string;
        numericValue?: number;
        textValue?: string;
        boolValue?: boolean;
      }>;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Insert responses
      for (const response of params.responses) {
        await supabase.from("coaching_health_check_responses").insert({
          coaching_health_check_id: params.healthCheckId,
          template_question_id: response.templateQuestionId,
          question: response.question,
          numeric_value: response.numericValue,
          text_value: response.textValue,
          bool_value: response.boolValue,
        });
      }

      // Update health check status to submitted
      const { error } = await supabase
        .from("coaching_health_checks")
        .update({
          status: "submitted",
          submitted_by_user_id: user.user.id,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", params.healthCheckId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["engagement-health-checks", variables.engagementId] });
      queryClient.invalidateQueries({ queryKey: ["health-check-trends", variables.engagementId] });
      toast({ title: "Health check submitted" });
    },
    onError: (error) => {
      toast({ title: "Failed to submit health check", description: error.message, variant: "destructive" });
    },
  });
}

// Fetch goal completion rates
export function useGoalCompletionRates(engagementId?: string) {
  return useQuery({
    queryKey: ["goal-completion-rates", engagementId],
    queryFn: async () => {
      if (!engagementId) return [];
      
      const { data, error } = await supabase
        .from("v_goal_completion_rate")
        .select("*")
        .eq("coaching_engagement_id", engagementId)
        .order("period_start", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!engagementId,
  });
}

// Complete a goal
export function useCompleteGoal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { goalId: string; engagementId: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("coaching_goals")
        .update({
          status: "achieved",
          completed_at: new Date().toISOString(),
          completed_by_user_id: user.user.id,
        })
        .eq("id", params.goalId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["coaching-plans"] });
      queryClient.invalidateQueries({ queryKey: ["goal-completion-rates", variables.engagementId] });
      toast({ title: "Goal completed!" });
    },
    onError: (error) => {
      toast({ title: "Failed to complete goal", description: error.message, variant: "destructive" });
    },
  });
}

// Fetch org scorecard rollup
export function useOrgScorecardRollup(coachingOrgId?: string) {
  return useQuery({
    queryKey: ["org-scorecard-rollup", coachingOrgId],
    queryFn: async () => {
      if (!coachingOrgId) return [];
      
      const { data, error } = await supabase
        .from("v_org_scorecard_rollup")
        .select("*")
        .eq("coaching_org_id", coachingOrgId)
        .order("period_start", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!coachingOrgId,
  });
}
