import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { useModuleAccess } from "./useModuleAccess";
import { parseFriendlyError } from "./useFriendlyError";
import { LIST_LIMITS } from "@/lib/readModels";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type { Form, FormField } from "./useForms";

// ============================================================================
// Types
// ============================================================================

export interface FormSubmission extends Tables<"form_submissions"> {
  values?: FormSubmissionValue[];
  form?: Form;
}

export interface FormSubmissionValue extends Tables<"form_submission_values"> {
  field?: FormField;
}

export interface SubmitFormInput {
  form_id: string;
  values: Record<string, string>; // field_id -> value
}

export interface WorkflowResult {
  created_external_contact_id?: string;
  created_crm_client_id?: string;
  created_task_id?: string;
  /** List of secondary actions that failed */
  failedActions?: string[];
}

export interface SubmissionListMeta {
  truncated: boolean;
  limit: number;
}

// ============================================================================
// Query Keys
// ============================================================================

const QUERY_KEYS = {
  all: ["form-submissions"] as const,
  byForm: (formId: string) => [...QUERY_KEYS.all, "form", formId] as const,
  detail: (id: string) => [...QUERY_KEYS.all, "detail", id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useFormSubmissions(formId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();
  const { hasAccess, loading: moduleLoading } = useModuleAccess("forms");

  return useQuery({
    queryKey: QUERY_KEYS.byForm(formId ?? ""),
    queryFn: async () => {
      if (!formId || !activeCompanyId || !hasAccess) {
        return [];
      }

      const { data, error } = await supabase
        .from("form_submissions")
        .select(`
          *,
          values:form_submission_values(
            *,
            field:form_fields(*)
          )
        `)
        .eq("form_id", formId)
        .eq("company_id", activeCompanyId)
        .order("submitted_at", { ascending: false })
        .limit(LIST_LIMITS.FORM_SUBMISSIONS);

      if (error) throw error;
      
      return data as FormSubmission[];
    },
    enabled: !!formId && !!activeCompanyId && !moduleLoading && hasAccess,
  });
}

export function useFormSubmission(id: string | undefined) {
  const { hasAccess, loading: moduleLoading } = useModuleAccess("forms");

  return useQuery({
    queryKey: QUERY_KEYS.detail(id ?? ""),
    queryFn: async () => {
      if (!id || !hasAccess) return null;

      const { data, error } = await supabase
        .from("form_submissions")
        .select(`
          *,
          values:form_submission_values(
            *,
            field:form_fields(*)
          ),
          form:forms(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as FormSubmission;
    },
    enabled: !!id && !moduleLoading && hasAccess,
  });
}

export function useSubmitForm() {
  const { activeCompanyId } = useActiveCompany();
  const { hasAccess } = useModuleAccess("forms");
  const { hasAccess: hasCrmAccess } = useModuleAccess("crm");
  const { hasAccess: hasTasksAccess } = useModuleAccess("tasks");
  const { log: logAudit } = useAuditLog();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitFormInput): Promise<FormSubmission & WorkflowResult> => {
      if (!activeCompanyId || !hasAccess) throw new Error("No access");

      const { data: user } = await supabase.auth.getUser();

      // Get form with fields for workflow processing
      const { data: form, error: formError } = await supabase
        .from("forms")
        .select(`
          *,
          fields:form_fields(*)
        `)
        .eq("id", input.form_id)
        .single();

      if (formError) throw formError;
      if (form.status !== "published") throw new Error("Form is not published");

      // Extract mapped values from submission
      const fields = (form.fields || []) as FormField[];
      const mappedValues: Record<string, string> = {};
      
      for (const field of fields) {
        const value = input.values[field.id];
        if (field.maps_to && value) {
          mappedValues[field.maps_to] = value;
        }
      }

      // Determine submitter info from mapped fields
      const submitterName = mappedValues.contact_name || null;
      const submitterEmail = mappedValues.contact_email || null;
      const submitterPhone = mappedValues.contact_phone || null;

      // Create submission record
      const submissionInsert: TablesInsert<"form_submissions"> = {
        form_id: input.form_id,
        company_id: activeCompanyId,
        submitted_by: user.user?.id || null,
        submitter_name: submitterName,
        submitter_email: submitterEmail,
        submitter_phone: submitterPhone,
      };

      const { data: submission, error: submissionError } = await supabase
        .from("form_submissions")
        .insert(submissionInsert)
        .select()
        .single();

      if (submissionError) throw submissionError;

      // Insert submission values
      const valueInserts = Object.entries(input.values)
        .filter(([_, value]) => value !== undefined && value !== "")
        .map(([fieldId, value]) => ({
          submission_id: submission.id,
          field_id: fieldId,
          value: String(value),
        }));

      if (valueInserts.length > 0) {
        const { error: valuesError } = await supabase
          .from("form_submission_values")
          .insert(valueInserts);

        if (valuesError) throw valuesError;
      }

      // Execute workflow actions with best-effort handling
      const workflowResult: WorkflowResult = {
        failedActions: [],
      };

      // 1. Create/update external contact
      if (form.action_create_contact && submitterName) {
        try {
          // Check for existing contact by email
          let contactId: string | null = null;
          
          if (submitterEmail) {
            const { data: existing } = await supabase
              .from("external_contacts")
              .select("id")
              .eq("company_id", activeCompanyId)
              .eq("email", submitterEmail)
              .maybeSingle();

            if (existing) {
              // Update existing contact
              const { data: updated } = await supabase
                .from("external_contacts")
                .update({
                  full_name: submitterName,
                  phone: submitterPhone || undefined,
                  organization_name: mappedValues.contact_organization || undefined,
                })
                .eq("id", existing.id)
                .select()
                .single();
              
              contactId = updated?.id || existing.id;
            }
          }

          if (!contactId) {
            // Create new contact
            const { data: newContact } = await supabase
              .from("external_contacts")
              .insert({
                company_id: activeCompanyId,
                full_name: submitterName,
                email: submitterEmail,
                phone: submitterPhone,
                organization_name: mappedValues.contact_organization || null,
                created_by: user.user?.id,
              })
              .select()
              .single();

            contactId = newContact?.id;
          }

          if (contactId) {
            workflowResult.created_external_contact_id = contactId;
            
            // Update submission with contact reference
            await supabase
              .from("form_submissions")
              .update({ created_external_contact_id: contactId })
              .eq("id", submission.id);
          }
        } catch (e) {
          console.error("Failed to create/update contact:", e);
          workflowResult.failedActions!.push("Contact");
        }
      }

      // 2. Create CRM record
      if (form.action_create_crm && hasCrmAccess && (submitterName || mappedValues.contact_organization)) {
        try {
          const crmInsert = {
            company_id: activeCompanyId,
            type: mappedValues.contact_organization ? "b2b" : "b2c",
            lifecycle_status: form.action_crm_lifecycle_status || "prospect",
            person_full_name: submitterName,
            person_email: submitterEmail,
            person_phone: submitterPhone,
            org_name: mappedValues.contact_organization || null,
            notes: mappedValues.crm_notes || null,
            external_contact_id: workflowResult.created_external_contact_id || null,
            created_by: user.user?.id,
          };

          const { data: crmRecord } = await supabase
            .from("crm_clients")
            .insert(crmInsert)
            .select()
            .single();

          if (crmRecord) {
            workflowResult.created_crm_client_id = crmRecord.id;
            
            await supabase
              .from("form_submissions")
              .update({ created_crm_client_id: crmRecord.id })
              .eq("id", submission.id);
          }
        } catch (e) {
          console.error("Failed to create CRM record:", e);
          workflowResult.failedActions!.push("CRM Record");
        }
      }

      // 3. Create task
      if (form.action_create_task && hasTasksAccess && form.action_task_title_template) {
        try {
          const taskTitle = form.action_task_title_template
            .replace("{name}", submitterName || "Unknown")
            .replace("{email}", submitterEmail || "")
            .replace("{form}", form.name);

          const { data: task } = await supabase
            .from("tasks")
            .insert({
              company_id: activeCompanyId,
              title: taskTitle,
              description: `Created from form submission: ${form.name}`,
              status: "pending",
              priority: "medium",
              created_by: user.user?.id,
            })
            .select()
            .single();

          if (task) {
            workflowResult.created_task_id = task.id;
            
            await supabase
              .from("form_submissions")
              .update({ created_task_id: task.id })
              .eq("id", submission.id);
          }
        } catch (e) {
          console.error("Failed to create task:", e);
          workflowResult.failedActions!.push("Task");
        }
      }

      return { ...submission, ...workflowResult } as FormSubmission & WorkflowResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      logAudit("form.submission_received", "form", data.form_id, {
        submission_id: data.id,
        created_contact: !!data.created_external_contact_id,
        created_crm: !!data.created_crm_client_id,
        created_task: !!data.created_task_id,
        failed_actions: data.failedActions,
      });
      
      // Show appropriate toast based on partial success
      if (data.failedActions && data.failedActions.length > 0) {
        toast.warning(`Form submitted, but some actions failed: ${data.failedActions.join(", ")}`);
      } else {
        toast.success("Form submitted successfully");
      }
    },
    onError: (error: Error) => {
      const parsed = parseFriendlyError(error);
      toast.error(parsed.message);
    },
  });
}

export function useDeleteSubmission() {
  const { hasAccess } = useModuleAccess("forms");
  const { log: logAudit } = useAuditLog();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!hasAccess) throw new Error("Module not enabled");

      const { data: submission } = await supabase
        .from("form_submissions")
        .select("form_id")
        .eq("id", id)
        .single();

      const { error } = await supabase.from("form_submissions").delete().eq("id", id);
      if (error) throw error;

      return { id, formId: submission?.form_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      if (result.formId) {
        logAudit("form.submission_deleted", "form", result.formId, { submission_id: result.id });
      }
      toast.success("Submission deleted");
    },
    onError: (error: Error) => {
      const parsed = parseFriendlyError(error);
      toast.error(parsed.message);
    },
  });
}
