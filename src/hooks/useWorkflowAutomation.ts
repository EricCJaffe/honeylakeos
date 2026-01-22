import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Types
export type WorkflowCadence = "one_time" | "weekly" | "monthly" | "quarterly" | "annually";
export type WorkflowAssignmentStatus = "active" | "paused" | "archived";
export type WorkflowRunStatus = "generated" | "in_progress" | "completed" | "cancelled";

export interface WorkflowAssignment {
  id: string;
  coaching_engagement_id: string;
  coaching_workflow_template_id: string;
  name_override?: string;
  status: WorkflowAssignmentStatus;
  cadence: WorkflowCadence;
  start_on: string;
  timezone: string;
  next_run_at?: string;
  last_run_at?: string;
  created_by_user_id: string;
  created_at: string;
  template?: {
    id: string;
    name: string;
    workflow_type: string;
  };
}

export interface WorkflowRun {
  id: string;
  coaching_workflow_assignment_id: string;
  run_for_period_start: string;
  run_for_period_end?: string;
  scheduled_run_at: string;
  status: WorkflowRunStatus;
  created_at: string;
  items?: WorkflowRunItem[];
}

export interface WorkflowRunItem {
  id: string;
  coaching_workflow_run_id: string;
  step_id: string;
  item_type: string;
  created_entity_table: string;
  created_entity_id: string;
  status: string;
}

// Fetch workflow templates for a coaching org
export function useWorkflowTemplates(coachingOrgId?: string) {
  return useQuery({
    queryKey: ["workflow-templates", coachingOrgId],
    queryFn: async () => {
      if (!coachingOrgId) return [];
      
      const { data, error } = await supabase
        .from("coaching_workflow_templates")
        .select(`
          id,
          name,
          workflow_type,
          description,
          status,
          steps:coaching_workflow_steps(id, step_order, step_type, title, due_offset_days, schedule_offset_days)
        `)
        .eq("coaching_org_id", coachingOrgId)
        .eq("status", "active")
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!coachingOrgId,
  });
}

// Fetch workflow assignments for an engagement
export function useWorkflowAssignments(engagementId?: string) {
  return useQuery({
    queryKey: ["workflow-assignments", engagementId],
    queryFn: async () => {
      if (!engagementId) return [];
      
      const { data, error } = await supabase
        .from("coaching_workflow_assignments")
        .select(`
          *,
          template:coaching_workflow_templates(id, name, workflow_type)
        `)
        .eq("coaching_engagement_id", engagementId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as WorkflowAssignment[];
    },
    enabled: !!engagementId,
  });
}

// Fetch workflow runs for an assignment
export function useWorkflowRuns(assignmentId?: string) {
  return useQuery({
    queryKey: ["workflow-runs", assignmentId],
    queryFn: async () => {
      if (!assignmentId) return [];
      
      const { data, error } = await supabase
        .from("coaching_workflow_runs")
        .select(`
          *,
          items:coaching_workflow_run_items(*)
        `)
        .eq("coaching_workflow_assignment_id", assignmentId)
        .order("scheduled_run_at", { ascending: false });
      
      if (error) throw error;
      return data as WorkflowRun[];
    },
    enabled: !!assignmentId,
  });
}

// Create workflow assignment
export function useCreateWorkflowAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      engagementId: string;
      templateId: string;
      cadence: WorkflowCadence;
      startOn: string;
      nameOverride?: string;
      timezone?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("coaching_workflow_assignments")
        .insert({
          coaching_engagement_id: params.engagementId,
          coaching_workflow_template_id: params.templateId,
          cadence: params.cadence,
          start_on: params.startOn,
          name_override: params.nameOverride,
          timezone: params.timezone || "America/New_York",
          created_by_user_id: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-assignments", variables.engagementId] });
      toast({ title: "Workflow assigned successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to assign workflow", description: error.message, variant: "destructive" });
    },
  });
}

// Update workflow assignment status
export function useUpdateWorkflowAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      assignmentId: string;
      engagementId: string;
      status?: WorkflowAssignmentStatus;
    }) => {
      const { error } = await supabase
        .from("coaching_workflow_assignments")
        .update({ status: params.status })
        .eq("id", params.assignmentId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-assignments", variables.engagementId] });
      toast({ title: "Workflow updated" });
    },
    onError: (error) => {
      toast({ title: "Failed to update workflow", description: error.message, variant: "destructive" });
    },
  });
}

