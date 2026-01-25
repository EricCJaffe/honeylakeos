import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCoachingRole } from "./useCoachingRole";
import { toast } from "sonner";

// =============================================
// Types
// =============================================

export interface ProgramPackOption {
  id: string;
  key: string;
  name: string;
  version: string | null;
  description: string | null;
  workflowCount: number;
  termCount: number;
}

export interface OrgProgramStatus {
  programKey: string;
  programName: string | null;
  programVersion: string | null;
  seededFromPackId: string | null;
  seededAt: string | null;
  workflowCount: number;
  canChangeProgram: boolean;
}

export interface ApplyPackResult {
  programKey: string;
  workflowsSeeded: number;
  terminologyUpdated: boolean;
}

export interface ReseedResult {
  workflowsCreated: number;
  workflowsSkipped: number;
  workflowsUpdated: number;
}

// =============================================
// Fetch Hooks
// =============================================

/**
 * Get available program packs with preview counts
 */
export function useAvailableProgramPacksWithCounts() {
  return useQuery({
    queryKey: ["program-packs-with-counts"],
    queryFn: async (): Promise<ProgramPackOption[]> => {
      const { data: packs, error: packsError } = await supabase
        .from("coaching_program_packs")
        .select("id, key, name, version, description")
        .eq("is_active", true)
        .order("name");

      if (packsError) throw packsError;

      // Get workflow and term counts for each pack
      const packOptions: ProgramPackOption[] = [];
      
      for (const pack of packs || []) {
        const [workflowRes, termRes] = await Promise.all([
          supabase
            .from("coaching_program_pack_workflow_templates")
            .select("id", { count: "exact", head: true })
            .eq("pack_id", pack.id)
            .eq("status", "active"),
          supabase
            .from("coaching_program_pack_terms")
            .select("id", { count: "exact", head: true })
            .eq("pack_id", pack.id),
        ]);

        packOptions.push({
          ...pack,
          workflowCount: workflowRes.count || 0,
          termCount: termRes.count || 0,
        });
      }

      return packOptions;
    },
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Get current org's program status
 */
export function useOrgProgramStatus(coachingOrgId?: string | null) {
  const { activeCoachingOrgId } = useCoachingRole();
  const orgId = coachingOrgId ?? activeCoachingOrgId;

  return useQuery({
    queryKey: ["org-program-status", orgId],
    queryFn: async (): Promise<OrgProgramStatus | null> => {
      if (!orgId) return null;

      const { data: org, error: orgError } = await supabase
        .from("coaching_orgs")
        .select("program_key, program_name, program_version, seeded_from_pack_id, seeded_at")
        .eq("id", orgId)
        .single();

      if (orgError) throw orgError;

      // Get workflow count
      const { count: workflowCount } = await supabase
        .from("coaching_org_workflows")
        .select("id", { count: "exact", head: true })
        .eq("coaching_org_id", orgId);

      return {
        programKey: org.program_key || "generic",
        programName: org.program_name,
        programVersion: org.program_version,
        seededFromPackId: org.seeded_from_pack_id,
        seededAt: org.seeded_at,
        workflowCount: workflowCount || 0,
        canChangeProgram: (workflowCount || 0) === 0,
      };
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

// =============================================
// Mutation Hooks
// =============================================

/**
 * Mutations for program key selection and org pack seeding
 */
export function useOrgProgramMutations(coachingOrgId?: string | null) {
  const queryClient = useQueryClient();
  const { activeCoachingOrgId } = useCoachingRole();
  const orgId = coachingOrgId ?? activeCoachingOrgId;

  /**
   * Apply a new program pack to the org
   * - Updates coaching_orgs.program_key
   * - Seeds workflows if org has zero
   * - Does NOT overwrite existing workflows
   */
  const applyPack = useMutation({
    mutationFn: async ({ packKey }: { packKey: string }): Promise<ApplyPackResult> => {
      if (!orgId) throw new Error("No coaching org ID");

      // Get pack info
      const { data: pack, error: packError } = await supabase
        .from("coaching_program_packs")
        .select("id, key, name, version")
        .eq("key", packKey)
        .single();

      if (packError) throw packError;
      if (!pack) throw new Error("Program pack not found");

      // Check current workflow count
      const { count: existingWorkflowCount } = await supabase
        .from("coaching_org_workflows")
        .select("id", { count: "exact", head: true })
        .eq("coaching_org_id", orgId);

      // Update org's program key
      const { error: updateError } = await supabase
        .from("coaching_orgs")
        .update({
          program_key: packKey,
          program_name: pack.name,
          program_version: pack.version,
          seeded_from_pack_id: pack.id,
          seeded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", orgId);

      if (updateError) throw updateError;

      // If org has no workflows, seed now
      let workflowsSeeded = 0;
      if ((existingWorkflowCount || 0) === 0) {
        workflowsSeeded = await seedWorkflowsFromPacks(orgId, packKey);
      }

      return {
        programKey: packKey,
        workflowsSeeded,
        terminologyUpdated: true,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["org-program-status", orgId] });
      queryClient.invalidateQueries({ queryKey: ["program-key-context", orgId] });
      queryClient.invalidateQueries({ queryKey: ["program-key-terminology", orgId] });
      queryClient.invalidateQueries({ queryKey: ["org-workflows", orgId] });
      queryClient.invalidateQueries({ queryKey: ["simple-program-key", orgId] });
      
      if (result.workflowsSeeded > 0) {
        toast.success(`Applied ${result.programKey} pack and seeded ${result.workflowsSeeded} workflows`);
      } else {
        toast.success(`Applied ${result.programKey} pack. Use Reseed to pull in workflows.`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to apply program pack: ${error.message}`);
    },
  });

  /**
   * Reseed org workflows from pack templates
   * - Creates missing workflows
   * - Does NOT overwrite edited workflows (use restoreFromPack per-workflow)
   */
  const reseedWorkflows = useMutation({
    mutationFn: async ({ includeProgramPack = true }: { includeProgramPack?: boolean } = {}): Promise<ReseedResult> => {
      if (!orgId) throw new Error("No coaching org ID");

      // Get org's program key
      const { data: org, error: orgError } = await supabase
        .from("coaching_orgs")
        .select("program_key")
        .eq("id", orgId)
        .single();

      if (orgError) throw orgError;

      const programKey = org?.program_key || "generic";
      
      let created = 0;
      let skipped = 0;

      // Always seed from generic
      const genericResult = await seedPackWorkflows(orgId, "generic");
      created += genericResult.created;
      skipped += genericResult.skipped;

      // Optionally seed from program pack
      if (includeProgramPack && programKey !== "generic") {
        const programResult = await seedPackWorkflows(orgId, programKey);
        created += programResult.created;
        skipped += programResult.skipped;
      }

      return {
        workflowsCreated: created,
        workflowsSkipped: skipped,
        workflowsUpdated: 0,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["org-workflows", orgId] });
      toast.success(
        `Reseeded workflows: ${result.workflowsCreated} created, ${result.workflowsSkipped} already exist`
      );
    },
    onError: (error) => {
      toast.error(`Failed to reseed workflows: ${error.message}`);
    },
  });

  /**
   * Update just the program key (without seeding)
   */
  const updateProgramKey = useMutation({
    mutationFn: async ({ packKey }: { packKey: string }) => {
      if (!orgId) throw new Error("No coaching org ID");

      const { data: pack, error: packError } = await supabase
        .from("coaching_program_packs")
        .select("id, name, version")
        .eq("key", packKey)
        .single();

      if (packError) throw packError;

      const { error: updateError } = await supabase
        .from("coaching_orgs")
        .update({
          program_key: packKey,
          program_name: pack?.name || packKey,
          program_version: pack?.version || "1.0",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orgId);

      if (updateError) throw updateError;
      return { packKey };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-program-status", orgId] });
      queryClient.invalidateQueries({ queryKey: ["program-key-context", orgId] });
      queryClient.invalidateQueries({ queryKey: ["program-key-terminology", orgId] });
      toast.success("Program key updated");
    },
    onError: (error) => {
      toast.error(`Failed to update program key: ${error.message}`);
    },
  });

  return {
    applyPack,
    reseedWorkflows,
    updateProgramKey,
  };
}

// =============================================
// Helper Functions
// =============================================

/**
 * Seed workflows from generic pack + program pack
 */
async function seedWorkflowsFromPacks(orgId: string, programKey: string): Promise<number> {
  let totalSeeded = 0;

  // Always seed generic first
  const genericResult = await seedPackWorkflows(orgId, "generic");
  totalSeeded += genericResult.created;

  // Then seed program-specific if different
  if (programKey !== "generic") {
    const programResult = await seedPackWorkflows(orgId, programKey);
    totalSeeded += programResult.created;
  }

  return totalSeeded;
}

/**
 * Seed workflows from a specific pack
 */
async function seedPackWorkflows(
  orgId: string, 
  packKey: string
): Promise<{ created: number; skipped: number }> {
  // Get pack
  const { data: pack, error: packError } = await supabase
    .from("coaching_program_packs")
    .select("id, key")
    .eq("key", packKey)
    .single();

  if (packError || !pack) {
    console.warn(`Pack ${packKey} not found`);
    return { created: 0, skipped: 0 };
  }

  // Get templates with steps - include new metadata columns
  const { data: templates, error: templatesError } = await supabase
    .from("coaching_program_pack_workflow_templates")
    .select(`
      *,
      coaching_program_pack_workflow_steps(*)
    `)
    .eq("pack_id", pack.id)
    .eq("status", "active");

  if (templatesError || !templates) {
    return { created: 0, skipped: 0 };
  }

  let created = 0;
  let skipped = 0;

  for (const template of templates) {
    // Check if already exists (by source_pack_template_id or by workflow_type + source_pack_key)
    const { data: existing } = await supabase
      .from("coaching_org_workflows")
      .select("id")
      .eq("coaching_org_id", orgId)
      .or(`source_pack_template_id.eq.${template.id},and(workflow_type.eq.${template.workflow_type},source_pack_key.eq.${packKey})`)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    // Use pack metadata for locked status and editable fields
    const isLocked = (template as any).is_locked ?? false;
    const editableFields = (template as any).editable_fields ?? 
      (isLocked ? ["name", "description"] : ["name", "description", "is_active", "steps"]);

    // Create org workflow
    const { data: newWorkflow, error: wfError } = await supabase
      .from("coaching_org_workflows")
      .insert({
        coaching_org_id: orgId,
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

    if (wfError) {
      console.error("Failed to create workflow:", wfError);
      continue;
    }

    // Create steps - properly map attached_form_base_key
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
        attached_form_base_key: step.attached_form_base_key || null,
        attached_form_template_key: step.attached_form_template_key || null,
        default_assignee: step.default_assignee || "unassigned",
        due_offset_days: step.due_offset_days,
        cadence_days: step.cadence_days || step.schedule_offset_days,
      }));

      await supabase
        .from("coaching_org_workflow_steps")
        .insert(stepInserts);
    }

    created++;
  }

  return { created, skipped };
}
