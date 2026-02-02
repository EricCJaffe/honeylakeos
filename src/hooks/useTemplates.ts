import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export type TemplateType = "task" | "project" | "note" | "document" | "event";

export interface Template {
  id: string;
  company_id: string;
  template_type: TemplateType;
  name: string;
  description: string | null;
  payload: Record<string, any>;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useTemplates(templateType?: TemplateType) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["templates", activeCompanyId, templateType],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      
      let query = supabase
        .from("templates")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("name");

      if (templateType) {
        query = query.eq("template_type", templateType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Template[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useActiveTemplates(templateType: TemplateType) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["active-templates", activeCompanyId, templateType],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("template_type", templateType)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return (data || []) as Template[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useTemplateMutations() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createTemplate = useMutation({
    mutationFn: async ({
      templateType,
      name,
      description,
      payload,
    }: {
      templateType: TemplateType;
      name: string;
      description?: string;
      payload: Record<string, any>;
    }) => {
      if (!activeCompanyId || !user) throw new Error("Missing context");

      const { data, error } = await supabase
        .from("templates")
        .insert({
          company_id: activeCompanyId,
          template_type: templateType,
          name,
          description: description || null,
          payload,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await supabase.rpc("log_audit_event", {
        p_company_id: activeCompanyId,
        p_entity_type: "template",
        p_entity_id: data.id,
        p_action: "template.created",
        p_actor_user_id: user.id,
        p_metadata: { template_type: templateType, name },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["active-templates"] });
      toast.success("Template created");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create template");
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      payload,
      isActive,
    }: {
      id: string;
      name?: string;
      description?: string | null;
      payload?: Record<string, any>;
      isActive?: boolean;
    }) => {
      if (!activeCompanyId || !user) throw new Error("Missing context");

      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (payload !== undefined) updates.payload = payload;
      if (isActive !== undefined) updates.is_active = isActive;

      const { data, error } = await supabase
        .from("templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      const action = isActive === false ? "template.deactivated" : "template.updated";
      await supabase.rpc("log_audit_event", {
        p_company_id: activeCompanyId,
        p_entity_type: "template",
        p_entity_id: id,
        p_action: action,
        p_actor_user_id: user.id,
        p_metadata: updates,
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["active-templates"] });
      toast.success(variables.isActive === false ? "Template deactivated" : "Template updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update template");
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      if (!activeCompanyId || !user) throw new Error("Missing context");

      const { error } = await supabase.from("templates").delete().eq("id", id);
      if (error) throw error;

      // Log audit event
      await supabase.rpc("log_audit_event", {
        p_company_id: activeCompanyId,
        p_entity_type: "template",
        p_entity_id: id,
        p_action: "template.deleted",
        p_actor_user_id: user.id,
        p_metadata: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["active-templates"] });
      toast.success("Template deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete template");
    },
  });

  return { createTemplate, updateTemplate, deleteTemplate };
}

// Helper to apply template payload to form values
export function applyTemplateToForm<T extends Record<string, any>>(
  currentValues: T,
  payload: Record<string, any>,
  overwriteExisting = false
): T {
  const result = { ...currentValues };

  for (const [key, value] of Object.entries(payload)) {
    if (key in result) {
      const currentValue = result[key as keyof T];
      // Only overwrite if current is empty/null/undefined or overwrite is forced
      const isEmpty =
        currentValue === null ||
        currentValue === undefined ||
        currentValue === "" ||
        (Array.isArray(currentValue) && currentValue.length === 0);

      if (overwriteExisting || isEmpty) {
        (result as any)[key] = value;
      }
    }
  }

  return result;
}
