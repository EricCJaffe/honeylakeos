import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";

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

export type DateFilter = "30d" | "90d" | "6mo" | "12mo" | "all" | "custom";
export type DateRangeFilter = { start: string; end: string };

export type ExitSurveyAlertComment = {
  id: string;
  alert_id: string;
  author_id: string | null;
  author_name: string | null;
  comment: string;
  created_at: string;
};

export type ExitSurveyEmailTemplate = {
  id: string;
  company_id: string;
  trigger_key: string;
  name: string;
  description: string | null;
  subject_template: string;
  html_template: string;
  text_template: string | null;
  variables: string[] | null;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
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

export function useExitSurveyAlerts(
  status?: ExitSurveyAlert["status"],
  filters?: { createdAtRange?: DateRangeFilter | null }
) {
  const { activeCompanyId } = useMembership();
  const createdAtRange = filters?.createdAtRange ?? null;

  return useQuery({
    queryKey: ["exit-survey-alerts", activeCompanyId, status, createdAtRange?.start ?? null, createdAtRange?.end ?? null],
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
      if (createdAtRange?.start) {
        query = query.gte("created_at", createdAtRange.start);
      }
      if (createdAtRange?.end) {
        query = query.lte("created_at", createdAtRange.end);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompanyId,
  });
}

export function useExitSurveySubmissionAlerts(submissionId: string | null) {
  return useQuery({
    queryKey: ["exit-survey-submission-alerts", submissionId],
    queryFn: async () => {
      if (!submissionId) return [];
      const { data, error } = await supabase
        .from("exit_survey_alerts")
        .select("*, exit_survey_questions(text, category, department, owner_name)")
        .eq("submission_id", submissionId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!submissionId,
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

export function useExitSurveyEmailTemplates() {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["exit-survey-email-templates", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("exit_survey_email_templates")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as ExitSurveyEmailTemplate[];
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

export function useExitSurveyKPIs(dateFilter: DateFilter = "30d", customRange?: DateRangeFilter | null) {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["exit-survey-kpis", activeCompanyId, dateFilter, customRange?.start ?? null, customRange?.end ?? null],
    queryFn: async () => {
      if (!activeCompanyId) return null;

      let query = supabase
        .from("exit_survey_submissions")
        .select("overall_average, kpi_avg")
        .eq("company_id", activeCompanyId);

      if (dateFilter === "custom" && customRange?.start && customRange?.end) {
        query = query
          .gte("submitted_at", customRange.start)
          .lte("submitted_at", customRange.end);
      } else if (dateFilter !== "all") {
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
    enabled: !!activeCompanyId && (dateFilter !== "custom" || (!!customRange?.start && !!customRange?.end)),
  });
}

// ============================================================
// Mutation hooks
// ============================================================

export function useExitSurveyMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useMembership();
  const { toast } = useToast();
  const { log: auditLog } = useAuditLog(activeCompanyId);

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

      await auditLog("exit_survey.alert_status_updated", "exit_survey_alert", alertId, {
        status,
        has_notes: Boolean(notes),
      });
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

      await auditLog("exit_survey.question_updated", "exit_survey_question", questionId, {
        changed_fields: Object.keys(updates),
      });
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
        .upsert(
          {
            company_id: activeCompanyId,
            key,
            value,
            category: "settings",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id,key" }
        );
      if (error) throw error;

      await auditLog("exit_survey.settings_updated", "exit_survey_setting", activeCompanyId, {
        key,
        value,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exit-survey-settings", activeCompanyId] });
      toast({ title: "Settings saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save settings", description: err.message, variant: "destructive" });
    },
  });

  const saveSettingsBatch = useMutation({
    mutationFn: async (items: Array<{ key: string; value: string; category?: string | null }>) => {
      if (!activeCompanyId) throw new Error("No active company");
      if (!items.length) return;

      const now = new Date().toISOString();
      const payload = items.map((item) => ({
        company_id: activeCompanyId,
        key: item.key,
        value: item.value,
        category: item.category ?? "automation",
        updated_at: now,
      }));

      const { error } = await supabase
        .from("exit_survey_settings")
        .upsert(payload, { onConflict: "company_id,key" });
      if (error) throw error;

      await auditLog("exit_survey.settings_batch_saved", "exit_survey_setting", activeCompanyId, {
        keys: items.map((item) => item.key),
        count: items.length,
      });
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

      await auditLog("exit_survey.alert_comment_added", "exit_survey_alert", alertId, {
        comment_length: comment.length,
      });
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

      await auditLog("exit_survey.alert_assigned", "exit_survey_alert", alertId, {
        assigned_to: assignedTo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exit-survey-alerts"] });
      toast({ title: "Assignee updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update assignee", description: err.message, variant: "destructive" });
    },
  });

  const upsertEmailTemplate = useMutation({
    mutationFn: async (input: {
      id?: string;
      trigger_key: string;
      name: string;
      description?: string | null;
      subject_template: string;
      html_template: string;
      text_template?: string | null;
      variables?: string[] | null;
      is_active?: boolean;
      is_system?: boolean;
    }) => {
      if (!activeCompanyId) throw new Error("No active company");
      const payload = {
        company_id: activeCompanyId,
        trigger_key: input.trigger_key,
        name: input.name,
        description: input.description ?? null,
        subject_template: input.subject_template,
        html_template: input.html_template,
        text_template: input.text_template ?? null,
        variables: input.variables ?? [],
        is_active: input.is_active ?? true,
        is_system: input.is_system ?? false,
      };

      if (input.id) {
        const { data, error } = await supabase
          .from("exit_survey_email_templates")
          .update(payload)
          .eq("id", input.id)
          .select("id, trigger_key, name")
          .single();
        if (error) throw error;

        await auditLog("exit_survey.email_template_updated", "exit_survey_email_template", input.id, {
          trigger_key: data?.trigger_key ?? input.trigger_key,
          name: data?.name ?? input.name,
          changed_fields: Object.keys(input),
        });
        return;
      }

      const { data, error } = await supabase
        .from("exit_survey_email_templates")
        .insert(payload)
        .select("id, trigger_key, name")
        .single();
      if (error) throw error;

      await auditLog("exit_survey.email_template_created", "exit_survey_email_template", data.id, {
        trigger_key: data.trigger_key,
        name: data.name,
        is_system: payload.is_system,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exit-survey-email-templates", activeCompanyId] });
      toast({ title: "Email template saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save email template", description: err.message, variant: "destructive" });
    },
  });

  const deleteEmailTemplate = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data: template, error: fetchError } = await supabase
        .from("exit_survey_email_templates")
        .select("id, trigger_key, name")
        .eq("id", id)
        .single();
      if (fetchError) throw fetchError;

      const { error } = await supabase.from("exit_survey_email_templates").delete().eq("id", id);
      if (error) throw error;

      await auditLog("exit_survey.email_template_deleted", "exit_survey_email_template", id, {
        trigger_key: template.trigger_key,
        name: template.name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exit-survey-email-templates", activeCompanyId] });
      toast({ title: "Email template deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete email template", description: err.message, variant: "destructive" });
    },
  });

  const sendEmailTemplateTest = useMutation({
    mutationFn: async (input: {
      company_id: string;
      trigger_key: string;
      template_name?: string;
      to_email: string;
      subject_template: string;
      html_template: string;
      text_template?: string | null;
      sample_variables?: Record<string, string>;
    }) => {
      const { data, error } = await supabase.functions.invoke("exit-survey-send-test-email", {
        body: input,
      });
      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || "Failed to send test email");
      }

      await auditLog("exit_survey.email_test_sent", "exit_survey_email_template", input.company_id, {
        trigger_key: input.trigger_key,
        template_name: input.template_name ?? null,
        to_email: input.to_email,
      });
      return data;
    },
    onSuccess: () => {
      toast({ title: "Test email sent" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send test email", description: err.message, variant: "destructive" });
    },
  });

  const runAutomationTriggerTest = useMutation({
    mutationFn: async (input: { trigger: "weekly_digest" | "alert_reminder" | "all"; dryRun?: boolean }) => {
      if (!activeCompanyId) throw new Error("No active company");
      if (input.dryRun) {
        const { data, error } = await supabase.functions.invoke("exit-survey-scheduler", {
          body: {
            mode: input.trigger === "weekly_digest" ? "weekly" : input.trigger === "alert_reminder" ? "reminders" : "all",
            company_ids: [activeCompanyId],
            dry_run: true,
          },
        });
        if (error) throw error;
        if (data?.success === false) throw new Error(data?.error || "Scheduler dry-run failed");
        return data;
      }

      if (input.trigger === "weekly_digest" || input.trigger === "all") {
        const { data, error } = await supabase.functions.invoke("exit-survey-weekly-digest", {
          body: { company_id: activeCompanyId },
        });
        if (error) throw error;
        if (data?.success === false) throw new Error(data?.error || "Weekly digest test failed");
      }

      if (input.trigger === "alert_reminder" || input.trigger === "all") {
        const { data, error } = await supabase.functions.invoke("exit-survey-reminders", {
          body: { company_id: activeCompanyId },
        });
        if (error) throw error;
        if (data?.success === false) throw new Error(data?.error || "Reminder test failed");
      }

      await auditLog("exit_survey.automation_test_triggered", "exit_survey_setting", activeCompanyId, {
        trigger: input.trigger,
        dry_run: Boolean(input.dryRun),
      });
    },
    onSuccess: (_data, variables) => {
      const label =
        variables.trigger === "weekly_digest"
          ? "Weekly Digest"
          : variables.trigger === "alert_reminder"
            ? "Follow-Up Reminder"
            : "All Triggers";
      toast({ title: `${label} test started` });
    },
    onError: (err: Error) => {
      toast({ title: "Automation test failed", description: err.message, variant: "destructive" });
    },
  });

  const runRetentionScan = useMutation({
    mutationFn: async (input: { dryRun?: boolean; apply?: boolean }) => {
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase.functions.invoke("exit-survey-retention", {
        body: {
          company_id: activeCompanyId,
          dry_run: input.dryRun ?? true,
          apply: input.apply ?? false,
        },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data?.error || "Retention scan failed");

      await auditLog("exit_survey.retention_scan_requested", "exit_survey_setting", activeCompanyId, {
        dry_run: input.dryRun ?? true,
        apply: input.apply ?? false,
      });
      return data;
    },
    onSuccess: (data) => {
      const scanned = Array.isArray(data?.companies) ? data.companies.length : 0;
      toast({ title: `Retention scan completed (${scanned} company scope)` });
    },
    onError: (err: Error) => {
      toast({ title: "Retention scan failed", description: err.message, variant: "destructive" });
    },
  });

  return {
    updateAlertStatus,
    updateQuestion,
    updateSettings,
    saveSettingsBatch,
    addAlertComment,
    assignAlert,
    upsertEmailTemplate,
    deleteEmailTemplate,
    sendEmailTemplateTest,
    runAutomationTriggerTest,
    runRetentionScan,
  };
}
