import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type WfWorkflow = Database["public"]["Tables"]["wf_workflows"]["Row"];
type WfWorkflowInsert = Database["public"]["Tables"]["wf_workflows"]["Insert"];
type WfWorkflowUpdate = Database["public"]["Tables"]["wf_workflows"]["Update"];
type WfWorkflowStep = Database["public"]["Tables"]["wf_workflow_steps"]["Row"];
type WfWorkflowStepInsert = Database["public"]["Tables"]["wf_workflow_steps"]["Insert"];
type WfWorkflowRun = Database["public"]["Tables"]["wf_workflow_runs"]["Row"];
type WfWorkflowStepRun = Database["public"]["Tables"]["wf_workflow_step_runs"]["Row"];

type WfScopeType = Database["public"]["Enums"]["wf_scope_type"];
type WfStatus = Database["public"]["Enums"]["wf_status"];
type WfTriggerType = Database["public"]["Enums"]["wf_trigger_type"];
type WfStepType = Database["public"]["Enums"]["wf_step_type"];
type WfAssigneeType = Database["public"]["Enums"]["wf_assignee_type"];
type WfRunStatus = Database["public"]["Enums"]["wf_run_status"];
type WfStepRunStatus = Database["public"]["Enums"]["wf_step_run_status"];

// ============================================
// WORKFLOWS HOOKS
// ============================================

interface UseWfWorkflowsOptions {
  scopeType?: WfScopeType;
  status?: WfStatus;
  companyId?: string;
  groupId?: string;
  triggerType?: WfTriggerType;
}

export function useWfWorkflows(options: UseWfWorkflowsOptions = {}) {
  const { activeCompanyId } = useActiveCompany();
  const companyId = options.companyId ?? activeCompanyId;

  return useQuery({
    queryKey: ["wf-workflows", companyId, options],
    queryFn: async () => {
      let query = supabase.from("wf_workflows").select("*");

      if (options.scopeType) {
        query = query.eq("scope_type", options.scopeType);
      }
      if (options.status) {
        query = query.eq("status", options.status);
      }
      if (options.triggerType) {
        query = query.eq("trigger_type", options.triggerType);
      }
      if (options.scopeType === "company" && companyId) {
        query = query.eq("company_id", companyId);
      }
      if (options.scopeType === "group" && options.groupId) {
        query = query.eq("group_id", options.groupId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data as WfWorkflow[];
    },
    enabled: !!companyId || options.scopeType === "site",
  });
}

export function useWfWorkflow(workflowId: string | undefined) {
  return useQuery({
    queryKey: ["wf-workflow", workflowId],
    queryFn: async () => {
      if (!workflowId) return null;
      const { data, error } = await supabase
        .from("wf_workflows")
        .select("*")
        .eq("id", workflowId)
        .single();
      if (error) throw error;
      return data as WfWorkflow;
    },
    enabled: !!workflowId,
  });
}

export function useWfWorkflowSteps(workflowId: string | undefined) {
  return useQuery({
    queryKey: ["wf-workflow-steps", workflowId],
    queryFn: async () => {
      if (!workflowId) return [];
      const { data, error } = await supabase
        .from("wf_workflow_steps")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as WfWorkflowStep[];
    },
    enabled: !!workflowId,
  });
}

export function useWfWorkflowMutations() {
  const queryClient = useQueryClient();

  const createWorkflow = useMutation({
    mutationFn: async (workflow: Omit<WfWorkflowInsert, "created_by">) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("wf_workflows")
        .insert({ ...workflow, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-workflows"] });
      toast.success("Workflow created");
    },
    onError: (error) => {
      toast.error("Failed to create workflow: " + error.message);
    },
  });

  const updateWorkflow = useMutation({
    mutationFn: async ({ id, ...updates }: WfWorkflowUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("wf_workflows")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wf-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["wf-workflow", data.id] });
      toast.success("Workflow updated");
    },
    onError: (error) => {
      toast.error("Failed to update workflow: " + error.message);
    },
  });

  const publishWorkflow = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("wf_workflows")
        .update({ 
          status: "published", 
          published_at: new Date().toISOString(),
          published_by: user?.id,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wf-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["wf-workflow", data.id] });
      toast.success("Workflow published");
    },
    onError: (error) => {
      toast.error("Failed to publish workflow: " + error.message);
    },
  });

  const archiveWorkflow = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("wf_workflows")
        .update({ status: "archived" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wf-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["wf-workflow", data.id] });
      toast.success("Workflow archived");
    },
    onError: (error) => {
      toast.error("Failed to archive workflow: " + error.message);
    },
  });

  const deleteWorkflow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wf_workflows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-workflows"] });
      toast.success("Workflow deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete workflow: " + error.message);
    },
  });

  return { createWorkflow, updateWorkflow, publishWorkflow, archiveWorkflow, deleteWorkflow };
}

// ============================================
// WORKFLOW STEPS HOOKS
// ============================================

