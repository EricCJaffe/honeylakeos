import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuth } from "@/lib/auth";
import { useAuditLog } from "./useAuditLog";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { STALE_TIMES } from "@/lib/queryConfig";

// ============================================================================
// Types
// ============================================================================

export type FolderScope = "company" | "personal";
export type FolderAccessLevel = "view" | "edit" | "admin";

export interface Folder extends Tables<"folders"> {
  scope: FolderScope;
  owner_user_id: string | null;
  sort_order: number;
  archived_at: string | null;
  children?: Folder[];
  effective_access?: FolderAccessLevel | null;
}

export interface FolderAcl extends Tables<"folder_acl"> {}

export interface CreateFolderInput {
  name: string;
  scope: FolderScope;
  parent_folder_id?: string | null;
}

export interface UpdateFolderInput {
  id: string;
  name?: string;
  parent_folder_id?: string | null;
  sort_order?: number;
}

export interface FolderTree {
  companyFolders: Folder[];
  personalFolders: Folder[];
}

// ============================================================================
// Query Keys
// ============================================================================

const QUERY_KEYS = {
  all: ["folders"] as const,
  list: (companyId: string) => [...QUERY_KEYS.all, "list", companyId] as const,
  tree: (companyId: string) => [...QUERY_KEYS.all, "tree", companyId] as const,
  detail: (id: string) => [...QUERY_KEYS.all, "detail", id] as const,
  acl: (folderId: string) => [...QUERY_KEYS.all, "acl", folderId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Build a tree structure from flat folder list
 */
function buildFolderTree(folders: Folder[], parentId: string | null = null): Folder[] {
  return folders
    .filter((f) => f.parent_folder_id === parentId)
    .map((f) => ({
      ...f,
      children: buildFolderTree(folders, f.id),
    }))
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

/**
 * Fetch folders for the active company, split into company/personal trees
 */
export function useFolders() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.tree(activeCompanyId ?? ""),
    queryFn: async (): Promise<FolderTree> => {
      if (!activeCompanyId || !user) {
        return { companyFolders: [], personalFolders: [] };
      }

      // Fetch both company folders and user's personal folders
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .or(`company_id.eq.${activeCompanyId},owner_user_id.eq.${user.id}`)
        .is("archived_at", null)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;

      const folders = (data ?? []) as Folder[];
      
      // Split by scope
      const companyFolders = folders.filter((f) => f.scope === "company");
      const personalFolders = folders.filter(
        (f) => f.scope === "personal" && f.owner_user_id === user.id
      );

      return {
        companyFolders: buildFolderTree(companyFolders),
        personalFolders: buildFolderTree(personalFolders),
      };
    },
    enabled: !!activeCompanyId && !!user,
    staleTime: STALE_TIMES.SEMI_STATIC, // 5 minutes - folder structure rarely changes
    gcTime: STALE_TIMES.SEMI_STATIC * 2,
  });
}

/**
 * Get a single folder by ID
 */
export function useFolder(folderId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(folderId ?? ""),
    queryFn: async () => {
      if (!folderId) return null;

      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .eq("id", folderId)
        .single();

      if (error) throw error;
      return data as Folder;
    },
    enabled: !!folderId,
  });
}

/**
 * Get ACL entries for a folder
 */
export function useFolderAcl(folderId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.acl(folderId ?? ""),
    queryFn: async () => {
      if (!folderId) return [];

      const { data, error } = await supabase
        .from("folder_acl")
        .select("*")
        .eq("folder_id", folderId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as FolderAcl[];
    },
    enabled: !!folderId,
  });
}

/**
 * CRUD mutations for folders
 */
