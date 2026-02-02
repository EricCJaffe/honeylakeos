import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { useCompanyModules } from "./useCompanyModules";
import { useLmsPermissions } from "./useModulePermissions";
import { toast } from "sonner";

export type PathStatus = "draft" | "published" | "archived";
export type Visibility = "company_private" | "company_public";

export interface LmsLearningPath {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  visibility: Visibility;
  status: PathStatus;
  estimated_hours: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CreatePathInput {
  title: string;
  description?: string;
  cover_image_url?: string;
  visibility?: Visibility;
  status?: PathStatus;
  estimated_hours?: number;
}

export interface UpdatePathInput {
  title?: string;
  description?: string;
  cover_image_url?: string | null;
  visibility?: Visibility;
  status?: PathStatus;
  estimated_hours?: number | null;
}

export interface PathFilters {
  status?: PathStatus | "all";
  visibility?: Visibility | "all";
  search?: string;
}

export function useLmsLearningPaths(filters: PathFilters = {}) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  return useQuery({
    queryKey: ["lms-paths", activeCompanyId, filters],
    queryFn: async () => {
      if (!activeCompanyId || !lmsEnabled) return [];

      let query = supabase
        .from("lms_learning_paths")
        .select("*")
        .eq("company_id", activeCompanyId)
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.visibility && filters.visibility !== "all") {
        query = query.eq("visibility", filters.visibility);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as LmsLearningPath[];
    },
    enabled: !!activeCompanyId && lmsEnabled,
  });
}

export function useLmsLearningPath(pathId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  return useQuery({
    queryKey: ["lms-path", pathId],
    queryFn: async () => {
      if (!pathId || !activeCompanyId || !lmsEnabled) return null;

      const { data, error } = await supabase
        .from("lms_learning_paths")
        .select("*")
        .eq("id", pathId)
        .eq("company_id", activeCompanyId)
        .maybeSingle();

      if (error) throw error;
      return data as LmsLearningPath | null;
    },
    enabled: !!pathId && !!activeCompanyId && lmsEnabled,
  });
}

export function useLmsLearningPathMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { log } = useAuditLog();
  const permissions = useLmsPermissions();

  const createPath = useMutation({
    mutationFn: async (input: CreatePathInput) => {
      if (!activeCompanyId) throw new Error("No active company");
      permissions.assertCapability("canCreate", "create learning path");

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("lms_learning_paths")
        .insert({
          company_id: activeCompanyId,
          title: input.title,
          description: input.description || null,
          cover_image_url: input.cover_image_url || null,
          visibility: input.visibility || "company_private",
          status: input.status || "draft",
          estimated_hours: input.estimated_hours || null,
          created_by: userData.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LmsLearningPath;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lms-paths"] });
      log("lms.path_created", "lms_learning_path", data.id, { title: data.title });
      toast.success("Learning path created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create learning path: ${error.message}`);
    },
  });

  const updatePath = useMutation({
    mutationFn: async ({ id, ...input }: UpdatePathInput & { id: string }) => {
      if (input.status === "published") {
        permissions.assertCapability("canPublish", "publish learning path");
      } else {
        permissions.assertCapability("canEdit", "update learning path");
      }

      const { data, error } = await supabase
        .from("lms_learning_paths")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as LmsLearningPath;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lms-paths"] });
      queryClient.invalidateQueries({ queryKey: ["lms-path", data.id] });
      log("lms.path_updated", "lms_learning_path", data.id, { title: data.title });
      toast.success("Learning path updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update learning path: ${error.message}`);
    },
  });

  const publishPath = useMutation({
    mutationFn: async (pathId: string) => {
      permissions.assertCapability("canPublish", "publish learning path");

      const { data, error } = await supabase
        .from("lms_learning_paths")
        .update({ status: "published", updated_at: new Date().toISOString() })
        .eq("id", pathId)
        .select()
        .single();

      if (error) throw error;
      return data as LmsLearningPath;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lms-paths"] });
      queryClient.invalidateQueries({ queryKey: ["lms-path", data.id] });
      log("lms.path_published", "lms_learning_path", data.id, { title: data.title });
      toast.success("Learning path published successfully");
    },
    onError: (error) => {
      toast.error(`Failed to publish learning path: ${error.message}`);
    },
  });

  const archivePath = useMutation({
    mutationFn: async (pathId: string) => {
      const { data, error } = await supabase
        .from("lms_learning_paths")
        .update({ 
          status: "archived", 
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq("id", pathId)
        .select()
        .single();

      if (error) throw error;
      return data as LmsLearningPath;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lms-paths"] });
      queryClient.invalidateQueries({ queryKey: ["lms-path", data.id] });
      log("lms.path_archived", "lms_learning_path", data.id, { title: data.title });
      toast.success("Learning path archived successfully");
    },
    onError: (error) => {
      toast.error(`Failed to archive learning path: ${error.message}`);
    },
  });

  const deletePath = useMutation({
    mutationFn: async (pathId: string) => {
      const { error } = await supabase.from("lms_learning_paths").delete().eq("id", pathId);
      if (error) throw error;
      return pathId;
    },
    onSuccess: (pathId) => {
      queryClient.invalidateQueries({ queryKey: ["lms-paths"] });
      log("lms.path_deleted", "lms_learning_path", pathId, {});
      toast.success("Learning path deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete learning path: ${error.message}`);
    },
  });

  return { createPath, updatePath, publishPath, archivePath, deletePath };
}

export function getPathStatusLabel(status: PathStatus): string {
  switch (status) {
    case "draft": return "Draft";
    case "published": return "Published";
    case "archived": return "Archived";
    default: return status;
  }
}

export function getPathStatusColor(status: PathStatus): string {
  switch (status) {
    case "draft": return "bg-muted text-muted-foreground";
    case "published": return "bg-primary/10 text-primary";
    case "archived": return "bg-destructive/10 text-destructive";
    default: return "bg-muted";
  }
}
