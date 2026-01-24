import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuth } from "@/lib/auth";
import { useCompanyModules } from "./useCompanyModules";
import { toast } from "sonner";

export type AssignableType = "learning_path" | "course" | "lesson";
export type TargetType = "user" | "group" | "all_members";

export interface LmsAssignment {
  id: string;
  company_id: string;
  assignable_type: AssignableType;
  assignable_id: string;
  target_type: TargetType;
  target_id: string | null;
  is_required: boolean;
  due_at: string | null;
  assigned_at: string;
  assigned_by: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface LmsAssignmentWithDetails extends LmsAssignment {
  // Joined data
  assignable?: {
    id: string;
    title: string;
    status?: string;
    estimated_hours?: number;
    estimated_minutes?: number;
  };
}

// Get assignments for current user (learner view)
export function useMyAssignments() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  return useQuery({
    queryKey: ["my-lms-assignments", activeCompanyId, user?.id],
    queryFn: async () => {
      if (!activeCompanyId || !user || !lmsEnabled) return [];

      // Get direct user assignments + all_members assignments
      const { data, error } = await supabase
        .from("lms_assignments")
        .select("*")
        .eq("company_id", activeCompanyId)
        .is("archived_at", null)
        .or(`target_id.eq.${user.id},target_type.eq.all_members`)
        .order("is_required", { ascending: false })
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("assigned_at", { ascending: false });

      if (error) throw error;

      // Fetch details for each assignable
      const enriched: LmsAssignmentWithDetails[] = [];
      for (const assignment of data || []) {
        let assignable = null;
        
        if (assignment.assignable_type === "learning_path") {
          const { data: path } = await supabase
            .from("lms_learning_paths")
            .select("id, title, status, estimated_hours")
            .eq("id", assignment.assignable_id)
            .maybeSingle();
          assignable = path;
        } else if (assignment.assignable_type === "course") {
          const { data: course } = await supabase
            .from("lms_courses")
            .select("id, title, status, estimated_hours")
            .eq("id", assignment.assignable_id)
            .maybeSingle();
          assignable = course;
        } else if (assignment.assignable_type === "lesson") {
          const { data: lesson } = await supabase
            .from("lms_lessons")
            .select("id, title, status, estimated_minutes")
            .eq("id", assignment.assignable_id)
            .maybeSingle();
          assignable = lesson;
        }

        if (assignable) {
          enriched.push({ ...assignment, assignable } as LmsAssignmentWithDetails);
        }
      }

      return enriched;
    },
    enabled: !!activeCompanyId && !!user && lmsEnabled,
  });
}

// Get all assignments (admin view)
export function useLmsAssignments() {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  return useQuery({
    queryKey: ["lms-assignments", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId || !lmsEnabled) return [];

      const { data, error } = await supabase
        .from("lms_assignments")
        .select("*")
        .eq("company_id", activeCompanyId)
        .is("archived_at", null)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      return data as LmsAssignment[];
    },
    enabled: !!activeCompanyId && lmsEnabled,
  });
}

// Create assignment
export function useLmsAssignmentMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();

  const createAssignment = useMutation({
    mutationFn: async (input: {
      assignableType: AssignableType;
      assignableId: string;
      targetType: TargetType;
      targetId?: string;
      isRequired?: boolean;
      dueAt?: string;
      notes?: string;
    }) => {
      if (!activeCompanyId || !user) throw new Error("No active company");

      const { data, error } = await supabase
        .from("lms_assignments")
        .insert({
          company_id: activeCompanyId,
          assignable_type: input.assignableType,
          assignable_id: input.assignableId,
          target_type: input.targetType,
          target_id: input.targetId || null,
          is_required: input.isRequired ?? false,
          due_at: input.dueAt || null,
          assigned_by: user.id,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["my-lms-assignments"] });
      toast.success("Assignment created");
    },
    onError: (error) => {
      toast.error(`Failed to create assignment: ${error.message}`);
    },
  });

  const archiveAssignment = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("lms_assignments")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["my-lms-assignments"] });
      toast.success("Assignment archived");
    },
    onError: (error) => {
      toast.error(`Failed to archive assignment: ${error.message}`);
    },
  });

  return { createAssignment, archiveAssignment };
}

// Helper to get icon/label for assignable type
export function getAssignableTypeLabel(type: AssignableType): string {
  switch (type) {
    case "learning_path": return "Learning Path";
    case "course": return "Course";
    case "lesson": return "Lesson";
    default: return type;
  }
}

export function getTargetTypeLabel(type: TargetType): string {
  switch (type) {
    case "user": return "User";
    case "group": return "Group";
    case "all_members": return "All Members";
    default: return type;
  }
}