export function useFolderMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId, isCompanyAdmin } = useActiveCompany();
  const { user } = useAuth();
  const { log } = useAuditLog();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
  };

  const create = useMutation({
    mutationFn: async (input: CreateFolderInput) => {
      if (!activeCompanyId || !user) throw new Error("No active company");

      // Use RPC for auto sort_order
      const { data, error } = await supabase.rpc("folder_create", {
        p_name: input.name,
        p_scope: input.scope,
        p_parent_folder_id: input.parent_folder_id || null,
        p_company_id: activeCompanyId,
      });

      if (error) throw error;
      
      // Fetch the created folder
      const { data: folder, error: fetchError } = await supabase
        .from("folders")
        .select("*")
        .eq("id", data)
        .single();
      
      if (fetchError) throw fetchError;
      return folder as Folder;
    },
    onSuccess: async (data) => {
      invalidate();
      toast.success("Folder created");
    },
    onError: (error: Error) => {
      console.error("Failed to create folder:", error);
      if (error.message.includes("nesting depth") || error.message.includes("depth")) {
        toast.error("Maximum folder depth (5 levels) exceeded");
      } else if (error.message.includes("cycle")) {
        toast.error("Invalid folder hierarchy");
      } else if (error.message.includes("scope")) {
        toast.error("Cannot nest personal folder in company folder or vice versa");
      } else {
        toast.error("Failed to create folder");
      }
    },
  });

  const update = useMutation({
    mutationFn: async (input: UpdateFolderInput) => {
      const { id, name, ...rest } = input;

      if (name) {
        // Use RPC for rename
        const { error } = await supabase.rpc("folder_rename", {
          p_folder_id: id,
          p_name: name,
        });
        if (error) throw error;
      }

      if (rest.parent_folder_id !== undefined) {
        // Use RPC for move
        const { error } = await supabase.rpc("folder_move", {
          p_folder_id: id,
          p_new_parent_folder_id: rest.parent_folder_id,
          p_new_index: rest.sort_order ?? null,
        });
        if (error) throw error;
      }

      // Fetch updated folder
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Folder;
    },
    onSuccess: async (data) => {
      invalidate();
      toast.success("Folder updated");
    },
    onError: (error: Error) => {
      console.error("Failed to update folder:", error);
      if (error.message.includes("nesting depth") || error.message.includes("depth")) {
        toast.error("Maximum folder depth (5 levels) exceeded");
      } else if (error.message.includes("cycle") || error.message.includes("descendant")) {
        toast.error("Cannot move folder into itself");
      } else if (error.message.includes("scope")) {
        toast.error("Cannot move between personal and company folders");
      } else {
        toast.error("Failed to update folder");
      }
    },
  });

  const archive = useMutation({
    mutationFn: async (folderId: string) => {
      const { data, error } = await supabase
        .from("folders")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", folderId)
        .select()
        .single();

      if (error) throw error;
      return data as Folder;
    },
    onSuccess: async (data) => {
      await log("folder.archived", "folder", data.id, { name: data.name });
      invalidate();
      toast.success("Folder archived");
    },
    onError: () => {
      toast.error("Failed to archive folder");
    },
  });

  const remove = useMutation({
    mutationFn: async (folderId: string) => {
      // Get folder name for toast
      const { data: folder } = await supabase
        .from("folders")
        .select("name")
        .eq("id", folderId)
        .single();

      // Use RPC which handles moving children and unfiling items
      const { error } = await supabase.rpc("folder_delete", {
        p_folder_id: folderId,
      });
      if (error) throw error;

      return { id: folderId, name: folder?.name };
    },
    onSuccess: async (result) => {
      invalidate();
      toast.success("Folder deleted");
    },
    onError: () => {
      toast.error("Failed to delete folder");
    },
  });

  const reorder = useMutation({
    mutationFn: async ({ folderId, newIndex }: { folderId: string; newIndex: number }) => {
      const { error } = await supabase.rpc("folder_reorder", {
        p_folder_id: folderId,
        p_new_index: newIndex,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
    },
    onError: () => {
      toast.error("Failed to reorder folder");
    },
  });

  return {
    create,
    update,
    archive,
    remove,
    reorder,
    isCompanyAdmin,
  };
}

/**
 * Mutations for folder ACL entries
 */
export function useFolderAclMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { log } = useAuditLog();

  const invalidate = (folderId: string) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.acl(folderId) });
  };

  const addAcl = useMutation({
    mutationFn: async (input: {
      folderId: string;
      principalType: "user" | "group";
      principalId: string;
      accessLevel: FolderAccessLevel;
    }) => {
      if (!activeCompanyId || !user) throw new Error("No context");

      const { data, error } = await supabase
        .from("folder_acl")
        .insert({
          company_id: activeCompanyId,
          folder_id: input.folderId,
          principal_type: input.principalType,
          principal_id: input.principalId,
          access_level: input.accessLevel,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await log("folder.acl_added", "folder", data.folder_id, {
        principal_type: data.principal_type,
        access_level: data.access_level,
      });
      invalidate(data.folder_id);
      toast.success("Access granted");
    },
    onError: () => {
      toast.error("Failed to grant access");
    },
  });

  const updateAcl = useMutation({
    mutationFn: async (input: { id: string; folderId: string; accessLevel: FolderAccessLevel }) => {
      const { data, error } = await supabase
        .from("folder_acl")
        .update({ access_level: input.accessLevel, updated_at: new Date().toISOString() })
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, folderId: input.folderId };
    },
    onSuccess: async (data) => {
      await log("folder.acl_updated", "folder", data.folderId, {
        access_level: data.access_level,
      });
      invalidate(data.folderId);
      toast.success("Access updated");
    },
    onError: () => {
      toast.error("Failed to update access");
    },
  });

  const removeAcl = useMutation({
    mutationFn: async (input: { id: string; folderId: string }) => {
      const { error } = await supabase.from("folder_acl").delete().eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: async (result) => {
      await log("folder.acl_removed", "folder", result.folderId, {});
      invalidate(result.folderId);
      toast.success("Access revoked");
    },
    onError: () => {
      toast.error("Failed to revoke access");
    },
  });

  return {
    addAcl,
    updateAcl,
    removeAcl,
  };
}

/**
 * Hook for bulk moving documents/notes to folders
 */
export function useFolderItemMutations() {
  const queryClient = useQueryClient();

  const moveDocuments = useMutation({
    mutationFn: async ({ documentIds, folderId }: { documentIds: string[]; folderId: string | null }) => {
      const { error } = await supabase.rpc("move_documents_to_folder", {
        p_document_ids: documentIds,
        p_folder_id: folderId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document"] });
      toast.success("Documents moved");
    },
    onError: () => {
      toast.error("Failed to move documents");
    },
  });

  const moveNotes = useMutation({
    mutationFn: async ({ noteIds, folderId }: { noteIds: string[]; folderId: string | null }) => {
      const { error } = await supabase.rpc("move_notes_to_folder", {
        p_note_ids: noteIds,
        p_folder_id: folderId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note"] });
      toast.success("Notes moved");
    },
    onError: () => {
      toast.error("Failed to move notes");
    },
  });

  return { moveDocuments, moveNotes };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Flatten a folder tree for select dropdown options
 */
export function flattenFolderTree(
  folders: Folder[],
  depth = 0,
  result: Array<{ folder: Folder; depth: number }> = []
): Array<{ folder: Folder; depth: number }> {
  for (const folder of folders) {
    result.push({ folder, depth });
    if (folder.children?.length) {
      flattenFolderTree(folder.children, depth + 1, result);
    }
  }
  return result;
}
