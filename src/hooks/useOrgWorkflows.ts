import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
export interface OrgWorkflow {
  id: string;
  coaching_org_id: string;
  source_pack_template_id: string | null;
  source_pack_key: string;
  name: string;
  description: string | null;
  workflow_type: string;
  is_active: boolean;
  is_locked: boolean;
  editable_fields: string[];
  created_at: string;
  updated_at: string;
}

export interface OrgWorkflowStep {
  id: string;
  org_workflow_id: string;
  source_pack_step_id: string | null;
  step_order: number;
  step_type: string;
  title: string;
  description: string | null;
  is_optional: boolean;
  is_disabled: boolean;
  attached_form_template_key: string | null;
  default_assignee: string;
  due_offset_days: number | null;
  cadence_days: number | null;
  created_at: string;
  updated_at: string;
}

// Fetch org workflows
export function useOrgWorkflows(coachingOrgId: string | null) {
  return useQuery({
    queryKey: ["org-workflows", coachingOrgId],
    queryFn: async () => {
      if (!coachingOrgId) return [];
      
      const { data, error } = await supabase
        .from("coaching_org_workflows")
        .select("*")
        .eq("coaching_org_id", coachingOrgId)
        .order("name");
      
      if (error) throw error;
      return (data || []) as OrgWorkflow[];
    },
    enabled: !!coachingOrgId,
  });
}

// Fetch single workflow with steps
export function useOrgWorkflow(workflowId: string | null) {
  return useQuery({
    queryKey: ["org-workflow", workflowId],
    queryFn: async () => {
      if (!workflowId) return null;
      
      const { data: workflow, error: wfError } = await supabase
        .from("coaching_org_workflows")
        .select("*")
        .eq("id", workflowId)
        .single();
      
      if (wfError) throw wfError;
      
      const { data: steps, error: stepsError } = await supabase
        .from("coaching_org_workflow_steps")
        .select("*")
        .eq("org_workflow_id", workflowId)
        .order("step_order");
      
      if (stepsError) throw stepsError;
      
      return {
        workflow: workflow as OrgWorkflow,
        steps: (steps || []) as OrgWorkflowStep[],
      };
    },
    enabled: !!workflowId,
  });
}

// Fetch pack templates for seeding
export function usePackWorkflowTemplates(packKey: string | null) {
  return useQuery({
    queryKey: ["pack-workflow-templates", packKey],
    queryFn: async () => {
      if (!packKey) return [];
      
      // First get the pack id
      const { data: pack, error: packError } = await supabase
        .from("coaching_program_packs")
        .select("id")
        .eq("key", packKey)
        .single();
      
      if (packError) throw packError;
      if (!pack) return [];
      
      // Get templates with steps
      const { data: templates, error: templatesError } = await supabase
        .from("coaching_program_pack_workflow_templates")
        .select(`
          *,
          coaching_program_pack_workflow_steps(*)
        `)
        .eq("pack_id", pack.id)
        .eq("status", "active");
      
      if (templatesError) throw templatesError;
      return templates || [];
    },
    enabled: !!packKey,
  });
}

