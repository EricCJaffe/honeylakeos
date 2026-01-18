import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ResourceType = Database["public"]["Enums"]["resource_type"];

export interface Resource {
  id: string;
  company_id: string;
  department_id: string | null;
  title: string;
  description: string | null;
  resource_type: ResourceType;
  content_ref: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  department?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateResourceInput {
  title: string;
  description?: string;
  resource_type: ResourceType;
  content_ref: string;
  department_id?: string | null;
}

export interface UpdateResourceInput {
  title?: string;
  description?: string | null;
  resource_type?: ResourceType;
  content_ref?: string;
  is_archived?: boolean;
}

/** Fetch universal resources (company-wide, department_id IS NULL) */
export function useUniversalResources() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["resources", "universal", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("company_id", activeCompanyId)
        .is("department_id", null)
        .eq("is_archived", false)
        .order("title");

      if (error) throw error;
      return data as Resource[];
    },
    enabled: !!activeCompanyId,
  });
}

/** Fetch resources for a specific department */
export function useDepartmentResources(departmentId: string | undefined) {
  return useQuery({
    queryKey: ["resources", "department", departmentId],
    queryFn: async () => {
      if (!departmentId) return [];

      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("department_id", departmentId)
        .eq("is_archived", false)
        .order("title");

      if (error) throw error;
      return data as Resource[];
    },
    enabled: !!departmentId,
  });
}

/** Fetch all resources (universal + department) accessible to user */
export function useAllResources() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["resources", "all", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("resources")
        .select(`
          *,
          department:departments(id, name)
        `)
        .eq("company_id", activeCompanyId)
        .eq("is_archived", false)
        .order("title");

      if (error) throw error;
      return data as Resource[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useResource(resourceId: string | undefined) {
  return useQuery({
    queryKey: ["resource", resourceId],
    queryFn: async () => {
      if (!resourceId) return null;

      const { data, error } = await supabase
        .from("resources")
        .select(`
          *,
          department:departments(id, name)
        `)
        .eq("id", resourceId)
        .single();

      if (error) throw error;
      return data as Resource;
    },
    enabled: !!resourceId,
  });
}

export function useResourceMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { log } = useAuditLog();

  const createResource = useMutation({
    mutationFn: async (input: CreateResourceInput) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("resources")
        .insert({
          company_id: activeCompanyId,
          title: input.title,
          description: input.description || null,
          resource_type: input.resource_type,
          content_ref: input.content_ref,
          department_id: input.department_id || null,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await log({
        action: "resource.created",
        entityType: "resource",
        entityId: data.id,
        metadata: {
          title: input.title,
          resource_type: input.resource_type,
          department_id: input.department_id || null,
        },
      });

      return data as Resource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Resource created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateResource = useMutation({
    mutationFn: async ({ id, ...input }: UpdateResourceInput & { id: string }) => {
      const { data, error } = await supabase
        .from("resources")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await log({
        action: "resource.updated",
        entityType: "resource",
        entityId: id,
        metadata: input,
      });

      return data as Resource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["resource"] });
      toast.success("Resource updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteResource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("resources")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await log({
        action: "resource.deleted",
        entityType: "resource",
        entityId: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Resource deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const archiveResource = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("resources")
        .update({ is_archived: true })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await log({
        action: "resource.archived",
        entityType: "resource",
        entityId: id,
      });

      return data as Resource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Resource archived");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    createResource,
    updateResource,
    deleteResource,
    archiveResource,
  };
}
