import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { annualGoalsPortfolioForm, keyLeaderMemberCovenantForm, executiveMembershipApplicationForm } from "@/data/workflowTemplates";
import type { FormTemplate, FormFieldTemplate } from "@/data/workflowTemplates";

type WfForm = Database["public"]["Tables"]["wf_forms"]["Row"];
type WfFormField = Database["public"]["Tables"]["wf_form_fields"]["Row"];

// Map of all available form templates
const FORM_TEMPLATES: Record<string, FormTemplate> = {
  "generic_annual_goals_portfolio": annualGoalsPortfolioForm,
  "generic_key_leader_member_covenant": keyLeaderMemberCovenantForm,
  "generic_executive_membership_application": executiveMembershipApplicationForm,
};

// Get template by key
export function getFormTemplate(templateKey: string): FormTemplate | undefined {
  return FORM_TEMPLATES[templateKey];
}

// Check if a form with this template_key exists for the company
export function useFormByTemplateKey(templateKey: string | undefined) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["wf-form-by-template", templateKey, activeCompanyId],
    queryFn: async () => {
      if (!templateKey || !activeCompanyId) return null;
      
      const { data, error } = await supabase
        .from("wf_forms")
        .select("*, fields:wf_form_fields(*)")
        .eq("template_key", templateKey)
        .eq("company_id", activeCompanyId)
        .maybeSingle();
      
      if (error) throw error;
      return data as (WfForm & { fields: WfFormField[] }) | null;
    },
    enabled: !!templateKey && !!activeCompanyId,
  });
}

// Create a form from a template
export function useCreateFormFromTemplate() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  return useMutation({
    mutationFn: async (templateKey: string) => {
      const template = getFormTemplate(templateKey);
      if (!template) throw new Error("Template not found");
      if (!activeCompanyId) throw new Error("No active company");

      const { data: { user } } = await supabase.auth.getUser();

      // Create the form
      const { data: form, error: formError } = await supabase
        .from("wf_forms")
        .insert({
          title: template.title,
          description: template.description,
          scope_type: "company",
          company_id: activeCompanyId,
          template_key: templateKey,
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

// Hook to get or create form from template
export function useEnsureFormFromTemplate(templateKey: string | undefined) {
  const { data: existingForm, isLoading } = useFormByTemplateKey(templateKey);
  const createForm = useCreateFormFromTemplate();

  const ensureForm = async () => {
    if (existingForm) return existingForm;
    if (!templateKey) throw new Error("No template key");
    return await createForm.mutateAsync(templateKey);
  };

  return {
    existingForm,
    isLoading,
    ensureForm,
    isCreating: createForm.isPending,
  };
}