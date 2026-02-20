import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { useToast } from "@/hooks/use-toast";

// ============================================================
// Types
// ============================================================

export type ExitSurveyQuestion = {
  id: string;
  company_id: string;
  definition_id: string | null;
  question_number: number;
  text: string;
  category: string;
  type: "scored" | "open_ended";
  department: string | null;
  owner_name: string | null;
  owner_email: string | null;
  comment_threshold: number | null;
  is_active: boolean;
  display_order: number;
  version: number;
  created_at: string;
};

export type ExitSurveySubmission = {
  id: string;
  company_id: string;
  definition_id: string | null;
  submitted_at: string;
  patient_first_name: string | null;
  patient_last_name: string | null;
  overall_average: number | null;
  kpi_avg: number | null;
  admissions_avg: number | null;
  patient_services_avg: number | null;
  treatment_team_avg: number | null;
  treatment_program_avg: number | null;
  facility_avg: number | null;
  open_ended_improvement: string | null;
  open_ended_positive: string | null;
  psych_provider: string | null;
  primary_therapist: string | null;
  case_manager: string | null;
  pastor: string | null;
  is_anonymous: boolean;
  created_at: string;
};

export type ExitSurveyResponse = {
  id: string;
  submission_id: string;
  question_id: string;
  score: number | null;
  comment: string | null;
  created_at: string;
};

export type ExitSurveyAlert = {
  id: string;
  company_id: string;
  submission_id: string;
  question_id: string;
  score: number;
  status: "pending" | "acknowledged" | "reviewed" | "action_taken" | "resolved";
  priority: "high" | "normal" | "low";
  assigned_to: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  reviewed_at: string | null;
  resolution_notes: string | null;
  created_at: string;
};

export type ExitSurveyTrend = {
  id: string;
  company_id: string;
  question_id: string | null;
  period_type: string;
  period_label: string;
  avg_score: number | null;
  submission_count: number | null;
  score_1_pct: number | null;
  score_2_pct: number | null;
  score_3_pct: number | null;
  score_4_pct: number | null;
  score_5_pct: number | null;
  period_start: string | null;
  period_end: string | null;
  calculated_at: string;
};

export type ExitSurveySetting = {
  id: string;
  company_id: string;
  key: string;
  value: string | null;
  category: string | null;
  updated_at: string;
};

export type DateFilter = "30d" | "90d" | "6mo" | "12mo" | "all";

export type ExitSurveyAlertComment = {
  id: string;
  alert_id: string;
  author_id: string | null;
  author_name: string | null;
  comment: string;
  created_at: string;
};

// ============================================================
// Read hooks
// ============================================================

export function useActiveExitSurvey() {
  const { activeCompanyId } = useMembership();

  const definition = useQuery({
    queryKey: ["exit-survey-definition", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return null;
      const { data, error } = await supabase
        .from("exit_survey_definitions")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });

  const questions = useQuery({
    queryKey: ["exit-survey-questions", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("exit_survey_questions")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []) as ExitSurveyQuestion[];
    },
    enabled: !!activeCompanyId,
  });

  return { definition, questions };
}

export function useExitSurveySubmissions(
  filters: { dateFilter?: DateFilter; page?: number; pageSize?: number; search?: string } = {}
) {
  const { activeCompanyId } = useMembership();
  const { dateFilter = "all", page = 1, pageSize = 20, search = "" } = filters;

  return useQuery({
    queryKey: ["exit-survey-submissions", activeCompanyId, dateFilter, page, pageSize, search],
    queryFn: async () => {
      if (!activeCompanyId) return { data: [], count: 0 };

      let query = supabase
        .from("exit_survey_submissions")
        .select("*", { count: "exact" })
        .eq("company_id", activeCompanyId)
        .order("submitted_at", { ascending: false });

      // Date filter
      if (dateFilter !== "all") {
        const now = new Date();
        const cutoff = new Date(now);
        if (dateFilter === "30d") cutoff.setDate(now.getDate() - 30);
        else if (dateFilter === "90d") cutoff.setDate(now.getDate() - 90);
        else if (dateFilter === "6mo") cutoff.setMonth(now.getMonth() - 6);
        else if (dateFilter === "12mo") cutoff.setMonth(now.getMonth() - 12);
        query = query.gte("submitted_at", cutoff.toISOString());
      }

      // Search by name
      if (search.trim()) {
        query = query.or(
          `patient_first_name.ilike.%${search}%,patient_last_name.ilike.%${search}%`
        );
      }

      // Pagination
      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data || []) as ExitSurveySubmission[], count: count || 0 };
    },
    enabled: !!activeCompanyId,
  });
}

export function useExitSurveySubmissionDetail(submissionId: string | null) {
  return useQuery({
    queryKey: ["exit-survey-submission-detail", submissionId],
    queryFn: async () => {
      if (!submissionId) return null;
      const { data, error } = await supabase
        .from("exit_survey_responses")
        .select("*")
        .eq("submission_id", submissionId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as ExitSurveyResponse[];
    },
    enabled: !!submissionId,
  });
}

export function useExitSurveySubmission(submissionId: string | null) {
  return useQuery({
    queryKey: ["exit-survey-submission", submissionId],
    queryFn: async () => {
      if (!submissionId) return null;
      const { data, error } = await supabase
        .from("exit_survey_submissions")
        .select("*")
        .eq("id", submissionId)
        .single();
      if (error) throw error;
      return data as ExitSurveySubmission;
    },
    enabled: !!submissionId,
  });
}

export function useExitSurveyAlerts(status?: ExitSurveyAlert["status"]) {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["exit-survey-alerts", activeCompanyId, status],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      let query = supabase
        .from("exit_survey_alerts")
        .select("*, exit_survey_questions(text, category, department, owner_name), exit_survey_submissions(patient_first_name, patient_last_name, submitted_at)")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompanyId,
  });
}

