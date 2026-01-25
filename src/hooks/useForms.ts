import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { useModuleAccess } from "./useModuleAccess";
import { useFormsPermissions, PermissionError } from "./useModulePermissions";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// ============================================================================
// Types
// ============================================================================

export type FormStatus = "draft" | "published" | "archived";
export type FieldType = "short_text" | "long_text" | "email" | "phone" | "dropdown" | "checkbox" | "date";
export type FieldMapping = "contact_name" | "contact_email" | "contact_phone" | "contact_organization" | "crm_notes" | null;

export interface Form extends Tables<"forms"> {
  fields?: FormField[];
}

export interface FormField extends Tables<"form_fields"> {}

export interface FormFilters {
  status?: FormStatus;
  search?: string;
}

export interface CreateFormInput {
  name: string;
  description?: string;
}

export interface UpdateFormInput {
  name?: string;
  description?: string;
  status?: FormStatus;
  action_create_contact?: boolean;
  action_create_crm?: boolean;
  action_crm_lifecycle_status?: string;
  action_create_task?: boolean;
  action_task_title_template?: string;
}

export interface CreateFieldInput {
  form_id: string;
  field_type: FieldType;
  label: string;
  placeholder?: string;
  helper_text?: string;
  is_required?: boolean;
  sort_order?: number;
  options?: string[];
  maps_to?: FieldMapping;
}

export interface UpdateFieldInput {
  label?: string;
  placeholder?: string;
  helper_text?: string;
  is_required?: boolean;
  sort_order?: number;
  options?: string[];
  maps_to?: FieldMapping;
}

// ============================================================================
// Query Keys
// ============================================================================

const QUERY_KEYS = {
  all: ["forms"] as const,
  lists: () => [...QUERY_KEYS.all, "list"] as const,
  list: (companyId: string, filters?: FormFilters) => [...QUERY_KEYS.lists(), companyId, filters] as const,
  details: () => [...QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...QUERY_KEYS.details(), id] as const,
  fields: (formId: string) => ["form-fields", formId] as const,
};

// ============================================================================
// Form Hooks
// ============================================================================

export function useForms(filters: FormFilters = {}) {
  const { activeCompanyId } = useActiveCompany();
  const { hasAccess, loading: moduleLoading } = useModuleAccess("forms");
  const permissions = useFormsPermissions();
  const { log: logAudit } = useAuditLog();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.list(activeCompanyId ?? "", filters),
    queryFn: async () => {
      if (!activeCompanyId || !hasAccess) return [];

      let queryBuilder = supabase
        .from("forms")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("updated_at", { ascending: false });

      if (filters.status) {
        queryBuilder = queryBuilder.eq("status", filters.status);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;

      // Client-side search
      let results = data as Form[];
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter(
          (form) =>
            form.name.toLowerCase().includes(searchLower) ||
            form.description?.toLowerCase().includes(searchLower)
        );
      }

      return results;
    },
    enabled: !!activeCompanyId && !moduleLoading && hasAccess,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateFormInput) => {
      if (!activeCompanyId || !hasAccess) throw new Error("No access");
      
      // Permission check
      permissions.assertCapability("canCreate", "create form");
      const { data: user } = await supabase.auth.getUser();

      const insertData: TablesInsert<"forms"> = {
        company_id: activeCompanyId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        status: "draft",
        created_by: user.user?.id || null,
      };

      const { data, error } = await supabase
        .from("forms")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as Form;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      logAudit("form.created", "form", data.id, { name: data.name });
      toast.success("Form created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create form");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateFormInput }) => {
      if (!hasAccess) throw new Error("Module not enabled");
      
      // Permission check - use canPublish for status changes to published
      if (input.status === "published") {
        permissions.assertCapability("canPublish", "publish form");
      } else {
        permissions.assertCapability("canEdit", "update form");
      }

      const updateData: TablesUpdate<"forms"> = {};
      if (input.name !== undefined) updateData.name = input.name.trim();
      if (input.description !== undefined) updateData.description = input.description?.trim() || null;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.action_create_contact !== undefined) updateData.action_create_contact = input.action_create_contact;
      if (input.action_create_crm !== undefined) updateData.action_create_crm = input.action_create_crm;
      if (input.action_crm_lifecycle_status !== undefined) updateData.action_crm_lifecycle_status = input.action_crm_lifecycle_status;
      if (input.action_create_task !== undefined) updateData.action_create_task = input.action_create_task;
      if (input.action_task_title_template !== undefined) updateData.action_task_title_template = input.action_task_title_template;

      const { data, error } = await supabase
        .from("forms")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Form;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      const action = variables.input.status === "published" ? "form.published" :
                     variables.input.status === "archived" ? "form.archived" : "form.updated";
      logAudit(action as any, "form", data.id, { name: data.name, status: data.status });
      toast.success(
        variables.input.status === "published" ? "Form published" :
        variables.input.status === "archived" ? "Form archived" : "Form updated"
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update form");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!hasAccess) throw new Error("Module not enabled");
      
      // Permission check
      permissions.assertCapability("canDelete", "delete form");

      const { error } = await supabase.from("forms").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      logAudit("form.deleted", "form", id, {});
      toast.success("Form deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete form");
    },
  });

  return {
    forms: query.data || [],
    isLoading: query.isLoading || moduleLoading,
    error: query.error,
    hasAccess,
    permissions,
    createForm: createMutation.mutateAsync,
    updateForm: updateMutation.mutateAsync,
    deleteForm: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}

