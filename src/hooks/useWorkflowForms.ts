import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useMembership } from "@/lib/membership";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type WfForm = Database["public"]["Tables"]["wf_forms"]["Row"];
type WfFormInsert = Database["public"]["Tables"]["wf_forms"]["Insert"];
type WfFormUpdate = Database["public"]["Tables"]["wf_forms"]["Update"];
type WfFormField = Database["public"]["Tables"]["wf_form_fields"]["Row"];
type WfFormFieldInsert = Database["public"]["Tables"]["wf_form_fields"]["Insert"];
type WfFormSubmission = Database["public"]["Tables"]["wf_form_submissions"]["Row"];
type WfFormSubmissionValue = Database["public"]["Tables"]["wf_form_submission_values"]["Row"];

type WfScopeType = Database["public"]["Enums"]["wf_scope_type"];
type WfStatus = Database["public"]["Enums"]["wf_status"];
type WfFieldType = Database["public"]["Enums"]["wf_field_type"];
type WfSubmissionStatus = Database["public"]["Enums"]["wf_submission_status"];

// ============================================
// FORMS HOOKS
// ============================================

interface UseWfFormsOptions {
  scopeType?: WfScopeType;
  status?: WfStatus;
  companyId?: string;
  groupId?: string;
}

export function useWfForms(options: UseWfFormsOptions = {}) {
  const { activeCompanyId } = useActiveCompany();
  const companyId = options.companyId ?? activeCompanyId;

  return useQuery({
    queryKey: ["wf-forms", companyId, options],
    queryFn: async () => {
      let query = supabase.from("wf_forms").select("*");

      if (options.scopeType) {
        query = query.eq("scope_type", options.scopeType);
      }
      if (options.status) {
        query = query.eq("status", options.status);
      }
      if (options.scopeType === "company" && companyId) {
        query = query.eq("company_id", companyId);
      }
      if (options.scopeType === "group" && options.groupId) {
        query = query.eq("group_id", options.groupId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data as WfForm[];
    },
    enabled: !!companyId || options.scopeType === "site",
  });
}

export function useWfForm(formId: string | undefined) {
  return useQuery({
    queryKey: ["wf-form", formId],
    queryFn: async () => {
      if (!formId) return null;
      const { data, error } = await supabase
        .from("wf_forms")
        .select("*")
        .eq("id", formId)
        .single();
      if (error) throw error;
      return data as WfForm;
    },
    enabled: !!formId,
  });
}

export function useWfFormFields(formId: string | undefined) {
  return useQuery({
    queryKey: ["wf-form-fields", formId],
    queryFn: async () => {
      if (!formId) return [];
      const { data, error } = await supabase
        .from("wf_form_fields")
        .select("*")
        .eq("form_id", formId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as WfFormField[];
    },
    enabled: !!formId,
  });
}

export function useWfFormMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const createForm = useMutation({
    mutationFn: async (form: Omit<WfFormInsert, "created_by">) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("wf_forms")
        .insert({ ...form, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-forms"] });
      toast.success("Form created");
    },
    onError: (error) => {
      toast.error("Failed to create form: " + error.message);
    },
  });

  const updateForm = useMutation({
    mutationFn: async ({ id, ...updates }: WfFormUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("wf_forms")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wf-forms"] });
      queryClient.invalidateQueries({ queryKey: ["wf-form", data.id] });
      toast.success("Form updated");
    },
    onError: (error) => {
      toast.error("Failed to update form: " + error.message);
    },
  });

  const publishForm = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("wf_forms")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wf-forms"] });
      queryClient.invalidateQueries({ queryKey: ["wf-form", data.id] });
      toast.success("Form published");
    },
    onError: (error) => {
      toast.error("Failed to publish form: " + error.message);
    },
  });

  const archiveForm = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("wf_forms")
        .update({ status: "archived" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wf-forms"] });
      queryClient.invalidateQueries({ queryKey: ["wf-form", data.id] });
      toast.success("Form archived");
    },
    onError: (error) => {
      toast.error("Failed to archive form: " + error.message);
    },
  });

  const deleteForm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wf_forms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-forms"] });
      toast.success("Form deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete form: " + error.message);
    },
  });

  return { createForm, updateForm, publishForm, archiveForm, deleteForm };
}

// ============================================
// FORM FIELDS HOOKS
// ============================================

