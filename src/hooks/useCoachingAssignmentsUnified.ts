import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCoachingRole } from "./useCoachingRole";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type TemplateType = Database["public"]["Enums"]["coaching_template_type"];
type ResourceStatus = Database["public"]["Enums"]["coaching_resource_status"];
type AssignmentType = Database["public"]["Enums"]["coaching_assignment_type"];
type AssignmentStatus = Database["public"]["Enums"]["coaching_assignment_status"];
type DefaultAssignee = Database["public"]["Enums"]["coaching_default_assignee"];
type InstanceStatus = Database["public"]["Enums"]["coaching_instance_status"];

// ============================================================
// Template Resources
// ============================================================

export interface CoachingTemplateResource {
  id: string;
  coaching_org_id: string;
  title: string;
  description: string | null;
  template_type: TemplateType;
  url: string | null;
  file_id: string | null;
  tags: string[] | null;
  program_key: string | null;
  status: ResourceStatus;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export function useTemplateResources(coachingOrgId?: string | null) {
  const { activeCoachingOrgId } = useCoachingRole();
  const orgId = coachingOrgId ?? activeCoachingOrgId;

  return useQuery({
    queryKey: ["coaching-template-resources", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("coaching_template_resources")
        .select("*")
        .eq("coaching_org_id", orgId)
        .eq("status", "active")
        .order("title");

      if (error) throw error;
      return data as CoachingTemplateResource[];
    },
    enabled: !!orgId,
  });
}

export interface CreateTemplateResourceInput {
  title: string;
  description?: string;
  template_type: TemplateType;
  url?: string;
  file_id?: string;
  tags?: string[];
  program_key?: string;
}

export function useTemplateResourceMutations() {
  const queryClient = useQueryClient();
  const { activeCoachingOrgId } = useCoachingRole();

  const createResource = useMutation({
    mutationFn: async (input: CreateTemplateResourceInput) => {
      if (!activeCoachingOrgId) throw new Error("No active coaching org");

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("coaching_template_resources")
        .insert({
          coaching_org_id: activeCoachingOrgId,
          title: input.title,
          description: input.description || null,
          template_type: input.template_type,
          url: input.url || null,
          file_id: input.file_id || null,
          tags: input.tags || null,
          program_key: input.program_key || null,
          created_by_user_id: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CoachingTemplateResource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-template-resources"] });
      toast.success("Template resource created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateResource = useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateTemplateResourceInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("coaching_template_resources")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CoachingTemplateResource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-template-resources"] });
      toast.success("Template resource updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const archiveResource = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("coaching_template_resources")
        .update({ status: "archived" as const })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CoachingTemplateResource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-template-resources"] });
      toast.success("Template resource archived");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return { createResource, updateResource, archiveResource };
}

// ============================================================
// Template Task Sets
// ============================================================

export interface CoachingTemplateTaskSet {
  id: string;
  coaching_org_id: string;
  name: string;
  description: string | null;
  program_key: string | null;
  status: ResourceStatus;
  created_at: string;
  updated_at: string;
  tasks?: CoachingTemplateTask[];
}

export interface CoachingTemplateTask {
  id: string;
  task_set_id: string;
  title: string;
  description: string | null;
  due_offset_days: number | null;
  default_assignee: DefaultAssignee | null;
  task_order: number | null;
  created_at: string;
  updated_at: string;
}

export function useTemplateTaskSets(coachingOrgId?: string | null) {
  const { activeCoachingOrgId } = useCoachingRole();
  const orgId = coachingOrgId ?? activeCoachingOrgId;

  return useQuery({
    queryKey: ["coaching-template-task-sets", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("coaching_template_task_sets")
        .select(`*, tasks:coaching_template_tasks(*)`)
        .eq("coaching_org_id", orgId)
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      return data as CoachingTemplateTaskSet[];
    },
    enabled: !!orgId,
  });
}

export function useTemplateTaskSetMutations() {
  const queryClient = useQueryClient();
  const { activeCoachingOrgId } = useCoachingRole();

  const createTaskSet = useMutation({
    mutationFn: async (input: { name: string; description?: string; program_key?: string }) => {
      if (!activeCoachingOrgId) throw new Error("No active coaching org");

      const { data, error } = await supabase
        .from("coaching_template_task_sets")
        .insert({
          coaching_org_id: activeCoachingOrgId,
          name: input.name,
          description: input.description || null,
          program_key: input.program_key || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CoachingTemplateTaskSet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-template-task-sets"] });
      toast.success("Task set created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const addTask = useMutation({
    mutationFn: async (input: {
      task_set_id: string;
      title: string;
      description?: string;
      due_offset_days?: number;
      default_assignee?: DefaultAssignee;
      task_order?: number;
    }) => {
      const { data, error } = await supabase
        .from("coaching_template_tasks")
        .insert({
          task_set_id: input.task_set_id,
          title: input.title,
          description: input.description || null,
          due_offset_days: input.due_offset_days || 0,
          default_assignee: input.default_assignee || "unassigned",
          task_order: input.task_order || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CoachingTemplateTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-template-task-sets"] });
      toast.success("Task added to set");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const archiveTaskSet = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("coaching_template_task_sets")
        .update({ status: "archived" as const })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-template-task-sets"] });
      toast.success("Task set archived");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return { createTaskSet, addTask, archiveTaskSet };
}

// ============================================================
// Unified Coaching Assignments
// ============================================================

export interface CoachingAssignment {
  id: string;
  coaching_org_id: string;
  coaching_engagement_id: string | null;
  member_user_id: string | null;
  assignment_type: AssignmentType;
  template_id: string | null;
  title_override: string | null;
  due_at: string | null;
  status: AssignmentStatus;
  assigned_by_user_id: string;
  assigned_at: string;
  completed_at: string | null;
  legacy_assignment_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  template_resource?: CoachingTemplateResource;
  template_task_set?: CoachingTemplateTaskSet;
}

export interface CoachingAssignmentInstance {
  id: string;
  coaching_assignment_id: string;
  member_company_id: string;
  created_table: string;
  created_id: string;
  status: InstanceStatus;
  created_at: string;
  updated_at: string;
}

export function useCoachingAssignmentsUnified(filters?: {
  coachingOrgId?: string | null;
  engagementId?: string | null;
  userId?: string | null;
  status?: AssignmentStatus;
}) {
  const { activeCoachingOrgId } = useCoachingRole();
  const orgId = filters?.coachingOrgId ?? activeCoachingOrgId;

  return useQuery({
    queryKey: ["coaching-assignments-unified", filters, orgId],
    queryFn: async () => {
      let query = supabase
        .from("coaching_assignments")
        .select("*")
        .order("assigned_at", { ascending: false });

      if (orgId) query = query.eq("coaching_org_id", orgId);
      if (filters?.engagementId) query = query.eq("coaching_engagement_id", filters.engagementId);
      if (filters?.userId) query = query.eq("member_user_id", filters.userId);
      if (filters?.status) query = query.eq("status", filters.status);

      const { data, error } = await query;

      if (error) throw error;
      return data as CoachingAssignment[];
    },
    enabled: !!orgId || !!filters?.engagementId || !!filters?.userId,
  });
}

export function useMyCoachingAssignments() {
  return useQuery({
    queryKey: ["my-coaching-assignments-unified"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      // Direct assignments
      const { data: directAssignments, error: directError } = await supabase
        .from("coaching_assignments")
        .select("*")
        .eq("member_user_id", user.user.id)
        .neq("status", "cancelled")
        .order("due_at", { ascending: true, nullsFirst: false });

      if (directError) throw directError;

      // Engagement-based assignments
      const { data: engagementAssignments, error: engError } = await supabase
        .from("coaching_assignments")
        .select(`
          *,
          engagement:coaching_org_engagements!inner(
            member_company_id,
            memberships:memberships!inner(user_id)
          )
        `)
        .not("coaching_engagement_id", "is", null)
        .neq("status", "cancelled")
        .order("due_at", { ascending: true, nullsFirst: false });

      if (engError) throw engError;

      const filtered = (engagementAssignments || []).filter(
        (a: any) => a.engagement?.memberships?.some((m: any) => m.user_id === user.user?.id)
      );

      const all = [...(directAssignments || []), ...filtered];
      return all.filter((a, i, arr) => arr.findIndex((b) => b.id === a.id) === i) as CoachingAssignment[];
    },
  });
}

export interface CreateAssignmentUnifiedInput {
  coaching_engagement_id?: string | null;
  member_user_id?: string | null;
  assignment_type: AssignmentType;
  template_id?: string | null;
  title_override?: string;
  due_at?: string | null;
}

export function useCoachingAssignmentMutationsUnified() {
  const queryClient = useQueryClient();
  const { activeCoachingOrgId } = useCoachingRole();

  const createAssignment = useMutation({
    mutationFn: async (input: CreateAssignmentUnifiedInput) => {
      if (!activeCoachingOrgId) throw new Error("No active coaching org");

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("coaching_assignments")
        .insert({
          coaching_org_id: activeCoachingOrgId,
          coaching_engagement_id: input.coaching_engagement_id || null,
          member_user_id: input.member_user_id || null,
          assignment_type: input.assignment_type,
          template_id: input.template_id || null,
          title_override: input.title_override || null,
          due_at: input.due_at || null,
          assigned_by_user_id: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CoachingAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["my-coaching-assignments"] });
      toast.success("Assignment created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateAssignment = useMutation({
    mutationFn: async ({
      id,
      status,
      due_at,
    }: {
      id: string;
      status?: AssignmentStatus;
      due_at?: string | null;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (status !== undefined) updateData.status = status;
      if (due_at !== undefined) updateData.due_at = due_at;
      if (status === "completed") updateData.completed_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("coaching_assignments")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CoachingAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["my-coaching-assignments"] });
      toast.success("Assignment updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const cancelAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("coaching_assignments")
        .update({ status: "cancelled" as const })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CoachingAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["my-coaching-assignments"] });
      toast.success("Assignment cancelled");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return { createAssignment, updateAssignment, cancelAssignment };
}

// ============================================================
// Assignment Instances (Projection Tracking)
// ============================================================

export function useAssignmentInstances(assignmentId?: string | null) {
  return useQuery({
    queryKey: ["coaching-assignment-instances", assignmentId],
    queryFn: async () => {
      if (!assignmentId) return [];

      const { data, error } = await supabase
        .from("coaching_assignment_instances")
        .select("*")
        .eq("coaching_assignment_id", assignmentId)
        .eq("status", "active");

      if (error) throw error;
      return data as CoachingAssignmentInstance[];
    },
    enabled: !!assignmentId,
  });
}

export function useCreateAssignmentInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      coaching_assignment_id: string;
      member_company_id: string;
      created_table: string;
      created_id: string;
    }) => {
      const { data, error } = await supabase
        .from("coaching_assignment_instances")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as CoachingAssignmentInstance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-assignment-instances"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ============================================================
// Detach from Coaching (Company Admin)
// ============================================================

export function useDetachFromCoaching() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      table,
      id,
    }: {
      table: "tasks" | "projects" | "notes";
      id: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Get current record to capture engagement ID
      const { data: current, error: fetchError } = await supabase
        .from(table)
        .select("coaching_engagement_id")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from(table)
        .update({
          source_type: "internal",
          coaching_engagement_id: null,
          detached_from_coaching_at: new Date().toISOString(),
          detached_from_engagement_id: current?.coaching_engagement_id || null,
          detached_by_user_id: user.user.id,
        } as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [variables.table] });
      toast.success("Item detached from coaching - now internal");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ============================================================
// Helpers
// ============================================================

export function getTemplateTypeLabel(type: TemplateType): string {
  const labels: Record<TemplateType, string> = {
    link: "Link",
    document: "Document",
    worksheet: "Worksheet",
    video: "Video",
    file: "File",
  };
  return labels[type] || type;
}

export function getAssignmentTypeLabel(type: AssignmentType): string {
  const labels: Record<AssignmentType, string> = {
    resource: "Resource",
    task_set: "Task Set",
    project_blueprint: "Project",
    lms_item: "Learning Item",
    form_request: "Form Request",
  };
  return labels[type] || type;
}

export function getAssignmentStatusLabel(status: AssignmentStatus): string {
  const labels: Record<AssignmentStatus, string> = {
    assigned: "Assigned",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}