// Mutations
export function useOrgWorkflowMutations(coachingOrgId: string | null) {
  const queryClient = useQueryClient();
  
  // Seed workflows from a pack
  const seedFromPack = useMutation({
    mutationFn: async ({ packKey }: { packKey: string }) => {
      if (!coachingOrgId) throw new Error("No coaching org ID");
      
      // Get pack
      const { data: pack, error: packError } = await supabase
        .from("coaching_program_packs")
        .select("id, key")
        .eq("key", packKey)
        .single();
      
      if (packError) throw packError;
      if (!pack) throw new Error("Pack not found");
      
      // Get templates with steps
      const { data: templates, error: templatesError } = await supabase
        .from("coaching_program_pack_workflow_templates")
        .select(`
          *,
          coaching_program_pack_workflow_steps(*)
        `)
        .eq("pack_id", pack.id)
        .eq("status", "active");
      
      if (templatesError) throw templatesError;
      if (!templates || templates.length === 0) return { seeded: 0 };
      
      let seeded = 0;
      
      for (const template of templates) {
        // Check if already seeded
        const { data: existing } = await supabase
          .from("coaching_org_workflows")
          .select("id")
          .eq("coaching_org_id", coachingOrgId)
          .eq("source_pack_template_id", template.id)
          .single();
        
        if (existing) continue;
        
        // Determine editable fields based on workflow type
        const isLocked = ["engagement_lifecycle", "chair_recruitment", "chair_onboarding"].includes(template.workflow_type);
        const editableFields = isLocked 
          ? ["name", "description"]
          : ["name", "description", "is_active", "steps"];
        
        // Create org workflow
        const { data: newWorkflow, error: wfError } = await supabase
          .from("coaching_org_workflows")
          .insert({
            coaching_org_id: coachingOrgId,
            source_pack_template_id: template.id,
            source_pack_key: packKey,
            name: template.name,
            description: template.description,
            workflow_type: template.workflow_type,
            is_active: true,
            is_locked: isLocked,
            editable_fields: editableFields,
          })
          .select()
          .single();
        
        if (wfError) throw wfError;
        
        // Create steps
        const steps = template.coaching_program_pack_workflow_steps || [];
        if (steps.length > 0) {
          const stepInserts = steps.map((step: any) => ({
            org_workflow_id: newWorkflow.id,
            source_pack_step_id: step.id,
            step_order: step.step_order,
            step_type: step.step_type,
            title: step.title,
            description: step.description,
            is_optional: false,
            is_disabled: false,
            attached_form_template_key: null,
            default_assignee: step.default_assignee || "unassigned",
            due_offset_days: step.due_offset_days,
          }));
          
          const { error: stepsError } = await supabase
            .from("coaching_org_workflow_steps")
            .insert(stepInserts);
          
          if (stepsError) throw stepsError;
        }
        
        seeded++;
      }
      
      return { seeded };
    },
    onSuccess: ({ seeded }) => {
      queryClient.invalidateQueries({ queryKey: ["org-workflows", coachingOrgId] });
      toast.success(`Seeded ${seeded} workflows from pack`);
    },
    onError: (error) => {
      toast.error(`Failed to seed workflows: ${error.message}`);
    },
  });
  
  // Update workflow
  const updateWorkflow = useMutation({
    mutationFn: async ({ 
      workflowId, 
      updates 
    }: { 
      workflowId: string; 
      updates: Partial<Pick<OrgWorkflow, "name" | "description" | "is_active">> 
    }) => {
      const { data, error } = await supabase
        .from("coaching_org_workflows")
        .update(updates)
        .eq("id", workflowId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["org-workflows", coachingOrgId] });
      queryClient.invalidateQueries({ queryKey: ["org-workflow", data.id] });
      toast.success("Workflow updated");
    },
    onError: (error) => {
      toast.error(`Failed to update workflow: ${error.message}`);
    },
  });
  
  // Update step
  const updateStep = useMutation({
    mutationFn: async ({ 
      stepId, 
      updates 
    }: { 
      stepId: string; 
      updates: {
        title?: string;
        description?: string | null;
        is_optional?: boolean;
        is_disabled?: boolean;
        attached_form_template_key?: string | null;
        attached_form_base_key?: string | null;
        default_assignee?: "coach" | "manager" | "member" | "member_admin" | "member_user" | "org_admin" | "unassigned";
        due_offset_days?: number | null;
        cadence_days?: number | null;
        step_order?: number;
      }
    }) => {
      const { data, error } = await supabase
        .from("coaching_org_workflow_steps")
        .update(updates)
        .eq("id", stepId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["org-workflow", data.org_workflow_id] });
      toast.success("Step updated");
    },
    onError: (error) => {
      toast.error(`Failed to update step: ${error.message}`);
    },
  });
  
  // Reorder steps
  const reorderSteps = useMutation({
    mutationFn: async ({ 
      workflowId, 
      stepIds 
    }: { 
      workflowId: string; 
      stepIds: string[] 
    }) => {
      // Update each step with its new order
      for (let i = 0; i < stepIds.length; i++) {
        const { error } = await supabase
          .from("coaching_org_workflow_steps")
          .update({ step_order: i + 1 })
          .eq("id", stepIds[i]);
        
        if (error) throw error;
      }
      
      return { workflowId };
    },
    onSuccess: ({ workflowId }) => {
      queryClient.invalidateQueries({ queryKey: ["org-workflow", workflowId] });
      toast.success("Steps reordered");
    },
    onError: (error) => {
      toast.error(`Failed to reorder steps: ${error.message}`);
    },
  });
  
  // Restore workflow from pack default
  const restoreFromPack = useMutation({
    mutationFn: async ({ workflowId }: { workflowId: string }) => {
      // Get current workflow
      const { data: workflow, error: wfError } = await supabase
        .from("coaching_org_workflows")
        .select("*, source_pack_template_id")
        .eq("id", workflowId)
        .single();
      
      if (wfError) throw wfError;
      if (!workflow.source_pack_template_id) {
        throw new Error("No source pack template to restore from");
      }
      
      // Get source template
      const { data: template, error: templateError } = await supabase
        .from("coaching_program_pack_workflow_templates")
        .select(`
          *,
          coaching_program_pack_workflow_steps(*)
        `)
        .eq("id", workflow.source_pack_template_id)
        .single();
      
      if (templateError) throw templateError;
      
      // Update workflow
      const { error: updateError } = await supabase
        .from("coaching_org_workflows")
        .update({
          name: template.name,
          description: template.description,
        })
        .eq("id", workflowId);
      
      if (updateError) throw updateError;
      
      // Delete existing steps
      const { error: deleteError } = await supabase
        .from("coaching_org_workflow_steps")
        .delete()
        .eq("org_workflow_id", workflowId);
      
      if (deleteError) throw deleteError;
      
      // Re-create steps from template
      const steps = template.coaching_program_pack_workflow_steps || [];
      if (steps.length > 0) {
        const stepInserts = steps.map((step: any) => ({
          org_workflow_id: workflowId,
          source_pack_step_id: step.id,
          step_order: step.step_order,
          step_type: step.step_type,
          title: step.title,
          description: step.description,
          is_optional: false,
          is_disabled: false,
          attached_form_template_key: null,
          default_assignee: step.default_assignee || "unassigned",
          due_offset_days: step.due_offset_days,
        }));
        
        const { error: stepsError } = await supabase
          .from("coaching_org_workflow_steps")
          .insert(stepInserts);
        
        if (stepsError) throw stepsError;
      }
      
      return { workflowId };
    },
    onSuccess: ({ workflowId }) => {
      queryClient.invalidateQueries({ queryKey: ["org-workflows", coachingOrgId] });
      queryClient.invalidateQueries({ queryKey: ["org-workflow", workflowId] });
      toast.success("Workflow restored to pack default");
    },
    onError: (error) => {
      toast.error(`Failed to restore workflow: ${error.message}`);
    },
  });
  
  return {
    seedFromPack,
    updateWorkflow,
    updateStep,
    reorderSteps,
    restoreFromPack,
  };
}
