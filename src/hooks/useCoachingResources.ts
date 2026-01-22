import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCoachingRole } from "./useCoachingRole";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ResourceType = Database["public"]["Enums"]["coaching_resource_type"];
type ResourceStatus = Database["public"]["Enums"]["coaching_resource_status"];
type AssignableType = Database["public"]["Enums"]["coaching_assignable_type"];
type AssignmentStatus = Database["public"]["Enums"]["coaching_assignment_status"];
type ProgressStatus = Database["public"]["Enums"]["coaching_progress_status"];

export interface CoachingResource {
  id: string;
  coaching_org_id: string;
  title: string;
  description: string | null;
  resource_type: ResourceType;
  url: string | null;
  file_id: string | null;
  tags: string[] | null;
  program_key: string | null;
  status: ResourceStatus;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CoachingResourceCollection {
  id: string;
  coaching_org_id: string;
  name: string;
  description: string | null;
  program_key: string | null;
  status: ResourceStatus;
  created_at: string;
  updated_at: string;
  items?: CoachingResourceCollectionItem[];
}

export interface CoachingResourceCollectionItem {
  id: string;
  collection_id: string;
  resource_id: string;
  item_order: number;
  created_at: string;
  updated_at: string;
  resource?: CoachingResource;
}

export interface CoachingResourceAssignment {
  id: string;
  coaching_org_id: string;
  coaching_engagement_id: string | null;
  member_user_id: string | null;
  assignable_type: AssignableType;
  resource_id: string | null;
  collection_id: string | null;
  title_override: string | null;
  due_at: string | null;
  status: AssignmentStatus;
  assigned_by_user_id: string;
  assigned_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  resource?: CoachingResource;
  collection?: CoachingResourceCollection;
}

export interface CoachingResourceProgress {
  id: string;
  assignment_id: string;
  user_id: string;
  status: ProgressStatus;
  viewed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Resources
// ============================================================

export function useCoachingResources(coachingOrgId?: string | null) {
  const { activeCoachingOrgId } = useCoachingRole();
  const orgId = coachingOrgId ?? activeCoachingOrgId;

  return useQuery({
    queryKey: ["coaching-resources", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("coaching_resources")
        .select("*")
        .eq("coaching_org_id", orgId)
        .eq("status", "active")
        .order("title");

      if (error) throw error;
      return data as CoachingResource[];
    },
    enabled: !!orgId,
  });
}

export function useCoachingResource(resourceId?: string | null) {
  return useQuery({
    queryKey: ["coaching-resource", resourceId],
    queryFn: async () => {
      if (!resourceId) return null;

      const { data, error } = await supabase
        .from("coaching_resources")
        .select("*")
        .eq("id", resourceId)
        .single();

      if (error) throw error;
      return data as CoachingResource;
    },
    enabled: !!resourceId,
  });
}

export interface CreateResourceInput {
  title: string;
  description?: string;
  resource_type: ResourceType;
  url?: string;
  file_id?: string;
  tags?: string[];
  program_key?: string;
}

export interface UpdateResourceInput {
  title?: string;
  description?: string | null;
  resource_type?: ResourceType;
  url?: string | null;
  file_id?: string | null;
  tags?: string[] | null;
  program_key?: string | null;
  status?: ResourceStatus;
}

export function useCoachingResourceMutations() {
  const queryClient = useQueryClient();
  const { activeCoachingOrgId } = useCoachingRole();

  const createResource = useMutation({
    mutationFn: async (input: CreateResourceInput) => {
      if (!activeCoachingOrgId) throw new Error("No active coaching org");

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("coaching_resources")
        .insert({
          coaching_org_id: activeCoachingOrgId,
          title: input.title,
          description: input.description || null,
          resource_type: input.resource_type,
          url: input.url || null,
          file_id: input.file_id || null,
          tags: input.tags || null,
          program_key: input.program_key || null,
          created_by_user_id: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CoachingResource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-resources"] });
      toast.success("Resource created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateResource = useMutation({
    mutationFn: async ({ id, ...input }: UpdateResourceInput & { id: string }) => {
      const { data, error } = await supabase
        .from("coaching_resources")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CoachingResource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-resources"] });
      queryClient.invalidateQueries({ queryKey: ["coaching-resource"] });
      toast.success("Resource updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const archiveResource = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("coaching_resources")
        .update({ status: "archived" as const })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CoachingResource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-resources"] });
      toast.success("Resource archived");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteResource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("coaching_resources")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-resources"] });
      toast.success("Resource deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    createResource,
    updateResource,
    archiveResource,
    deleteResource,
  };
}

// ============================================================
// Collections
// ============================================================

export function useCoachingCollections(coachingOrgId?: string | null) {
  const { activeCoachingOrgId } = useCoachingRole();
  const orgId = coachingOrgId ?? activeCoachingOrgId;

  return useQuery({
    queryKey: ["coaching-collections", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("coaching_resource_collections")
        .select(`
          *,
          items:coaching_resource_collection_items(
            *,
            resource:coaching_resources(*)
          )
        `)
        .eq("coaching_org_id", orgId)
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      return data as CoachingResourceCollection[];
    },
    enabled: !!orgId,
  });
}

export interface CreateCollectionInput {
  name: string;
  description?: string;
  program_key?: string;
}

export interface UpdateCollectionInput {
  name?: string;
  description?: string | null;
  program_key?: string | null;
  status?: ResourceStatus;
}

export function useCoachingCollectionMutations() {
  const queryClient = useQueryClient();
  const { activeCoachingOrgId } = useCoachingRole();

  const createCollection = useMutation({
    mutationFn: async (input: CreateCollectionInput) => {
      if (!activeCoachingOrgId) throw new Error("No active coaching org");

      const { data, error } = await supabase
        .from("coaching_resource_collections")
        .insert({
          coaching_org_id: activeCoachingOrgId,
          name: input.name,
          description: input.description || null,
          program_key: input.program_key || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CoachingResourceCollection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-collections"] });
      toast.success("Collection created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateCollection = useMutation({
    mutationFn: async ({ id, ...input }: UpdateCollectionInput & { id: string }) => {
      const { data, error } = await supabase
        .from("coaching_resource_collections")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CoachingResourceCollection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-collections"] });
      toast.success("Collection updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const archiveCollection = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("coaching_resource_collections")
        .update({ status: "archived" as const })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CoachingResourceCollection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-collections"] });
      toast.success("Collection archived");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const addItemToCollection = useMutation({
    mutationFn: async ({
      collectionId,
      resourceId,
      itemOrder,
    }: {
      collectionId: string;
      resourceId: string;
      itemOrder: number;
    }) => {
      const { data, error } = await supabase
        .from("coaching_resource_collection_items")
        .insert({
          collection_id: collectionId,
          resource_id: resourceId,
          item_order: itemOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CoachingResourceCollectionItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-collections"] });
      toast.success("Resource added to collection");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeItemFromCollection = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("coaching_resource_collection_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-collections"] });
      toast.success("Resource removed from collection");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    createCollection,
    updateCollection,
    archiveCollection,
    addItemToCollection,
    removeItemFromCollection,
  };
}

// ============================================================
// Assignments
// ============================================================

export function useCoachingResourceAssignments(filters?: {
  coachingOrgId?: string | null;
  engagementId?: string | null;
  userId?: string | null;
  status?: AssignmentStatus;
}) {
  const { activeCoachingOrgId } = useCoachingRole();
  const orgId = filters?.coachingOrgId ?? activeCoachingOrgId;

  return useQuery({
    queryKey: ["coaching-resource-assignments", filters, orgId],
    queryFn: async () => {
      let query = supabase
        .from("coaching_resource_assignments")
        .select(`
          *,
          resource:coaching_resources(*),
          collection:coaching_resource_collections(*)
        `)
        .order("assigned_at", { ascending: false });

      if (orgId) {
        query = query.eq("coaching_org_id", orgId);
      }
      if (filters?.engagementId) {
        query = query.eq("coaching_engagement_id", filters.engagementId);
      }
      if (filters?.userId) {
        query = query.eq("member_user_id", filters.userId);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CoachingResourceAssignment[];
    },
    enabled: !!orgId || !!filters?.engagementId || !!filters?.userId,
  });
}

export function useMyResourceAssignments() {
  return useQuery({
    queryKey: ["my-coaching-resource-assignments"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      // Get assignments directly to user OR through engagement membership
      const { data: directAssignments, error: directError } = await supabase
        .from("coaching_resource_assignments")
        .select(`
          *,
          resource:coaching_resources(*),
          collection:coaching_resource_collections(*)
        `)
        .eq("member_user_id", user.user.id)
        .neq("status", "cancelled")
        .order("due_at", { ascending: true, nullsFirst: false });

      if (directError) throw directError;

      // Get assignments through engagements
      const { data: engagementAssignments, error: engError } = await supabase
        .from("coaching_resource_assignments")
        .select(`
          *,
          resource:coaching_resources(*),
          collection:coaching_resource_collections(*),
          engagement:coaching_org_engagements!inner(
            member_company_id,
            memberships:memberships!inner(user_id)
          )
        `)
        .not("coaching_engagement_id", "is", null)
        .neq("status", "cancelled")
        .order("due_at", { ascending: true, nullsFirst: false });

      if (engError) throw engError;

      // Filter engagement assignments by user membership
      const filteredEngagementAssignments = (engagementAssignments || []).filter(
        (a: any) => a.engagement?.memberships?.some((m: any) => m.user_id === user.user?.id)
      );

      // Combine and dedupe
      const allAssignments = [...(directAssignments || []), ...filteredEngagementAssignments];
      const uniqueAssignments = allAssignments.filter(
        (a, i, arr) => arr.findIndex((b) => b.id === a.id) === i
      );

      return uniqueAssignments as CoachingResourceAssignment[];
    },
  });
}

export interface CreateAssignmentInput {
  coaching_engagement_id?: string | null;
  member_user_id?: string | null;
  assignable_type: AssignableType;
  resource_id?: string | null;
  collection_id?: string | null;
  title_override?: string;
  due_at?: string | null;
}

export function useCoachingAssignmentMutations() {
  const queryClient = useQueryClient();
  const { activeCoachingOrgId } = useCoachingRole();

  const createAssignment = useMutation({
    mutationFn: async (input: CreateAssignmentInput) => {
      if (!activeCoachingOrgId) throw new Error("No active coaching org");

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("coaching_resource_assignments")
        .insert({
          coaching_org_id: activeCoachingOrgId,
          coaching_engagement_id: input.coaching_engagement_id || null,
          member_user_id: input.member_user_id || null,
          assignable_type: input.assignable_type,
          resource_id: input.resource_id || null,
          collection_id: input.collection_id || null,
          title_override: input.title_override || null,
          due_at: input.due_at || null,
          assigned_by_user_id: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CoachingResourceAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-resource-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["my-coaching-resource-assignments"] });
      toast.success("Resource assigned");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateAssignment = useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      status?: AssignmentStatus;
      due_at?: string | null;
      title_override?: string | null;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (input.status !== undefined) updateData.status = input.status;
      if (input.due_at !== undefined) updateData.due_at = input.due_at;
      if (input.title_override !== undefined) updateData.title_override = input.title_override;

      if (input.status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("coaching_resource_assignments")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CoachingResourceAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-resource-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["my-coaching-resource-assignments"] });
      toast.success("Assignment updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const cancelAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("coaching_resource_assignments")
        .update({ status: "cancelled" as const })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CoachingResourceAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-resource-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["my-coaching-resource-assignments"] });
      toast.success("Assignment cancelled");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    createAssignment,
    updateAssignment,
    cancelAssignment,
  };
}

// ============================================================
// Progress
// ============================================================

export function useResourceProgress(assignmentId?: string | null) {
  return useQuery({
    queryKey: ["coaching-resource-progress", assignmentId],
    queryFn: async () => {
      if (!assignmentId) return null;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const { data, error } = await supabase
        .from("coaching_resource_progress")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("user_id", user.user.id)
        .maybeSingle();

      if (error) throw error;
      return data as CoachingResourceProgress | null;
    },
    enabled: !!assignmentId,
  });
}

export function useResourceProgressMutations() {
  const queryClient = useQueryClient();

  const markViewed = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("coaching_resource_progress")
        .upsert(
          {
            assignment_id: assignmentId,
            user_id: user.user.id,
            status: "viewed" as const,
            viewed_at: new Date().toISOString(),
          },
          { onConflict: "assignment_id,user_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data as CoachingResourceProgress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-resource-progress"] });
    },
  });

  const markCompleted = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("coaching_resource_progress")
        .upsert(
          {
            assignment_id: assignmentId,
            user_id: user.user.id,
            status: "completed" as const,
            viewed_at: now,
            completed_at: now,
          },
          { onConflict: "assignment_id,user_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data as CoachingResourceProgress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-resource-progress"] });
      queryClient.invalidateQueries({ queryKey: ["my-coaching-resource-assignments"] });
      toast.success("Marked as completed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    markViewed,
    markCompleted,
  };
}

// ============================================================
// Helpers
// ============================================================

export function getResourceTypeLabel(type: ResourceType): string {
  const labels: Record<ResourceType, string> = {
    link: "Link",
    file: "File",
    video: "Video",
    document: "Document",
    worksheet: "Worksheet",
  };
  return labels[type] || type;
}

export function getResourceTypeIcon(type: ResourceType): string {
  const icons: Record<ResourceType, string> = {
    link: "Link",
    file: "File",
    video: "Video",
    document: "FileText",
    worksheet: "ClipboardList",
  };
  return icons[type] || "File";
}

export function getAssignmentStatusLabel(status: AssignmentStatus): string {
  const labels: Record<AssignmentStatus, string> = {
    assigned: "Assigned",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}

export function getProgressStatusLabel(status: ProgressStatus): string {
  const labels: Record<ProgressStatus, string> = {
    not_started: "Not Started",
    viewed: "Viewed",
    completed: "Completed",
  };
  return labels[status] || status;
}