export function useForm(id: string | undefined) {
  const { hasAccess, loading: moduleLoading } = useModuleAccess("forms");

  return useQuery({
    queryKey: QUERY_KEYS.detail(id ?? ""),
    queryFn: async () => {
      if (!id || !hasAccess) return null;

      const { data, error } = await supabase
        .from("forms")
        .select(`
          *,
          fields:form_fields(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      
      // Sort fields by sort_order
      if (data.fields) {
        data.fields.sort((a: FormField, b: FormField) => a.sort_order - b.sort_order);
      }
      
      return data as Form;
    },
    enabled: !!id && !moduleLoading && hasAccess,
  });
}

// ============================================================================
// Field Hooks
// ============================================================================

export function useFormFields(formId: string | undefined) {
  const { hasAccess, loading: moduleLoading } = useModuleAccess("forms");
  const { log: logAudit } = useAuditLog();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.fields(formId ?? ""),
    queryFn: async () => {
      if (!formId || !hasAccess) return [];

      const { data, error } = await supabase
        .from("form_fields")
        .select("*")
        .eq("form_id", formId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as FormField[];
    },
    enabled: !!formId && !moduleLoading && hasAccess,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateFieldInput) => {
      if (!hasAccess) throw new Error("Module not enabled");

      const insertData: TablesInsert<"form_fields"> = {
        form_id: input.form_id,
        field_type: input.field_type,
        label: input.label.trim(),
        placeholder: input.placeholder?.trim() || null,
        helper_text: input.helper_text?.trim() || null,
        is_required: input.is_required ?? false,
        sort_order: input.sort_order ?? 0,
        options: input.options || [],
        maps_to: input.maps_to || null,
      };

      const { data, error } = await supabase
        .from("form_fields")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as FormField;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fields(data.form_id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(data.form_id) });
      logAudit("form.field_added", "form", data.form_id, { field_id: data.id, label: data.label });
      toast.success("Field added");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add field");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateFieldInput }) => {
      if (!hasAccess) throw new Error("Module not enabled");

      const updateData: TablesUpdate<"form_fields"> = {};
      if (input.label !== undefined) updateData.label = input.label.trim();
      if (input.placeholder !== undefined) updateData.placeholder = input.placeholder?.trim() || null;
      if (input.helper_text !== undefined) updateData.helper_text = input.helper_text?.trim() || null;
      if (input.is_required !== undefined) updateData.is_required = input.is_required;
      if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;
      if (input.options !== undefined) updateData.options = input.options;
      if (input.maps_to !== undefined) updateData.maps_to = input.maps_to;

      const { data, error } = await supabase
        .from("form_fields")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as FormField;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fields(data.form_id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(data.form_id) });
      logAudit("form.field_updated", "form", data.form_id, { field_id: data.id });
      toast.success("Field updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update field");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!hasAccess) throw new Error("Module not enabled");

      // Get field info first for audit
      const { data: field } = await supabase
        .from("form_fields")
        .select("form_id, label")
        .eq("id", id)
        .single();

      const { error } = await supabase.from("form_fields").delete().eq("id", id);
      if (error) throw error;
      return { id, formId: field?.form_id, label: field?.label };
    },
    onSuccess: (result) => {
      if (result.formId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fields(result.formId) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(result.formId) });
        logAudit("form.field_removed", "form", result.formId, { field_id: result.id, label: result.label });
      }
      toast.success("Field removed");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove field");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      if (!hasAccess) throw new Error("Module not enabled");

      const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("form_fields")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
        if (error) throw error;
      }

      return orderedIds;
    },
    onSuccess: () => {
      if (formId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fields(formId) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(formId) });
        logAudit("form.fields_reordered", "form", formId, {});
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reorder fields");
    },
  });

  return {
    fields: query.data || [],
    isLoading: query.isLoading || moduleLoading,
    error: query.error,
    createField: createMutation.mutateAsync,
    updateField: updateMutation.mutateAsync,
    deleteField: deleteMutation.mutateAsync,
    reorderFields: reorderMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getFieldTypeLabel(type: FieldType): string {
  const labels: Record<FieldType, string> = {
    short_text: "Short Text",
    long_text: "Long Text",
    email: "Email",
    phone: "Phone",
    dropdown: "Dropdown",
    checkbox: "Checkbox",
    date: "Date",
  };
  return labels[type] || type;
}

export function getFieldMappingLabel(mapping: FieldMapping): string {
  if (!mapping) return "None";
  const labels: Record<string, string> = {
    contact_name: "Contact Name",
    contact_email: "Contact Email",
    contact_phone: "Contact Phone",
    contact_organization: "Organization",
    crm_notes: "CRM Notes",
  };
  return labels[mapping] || mapping;
}

export function getStatusBadgeVariant(status: FormStatus): "default" | "secondary" | "outline" {
  switch (status) {
    case "published":
      return "default";
    case "draft":
      return "secondary";
    case "archived":
      return "outline";
    default:
      return "secondary";
  }
}