// Generate a workflow run manually
export function useGenerateWorkflowRun() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      assignmentId: string;
      engagementId: string;
    }) => {
      // Get assignment details
      const { data: assignment, error: assignmentError } = await supabase
        .from("coaching_workflow_assignments")
        .select(`
          *,
          template:coaching_workflow_templates(
            id,
            name,
            steps:coaching_workflow_steps(*)
          ),
          engagement:coaching_org_engagements(member_company_id)
        `)
        .eq("id", params.assignmentId)
        .single();

      if (assignmentError) throw assignmentError;
      if (!assignment) throw new Error("Assignment not found");

      const today = new Date().toISOString().split("T")[0];
      const scheduledRunAt = new Date().toISOString();

      // Create the run
      const { data: run, error: runError } = await supabase
        .from("coaching_workflow_runs")
        .insert({
          coaching_workflow_assignment_id: params.assignmentId,
          run_for_period_start: today,
          scheduled_run_at: scheduledRunAt,
          status: "generated",
        })
        .select()
        .single();

      if (runError) throw runError;

      // Generate items for each step
      const template = assignment.template as any;
      const steps = template?.steps || [];
      const memberCompanyId = (assignment.engagement as any)?.member_company_id;

      for (const step of steps) {
        const stepType = step.step_type as string;
        let entityTable = "";
        let entityId = "";

        if (stepType === "meeting") {
          // Create coaching meeting
          const { data: meeting, error: meetingError } = await supabase
            .from("coaching_meetings")
            .insert({
              coaching_engagement_id: params.engagementId,
              meeting_type: "ad_hoc",
              title: step.title,
              status: "scheduled",
              scheduled_for: new Date(Date.now() + (step.schedule_offset_days || 0) * 86400000).toISOString(),
            })
            .select()
            .single();

          if (!meetingError && meeting) {
            entityTable = "coaching_meetings";
            entityId = meeting.id;
          }
        } else if (stepType === "task" && memberCompanyId) {
          // Create coaching-scoped task
          const { data: task, error: taskError } = await supabase
            .from("tasks")
            .insert({
              company_id: memberCompanyId,
              coaching_engagement_id: params.engagementId,
              title: step.title,
              description: step.description,
              status: "pending",
              due_date: new Date(Date.now() + (step.due_offset_days || 0) * 86400000).toISOString().split("T")[0],
            })
            .select()
            .single();

          if (!taskError && task) {
            entityTable = "tasks";
            entityId = task.id;
          }
        } else if (stepType === "form") {
          // Create form request placeholder
          const { data: formReq, error: formError } = await supabase
            .from("coaching_form_requests")
            .insert({
              coaching_engagement_id: params.engagementId,
              title: step.title,
              description: step.description,
              status: "pending",
              due_at: new Date(Date.now() + (step.due_offset_days || 0) * 86400000).toISOString(),
            })
            .select()
            .single();

          if (!formError && formReq) {
            entityTable = "coaching_form_requests";
            entityId = formReq.id;
          }
        }

        // Record the run item if entity was created
        if (entityTable && entityId) {
          await supabase.from("coaching_workflow_run_items").insert({
            coaching_workflow_run_id: run.id,
            step_id: step.id,
            item_type: stepType,
            created_entity_table: entityTable,
            created_entity_id: entityId,
            status: "active",
          });
        }
      }

      // Update assignment last_run_at
      await supabase
        .from("coaching_workflow_assignments")
        .update({ 
          last_run_at: scheduledRunAt,
          next_run_at: assignment.cadence === "one_time" ? null : scheduledRunAt,
        })
        .eq("id", params.assignmentId);

      return run;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-assignments", variables.engagementId] });
      queryClient.invalidateQueries({ queryKey: ["workflow-runs", variables.assignmentId] });
      queryClient.invalidateQueries({ queryKey: ["coaching-meetings"] });
      toast({ title: "Workflow run generated", description: "Tasks and meetings have been created." });
    },
    onError: (error) => {
      toast({ title: "Failed to generate workflow run", description: error.message, variant: "destructive" });
    },
  });
}