export function useExitSurveyTrends(periodType: string = "monthly") {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["exit-survey-trends", activeCompanyId, periodType],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("exit_survey_trends")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("period_type", periodType)
        .order("period_label", { ascending: true });
      if (error) throw error;
      return (data || []) as ExitSurveyTrend[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useExitSurveySettings() {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["exit-survey-settings", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return {};
      const { data, error } = await supabase
        .from("exit_survey_settings")
        .select("*")
        .eq("company_id", activeCompanyId);
      if (error) throw error;
      // Return as key-value map
      return (data || []).reduce(
        (acc, row) => ({ ...acc, [row.key]: row.value }),
        {} as Record<string, string | null>
      );
    },
    enabled: !!activeCompanyId,
  });
}

export function useExitSurveyAlertComments(alertId: string | null) {
  return useQuery({
    queryKey: ["exit-survey-alert-comments", alertId],
    queryFn: async () => {
      if (!alertId) return [];
      const { data, error } = await supabase
        .from("exit_survey_alert_comments")
        .select("*")
        .eq("alert_id", alertId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as ExitSurveyAlertComment[];
    },
    enabled: !!alertId,
  });
}

// ============================================================
// KPI computed hook
// ============================================================

export function useExitSurveyKPIs(dateFilter: DateFilter = "30d") {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["exit-survey-kpis", activeCompanyId, dateFilter],
    queryFn: async () => {
      if (!activeCompanyId) return null;

      let query = supabase
        .from("exit_survey_submissions")
        .select("overall_average, kpi_avg")
        .eq("company_id", activeCompanyId);

      if (dateFilter !== "all") {
        const cutoff = new Date();
        if (dateFilter === "30d") cutoff.setDate(cutoff.getDate() - 30);
        else if (dateFilter === "90d") cutoff.setDate(cutoff.getDate() - 90);
        else if (dateFilter === "6mo") cutoff.setMonth(cutoff.getMonth() - 6);
        else if (dateFilter === "12mo") cutoff.setMonth(cutoff.getMonth() - 12);
        query = query.gte("submitted_at", cutoff.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const submissions = data || [];
      const count = submissions.length;
      if (count === 0) return { count: 0, overallAvg: null, feelBetterPct: null, recommendPct: null };

      const overallAvg =
        submissions.reduce((sum, s) => sum + (s.overall_average ?? 0), 0) / count;

      // KPI avg encodes Q1 (recommend) and Q2 (feel better)
      const kpiScores = submissions.filter((s) => s.kpi_avg !== null);
      const feelBetterPct = kpiScores.length
        ? Math.round((kpiScores.filter((s) => (s.kpi_avg ?? 0) >= 4).length / kpiScores.length) * 100)
        : null;
      const recommendPct = feelBetterPct; // same underlying KPI avg for now

      return { count, overallAvg: parseFloat(overallAvg.toFixed(2)), feelBetterPct, recommendPct };
    },
    enabled: !!activeCompanyId,
  });
}

// ============================================================
// Mutation hooks
// ============================================================

export function useExitSurveyMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useMembership();
  const { toast } = useToast();

  const updateAlertStatus = useMutation({
    mutationFn: async ({
      alertId,
      status,
      notes,
    }: {
      alertId: string;
      status: ExitSurveyAlert["status"];
      notes?: string;
    }) => {
      const updates: Record<string, unknown> = { status };
      if (notes !== undefined) updates.resolution_notes = notes;
      if (status === "acknowledged") updates.acknowledged_at = new Date().toISOString();
      if (status === "reviewed") updates.reviewed_at = new Date().toISOString();

      const { error } = await supabase
        .from("exit_survey_alerts")
        .update(updates)
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exit-survey-alerts"] });
      toast({ title: "Alert updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update alert", description: err.message, variant: "destructive" });
    },
  });

  const updateQuestion = useMutation({
    mutationFn: async ({
      questionId,
      updates,
    }: {
      questionId: string;
      updates: Partial<ExitSurveyQuestion>;
    }) => {
      const { error } = await supabase
        .from("exit_survey_questions")
        .update(updates)
        .eq("id", questionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exit-survey-questions", activeCompanyId] });
      toast({ title: "Question updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update question", description: err.message, variant: "destructive" });
    },
  });

  const updateSettings = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      if (!activeCompanyId) throw new Error("No active company");
      const { error } = await supabase
        .from("exit_survey_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("company_id", activeCompanyId)
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exit-survey-settings", activeCompanyId] });
      toast({ title: "Settings saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save settings", description: err.message, variant: "destructive" });
    },
  });

  const addAlertComment = useMutation({
    mutationFn: async ({
      alertId,
      comment,
      authorName,
    }: {
      alertId: string;
      comment: string;
      authorName?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("exit_survey_alert_comments")
        .insert({
          alert_id: alertId,
          comment,
          author_id: user?.id ?? null,
          author_name: authorName || user?.email || null,
        });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["exit-survey-alert-comments", variables.alertId] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add comment", description: err.message, variant: "destructive" });
    },
  });

  const assignAlert = useMutation({
    mutationFn: async ({ alertId, assignedTo }: { alertId: string; assignedTo: string | null }) => {
      const { error } = await supabase
        .from("exit_survey_alerts")
        .update({ assigned_to: assignedTo })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exit-survey-alerts"] });
      toast({ title: "Assignee updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update assignee", description: err.message, variant: "destructive" });
    },
  });

  return { updateAlertStatus, updateQuestion, updateSettings, addAlertComment, assignAlert };
}