export function useWfFormFieldMutations(formId: string) {
  const queryClient = useQueryClient();

  const createField = useMutation({
    mutationFn: async (field: Omit<WfFormFieldInsert, "form_id">) => {
      const { data, error } = await supabase
        .from("wf_form_fields")
        .insert({ ...field, form_id: formId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-form-fields", formId] });
    },
    onError: (error) => {
      toast.error("Failed to create field: " + error.message);
    },
  });

  const updateField = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WfFormField> & { id: string }) => {
      const { data, error } = await supabase
        .from("wf_form_fields")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-form-fields", formId] });
    },
    onError: (error) => {
      toast.error("Failed to update field: " + error.message);
    },
  });

  const deleteField = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wf_form_fields").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-form-fields", formId] });
    },
    onError: (error) => {
      toast.error("Failed to delete field: " + error.message);
    },
  });

  const reorderFields = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => 
        supabase.from("wf_form_fields").update({ sort_order: index }).eq("id", id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-form-fields", formId] });
    },
    onError: (error) => {
      toast.error("Failed to reorder fields: " + error.message);
    },
  });

  return { createField, updateField, deleteField, reorderFields };
}

// ============================================
// FORM SUBMISSIONS HOOKS
// ============================================

interface UseWfSubmissionsOptions {
  formId?: string;
  status?: WfSubmissionStatus;
}

export function useWfFormSubmissions(options: UseWfSubmissionsOptions = {}) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["wf-form-submissions", activeCompanyId, options],
    queryFn: async () => {
      let query = supabase.from("wf_form_submissions").select(`
        *,
        form:wf_forms(id, title, scope_type)
      `);

      if (options.formId) {
        query = query.eq("form_id", options.formId);
      }
      if (options.status) {
        query = query.eq("status", options.status);
      }

      const { data, error } = await query.order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId,
  });
}

export function useMyWfSubmissions() {
  return useQuery({
    queryKey: ["wf-my-submissions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("wf_form_submissions")
        .select(`
          *,
          form:wf_forms(id, title, scope_type)
        `)
        .eq("submitter_user_id", user.id)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useWfFormSubmission(submissionId: string | undefined) {
  return useQuery({
    queryKey: ["wf-form-submission", submissionId],
    queryFn: async () => {
      if (!submissionId) return null;
      const { data, error } = await supabase
        .from("wf_form_submissions")
        .select(`
          *,
          form:wf_forms(*),
          values:wf_form_submission_values(
            *,
            field:wf_form_fields(*)
          )
        `)
        .eq("id", submissionId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!submissionId,
  });
}

export function useWfSubmissionMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const submitForm = useMutation({
    mutationFn: async ({
      formId,
      values,
    }: {
      formId: string;
      values: { fieldId: string; value: string | number | Date | object | null }[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Create submission
      const { data: submission, error: subError } = await supabase
        .from("wf_form_submissions")
        .insert({
          form_id: formId,
          submitter_user_id: user?.id,
          company_context_id: activeCompanyId,
          status: "submitted",
        })
        .select()
        .single();
      if (subError) throw subError;

      // Insert values
      const valueInserts = values.map((v) => {
        const base = {
          submission_id: submission.id,
          field_id: v.fieldId,
        } as Database["public"]["Tables"]["wf_form_submission_values"]["Insert"];

        if (typeof v.value === "string") {
          base.value_text = v.value;
        } else if (typeof v.value === "number") {
          base.value_number = v.value;
        } else if (v.value instanceof Date) {
          base.value_date = v.value.toISOString().split("T")[0];
        } else if (v.value !== null && typeof v.value === "object") {
          base.value_json = JSON.parse(JSON.stringify(v.value));
        }

        return base;
      });

      if (valueInserts.length > 0) {
        const { error: valError } = await supabase
          .from("wf_form_submission_values")
          .insert(valueInserts);
        if (valError) throw valError;
      }

      return submission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wf-form-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["wf-my-submissions"] });
      toast.success("Form submitted");
    },
    onError: (error) => {
      toast.error("Failed to submit form: " + error.message);
    },
  });

  const updateSubmissionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: WfSubmissionStatus }) => {
      const { data, error } = await supabase
        .from("wf_form_submissions")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wf-form-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["wf-form-submission", data.id] });
      toast.success("Submission updated");
    },
    onError: (error) => {
      toast.error("Failed to update submission: " + error.message);
    },
  });

  return { submitForm, updateSubmissionStatus };
}

// ============================================
// FORM STATS HOOKS
// ============================================

export function useWfFormStats(formId: string | undefined) {
  return useQuery({
    queryKey: ["wf-form-stats", formId],
    queryFn: async () => {
      if (!formId) return null;

      const { data, error } = await supabase
        .from("wf_form_submissions")
        .select("id, status")
        .eq("form_id", formId);
      if (error) throw error;

      const total = data.length;
      const byStatus = data.reduce((acc, sub) => {
        acc[sub.status] = (acc[sub.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total,
        byStatus,
        completionRate: total > 0 ? ((byStatus.completed || 0) / total) * 100 : 0,
      };
    },
    enabled: !!formId,
  });
}

// Export types
export type {
  WfForm,
  WfFormField,
  WfFormSubmission,
  WfFormSubmissionValue,
  WfScopeType,
  WfStatus,
  WfFieldType,
  WfSubmissionStatus,
};