export function useWfWorkflowStepMutations(workflowId: string) {
  const queryClient = useQueryClient();

  const createStep = useMutation({
    mutationFn: async (step: Omit<WfWorkflowStepInsert, "workflow_id">) => {
      const { data, error } = await supabase
        .from("wf_workflow_steps")
        .insert({ ...step, workflow_id: workflowId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-workflow-steps", workflowId] });
    },
    onError: (error) => {
      toast.error("Failed to create step: " + error.message);
    },
  });

  const updateStep = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WfWorkflowStep> & { id: string }) => {
      const { data, error } = await supabase
        .from("wf_workflow_steps")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-workflow-steps", workflowId] });
    },
    onError: (error) => {
      toast.error("Failed to update step: " + error.message);
    },
  });

  const deleteStep = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wf_workflow_steps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-workflow-steps", workflowId] });
    },
    onError: (error) => {
      toast.error("Failed to delete step: " + error.message);
    },
  });

  const reorderSteps = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from("wf_workflow_steps").update({ sort_order: index }).eq("id", id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-workflow-steps", workflowId] });
    },
    onError: (error) => {
      toast.error("Failed to reorder steps: " + error.message);
    },
  });

  return { createStep, updateStep, deleteStep, reorderSteps };
}

// ============================================
// WORKFLOW RUNS HOOKS
// ============================================

interface UseWfRunsOptions {
  workflowId?: string;
  status?: WfRunStatus;
  companyId?: string;
}

