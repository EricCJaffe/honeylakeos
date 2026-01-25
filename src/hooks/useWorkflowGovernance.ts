import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { toast } from "sonner";

/**
 * Check if a workflow has active runs
 */
export function useWorkflowActiveRuns(workflowId: string | undefined) {
  return useQuery({
    queryKey: ["wf-workflow-active-runs", workflowId],
    queryFn: async () => {
      if (!workflowId) return { hasActiveRuns: false, count: 0 };

      const { data, error, count } = await supabase
        .from("wf_workflow_runs")
        .select("id", { count: "exact", head: true })
        .eq("workflow_id", workflowId)
        .in("status", ["running"]);

      if (error) throw error;
      return { hasActiveRuns: (count ?? 0) > 0, count: count ?? 0 };
    },
    enabled: !!workflowId,
  });
}

/**
 * Check if a workflow step has active step runs
 */
export function useStepActiveRuns(stepId: string | undefined) {
  return useQuery({
    queryKey: ["wf-step-active-runs", stepId],
    queryFn: async () => {
      if (!stepId) return { hasActiveRuns: false, count: 0 };

      const { data, error, count } = await supabase
        .from("wf_workflow_step_runs")
        .select("id", { count: "exact", head: true })
        .eq("step_id", stepId)
        .in("status", ["pending", "in_progress"]);

      if (error) throw error;
      return { hasActiveRuns: (count ?? 0) > 0, count: count ?? 0 };
    },
    enabled: !!stepId,
  });
}

/**
 * Check if a form has submissions
 */
export function useFormSubmissionCount(formId: string | undefined) {
  return useQuery({
    queryKey: ["wf-form-submission-count", formId],
    queryFn: async () => {
      if (!formId) return { hasSubmissions: false, count: 0 };

      const { error, count } = await supabase
        .from("wf_form_submissions")
        .select("id", { count: "exact", head: true })
        .eq("form_id", formId);

      if (error) throw error;
      return { hasSubmissions: (count ?? 0) > 0, count: count ?? 0 };
    },
    enabled: !!formId,
  });
}

/**
 * Check if a form field has values
 */
export function useFieldHasValues(fieldId: string | undefined) {
  return useQuery({
    queryKey: ["wf-field-has-values", fieldId],
    queryFn: async () => {
      if (!fieldId) return { hasValues: false, count: 0 };

      const { error, count } = await supabase
        .from("wf_form_submission_values")
        .select("id", { count: "exact", head: true })
        .eq("field_id", fieldId);

      if (error) throw error;
      return { hasValues: (count ?? 0) > 0, count: count ?? 0 };
    },
    enabled: !!fieldId,
  });
}

/**
 * Cancel a workflow run with reason
 */
export function useCancelRunWithReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      runId,
      reason,
    }: {
      runId: string;
      reason: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("wf_workflow_runs")
        .update({
          status: "cancelled",
          cancellation_reason: reason,
          cancelled_by: user?.id,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wf-workflow-runs"] });
      queryClient.invalidateQueries({ queryKey: ["wf-workflow-run", data.id] });
      toast.success("Workflow run cancelled");
    },
    onError: (error) => {
      toast.error("Failed to cancel run: " + error.message);
    },
  });
}

/**
 * Skip a step with reason
 */
export function useSkipStepWithReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      stepRunId,
      reason,
    }: {
      stepRunId: string;
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from("wf_workflow_step_runs")
        .update({
          status: "skipped",
          skip_reason: reason,
          completed_at: new Date().toISOString(),
        })
        .eq("id", stepRunId)
        .select("*, run:wf_workflow_runs(*)")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-workflow-runs"] });
      queryClient.invalidateQueries({ queryKey: ["wf-workflow-run"] });
      queryClient.invalidateQueries({ queryKey: ["wf-my-work-items"] });
      toast.success("Step skipped");
    },
    onError: (error) => {
      toast.error("Failed to skip step: " + error.message);
    },
  });
}

/**
 * Reassign a step to a different user
 */
export function useReassignStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      stepRunId,
      newUserId,
      previousUserId,
    }: {
      stepRunId: string;
      newUserId: string;
      previousUserId: string | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("wf_workflow_step_runs")
        .update({
          assigned_to_user_id: newUserId,
          reassigned_by: user?.id,
          reassigned_from_user_id: previousUserId,
        })
        .eq("id", stepRunId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-workflow-runs"] });
      queryClient.invalidateQueries({ queryKey: ["wf-workflow-run"] });
      queryClient.invalidateQueries({ queryKey: ["wf-my-work-items"] });
      toast.success("Step reassigned");
    },
    onError: (error) => {
      toast.error("Failed to reassign step: " + error.message);
    },
  });
}
