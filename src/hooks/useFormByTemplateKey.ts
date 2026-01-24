import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { annualGoalsPortfolioForm, keyLeaderMemberCovenantForm, executiveMembershipApplicationForm, businessPlanOrganizerForm, briefingQuestionnaireTeamForm, briefingQuestionnaireSpouseForm, keyLeaderBriefingForm, executiveBriefingForm, briefingExecutiveSummaryForm } from "@/data/workflowTemplates";
import type { FormTemplate, FormFieldTemplate } from "@/data/workflowTemplates";

type WfForm = Database["public"]["Tables"]["wf_forms"]["Row"];
type WfFormField = Database["public"]["Tables"]["wf_form_fields"]["Row"];

// Map of all available form templates (keyed by full resolved key)
const FORM_TEMPLATES: Record<string, FormTemplate> = {
  "generic_annual_goals_portfolio": annualGoalsPortfolioForm,
  "generic_key_leader_member_covenant": keyLeaderMemberCovenantForm,
  "generic_executive_membership_application": executiveMembershipApplicationForm,
  "generic_business_plan_organizer_v25_07": businessPlanOrganizerForm,
  "generic_briefing_questionnaire_team": briefingQuestionnaireTeamForm,
  "generic_briefing_questionnaire_spouse": briefingQuestionnaireSpouseForm,
  "generic_key_leader_briefing": keyLeaderBriefingForm,
  "generic_executive_briefing": executiveBriefingForm,
  "generic_briefing_executive_summary": briefingExecutiveSummaryForm,
};

/**
 * Get template by key with program pack resolution
 * Resolution order: {program_key}_{base_key} → generic_{base_key}
 */
export function getFormTemplate(templateKey: string, programKey: string = "generic"): FormTemplate | undefined {
  // If already a full key, try direct lookup
  if (FORM_TEMPLATES[templateKey]) {
    return FORM_TEMPLATES[templateKey];
  }
  
  // Try program-specific key
  const programSpecificKey = `${programKey}_${templateKey}`;
  if (FORM_TEMPLATES[programSpecificKey]) {
    return FORM_TEMPLATES[programSpecificKey];
  }
  
  // Fallback to generic
  const genericKey = `generic_${templateKey}`;
  return FORM_TEMPLATES[genericKey];
}

/**
 * Resolve a template key with program pack fallback
 * Returns the full resolved key that exists in templates
 */
export function resolveFormTemplateKey(baseKey: string, programKey: string = "generic"): string {
  // If already prefixed, return as-is
  if (baseKey.startsWith("generic_") || baseKey.startsWith("convene_") || baseKey.startsWith("c12_")) {
    return baseKey;
  }
  
  // Try program-specific first
  const programSpecificKey = `${programKey}_${baseKey}`;
  if (FORM_TEMPLATES[programSpecificKey]) {
    return programSpecificKey;
  }
  
  // Fallback to generic
  return `generic_${baseKey}`;
}

/**
 * Extract base key from a resolved template key
 */
export function extractFormBaseKey(resolvedKey: string): string {
  const prefixes = ["generic_", "convene_", "c12_", "eos_"];
  for (const prefix of prefixes) {
    if (resolvedKey.startsWith(prefix)) {
      return resolvedKey.slice(prefix.length);
    }
  }
  return resolvedKey;
}

// Check if a form with this template_key exists for the company
export function useFormByTemplateKey(templateKey: string | undefined, programKey: string = "generic") {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["wf-form-by-template", templateKey, activeCompanyId, programKey],
    queryFn: async () => {
      if (!templateKey || !activeCompanyId) return null;
      
      // Resolve the template key with fallback
      const resolvedKey = resolveFormTemplateKey(templateKey, programKey);
      
      // Try program-specific first
      const { data: programForm, error: err1 } = await supabase
        .from("wf_forms")
        .select("*, fields:wf_form_fields(*)")
        .eq("template_key", resolvedKey)
        .eq("company_id", activeCompanyId)
        .maybeSingle();
      
      if (err1) throw err1;
      if (programForm) return programForm as (WfForm & { fields: WfFormField[] });
      
      // If template key was program-specific, try generic fallback
      if (!resolvedKey.startsWith("generic_") && programKey !== "generic") {
        const genericKey = `generic_${extractFormBaseKey(templateKey)}`;
        const { data: genericForm, error: err2 } = await supabase
          .from("wf_forms")
          .select("*, fields:wf_form_fields(*)")
          .eq("template_key", genericKey)
          .eq("company_id", activeCompanyId)
          .maybeSingle();
        
        if (err2) throw err2;
        if (genericForm) return genericForm as (WfForm & { fields: WfFormField[] });
      }
      
      return null;
    },
    enabled: !!templateKey && !!activeCompanyId,
  });
}

// Create a form from a template with program pack resolution
export function useCreateFormFromTemplate() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  return useMutation({
    mutationFn: async ({ templateKey, programKey = "generic" }: { templateKey: string; programKey?: string }) => {
      const template = getFormTemplate(templateKey, programKey);
      if (!template) throw new Error("Template not found");
      if (!activeCompanyId) throw new Error("No active company");

      const { data: { user } } = await supabase.auth.getUser();
      
      // Use the resolved key for storage
      const resolvedKey = resolveFormTemplateKey(templateKey, programKey);

      // Create the form
      const { data: form, error: formError } = await supabase
        .from("wf_forms")
        .insert({
          title: template.title,
          description: template.description,
          scope_type: "company",
          company_id: activeCompanyId,
          template_key: resolvedKey,
          status: "published",
          created_by: user?.id,
          published_at: new Date().toISOString(),
          published_by: user?.id,
        })
        .select()
        .single();

      if (formError) throw formError;

      // Create all fields
      const fieldInserts = template.fields.map((field: FormFieldTemplate) => ({
        form_id: form.id,
        key: field.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_+$/, ""),
        label: field.label,
        field_type: field.field_type,
        is_required: field.is_required,
        help_text: field.helper_text ?? null,
        options: field.options ? { choices: field.options } : null,
        sort_order: field.sort_order,
      }));

      const { error: fieldsError } = await supabase
        .from("wf_form_fields")
        .insert(fieldInserts);

      if (fieldsError) throw fieldsError;

      return form;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wf-form-by-template"] });
      queryClient.invalidateQueries({ queryKey: ["wf-forms"] });
      toast.success("Form created from template");
    },
    onError: (error) => {
      toast.error("Failed to create form: " + error.message);
    },
  });
}

// Hook to get or create form from template with program pack resolution
export function useEnsureFormFromTemplate(templateKey: string | undefined, programKey: string = "generic") {
  const { data: existingForm, isLoading } = useFormByTemplateKey(templateKey, programKey);
  const createForm = useCreateFormFromTemplate();

  const ensureForm = async () => {
    if (existingForm) return existingForm;
    if (!templateKey) throw new Error("No template key");
    return await createForm.mutateAsync({ templateKey, programKey });
  };

  return {
    existingForm,
    isLoading,
    ensureForm,
    isCreating: createForm.isPending,
  };
}

/**
 * List all available form template keys for a program
 */
export function getAvailableFormTemplates(programKey: string = "generic"): string[] {
  const templates: string[] = [];
  
  for (const key of Object.keys(FORM_TEMPLATES)) {
    // Include generic templates (as fallback for all)
    if (key.startsWith("generic_")) {
      templates.push(key);
    }
    // Include program-specific templates
    if (key.startsWith(`${programKey}_`)) {
      templates.push(key);
    }
  }
  
  return templates;
}