export function useWfWorkflowRuns(options: UseWfRunsOptions = {}) {
  const { activeCompanyId } = useActiveCompany();
  const companyId = options.companyId ?? activeCompanyId;

  return useQuery({
    queryKey: ["wf-workflow-runs", companyId, options],
    queryFn: async () => {
      let query = supabase.from("wf_workflow_runs").select(`
        *,
        workflow:wf_workflows(id, title, scope_type)
      `);

      if (options.workflowId) {
        query = query.eq("workflow_id", options.workflowId);
      }
      if (options.status) {
        query = query.eq("status", options.status);
      }
      if (companyId) {
        query = query.eq("company_context_id", companyId);
      }

      const { data, error } = await query.order("started_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useMyWfWorkItems() {
  return useQuery({
    queryKey: ["wf-my-work-items"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("wf_workflow_step_runs")
        .select(`
          *,
          step:wf_workflow_steps(*),
          run:wf_workflow_runs(
            *,
            workflow:wf_workflows(id, title)
          )
        `)
        .eq("assigned_to_user_id", user.id)
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useWfWorkflowRun(runId: string | undefined) {
  return useQuery({
    queryKey: ["wf-workflow-run", runId],
    queryFn: async () => {
      if (!runId) return null;
      const { data, error } = await supabase
        .from("wf_workflow_runs")
        .select(`
          *,
          workflow:wf_workflows(*),
          step_runs:wf_workflow_step_runs(
            *,
            step:wf_workflow_steps(*)
          )
        `)
        .eq("id", runId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!runId,
  });
}

export function useWfRunMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const startWorkflow = useMutation({
    mutationFn: async ({
      workflowId,
      targetEmployeeId,
      metadata,
    }: {
      workflowId: string;
      targetEmployeeId?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Get workflow to capture definition_published_at for versioning
      const { data: workflow, error: workflowError } = await supabase
        .from("wf_workflows")
        .select("published_at")
        .eq("id", workflowId)
        .single();
      if (workflowError) throw workflowError;

      // Create the run with definition version reference
      const { data: run, error: runError } = await supabase
        .from("wf_workflow_runs")
        .insert([{
          workflow_id: workflowId,
          initiated_by_user_id: user?.id ?? null,
          company_context_id: activeCompanyId ?? null,
          target_employee_id: targetEmployeeId ?? null,
          status: "running" as const,
          metadata: JSON.parse(JSON.stringify(metadata ?? {})),
          definition_published_at: workflow?.published_at ?? null,
        }])
        .select()
        .single();
      if (runError) throw runError;

      // Get workflow steps
      const { data: steps, error: stepsError } = await supabase
        .from("wf_workflow_steps")
        .select("*")
        .eq("workflow_id", workflowId)
        .eq("enabled", true)
        .order("sort_order", { ascending: true });
      if (stepsError) throw stepsError;

      // Create step runs
      if (steps && steps.length > 0) {
        for (const step of steps) {
          const { error: stepRunError } = await supabase
            .from("wf_workflow_step_runs")
            .insert({
              run_id: run.id,
              step_id: step.id,
              status: "pending" as const,
              assigned_to_user_id: step.assignee_type === "workflow_initiator" ? user?.id : step.assignee_id,
            });
          if (stepRunError) throw stepRunError;
        }
      }

      return run;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-workflow-runs"] });
      queryClient.invalidateQueries({ queryKey: ["wf-my-work-items"] });
      toast.success("Workflow started");
    },
    onError: (error) => {
      toast.error("Failed to start workflow: " + error.message);
    },
  });

  const cancelRun = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("wf_workflow_runs")
        .update({ status: "cancelled" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wf-workflow-runs"] });
      queryClient.invalidateQueries({ queryKey: ["wf-workflow-run", data.id] });
      toast.success("Workflow cancelled");
    },
    onError: (error) => {
      toast.error("Failed to cancel workflow: " + error.message);
    },
  });

  return { startWorkflow, cancelRun };
}

// ============================================
// STEP RUN MUTATIONS
// ============================================

export function useWfStepRunMutations() {
  const queryClient = useQueryClient();

  const completeStep = useMutation({
    mutationFn: async ({
      stepRunId,
      notes,
      outputLinks,
    }: {
      stepRunId: string;
      notes?: string;
      outputLinks?: { type: string; id: string }[];
    }) => {
      const { data, error } = await supabase
        .from("wf_workflow_step_runs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          notes,
          output_links: outputLinks ?? [],
        })
        .eq("id", stepRunId)
        .select("*, run:wf_workflow_runs(*)")
        .single();
      if (error) throw error;

      // Check if this was the last step and complete the run
      const runId = (data.run as WfWorkflowRun).id;
      const { data: remainingSteps } = await supabase
        .from("wf_workflow_step_runs")
        .select("id")
        .eq("run_id", runId)
        .in("status", ["pending", "in_progress"]);

      if (remainingSteps && remainingSteps.length === 0) {
        await supabase
          .from("wf_workflow_runs")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", runId);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-workflow-runs"] });
      queryClient.invalidateQueries({ queryKey: ["wf-my-work-items"] });
      toast.success("Step completed");
    },
    onError: (error) => {
      toast.error("Failed to complete step: " + error.message);
    },
  });

  const rejectStep = useMutation({
    mutationFn: async ({ stepRunId, notes }: { stepRunId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("wf_workflow_step_runs")
        .update({
          status: "rejected",
          completed_at: new Date().toISOString(),
          notes,
        })
        .eq("id", stepRunId)
        .select("*, run:wf_workflow_runs(*)")
        .single();
      if (error) throw error;

      // Mark run as failed on rejection
      const runId = (data.run as WfWorkflowRun).id;
      await supabase
        .from("wf_workflow_runs")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", runId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-workflow-runs"] });
      queryClient.invalidateQueries({ queryKey: ["wf-my-work-items"] });
      toast.success("Step rejected");
    },
    onError: (error) => {
      toast.error("Failed to reject step: " + error.message);
    },
  });

  const skipStep = useMutation({
    mutationFn: async ({ stepRunId, notes }: { stepRunId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("wf_workflow_step_runs")
        .update({
          status: "skipped",
          completed_at: new Date().toISOString(),
          notes,
        })
        .eq("id", stepRunId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-workflow-runs"] });
      queryClient.invalidateQueries({ queryKey: ["wf-my-work-items"] });
      toast.success("Step skipped");
    },
    onError: (error) => {
      toast.error("Failed to skip step: " + error.message);
    },
  });

  const startStep = useMutation({
    mutationFn: async (stepRunId: string) => {
      const { data, error } = await supabase
        .from("wf_workflow_step_runs")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", stepRunId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-workflow-runs"] });
      queryClient.invalidateQueries({ queryKey: ["wf-my-work-items"] });
    },
    onError: (error) => {
      toast.error("Failed to start step: " + error.message);
    },
  });

  return { completeStep, rejectStep, skipStep, startStep };
}

// ============================================
// WORKFLOW STATS
// ============================================

export function useWfWorkflowStats(workflowId: string | undefined) {
  return useQuery({
    queryKey: ["wf-workflow-stats", workflowId],
    queryFn: async () => {
      if (!workflowId) return null;

      const { data, error } = await supabase
        .from("wf_workflow_runs")
        .select("id, status, started_at, completed_at")
        .eq("workflow_id", workflowId);
      if (error) throw error;

      const total = data.length;
      const byStatus = data.reduce((acc, run) => {
        acc[run.status] = (acc[run.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const completedRuns = data.filter((r) => r.status === "completed" && r.completed_at);
      const avgCompletionTimeMs =
        completedRuns.length > 0
          ? completedRuns.reduce((sum, r) => {
              const start = new Date(r.started_at).getTime();
              const end = new Date(r.completed_at!).getTime();
              return sum + (end - start);
            }, 0) / completedRuns.length
          : 0;

      return {
        total,
        byStatus,
        completionRate: total > 0 ? ((byStatus.completed || 0) / total) * 100 : 0,
        avgCompletionTimeMs,
      };
    },
    enabled: !!workflowId,
  });
}

// Export types
export type {
  WfWorkflow,
  WfWorkflowStep,
  WfWorkflowRun,
  WfWorkflowStepRun,
  WfScopeType,
  WfStatus,
  WfTriggerType,
  WfStepType,
  WfAssigneeType,
  WfRunStatus,
  WfStepRunStatus,
};
