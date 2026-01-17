import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export type LmsProgressStatus = "not_started" | "in_progress" | "completed";
export type LmsEntityType = "learning_path" | "course" | "lesson";

export interface LmsProgress {
  id: string;
  company_id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  status: LmsProgressStatus;
  progress_percent: number | null;
  started_at: string | null;
  completed_at: string | null;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Get progress for current user on a specific entity
export function useLmsEntityProgress(entityType: LmsEntityType, entityId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lms-progress", entityType, entityId, user?.id],
    queryFn: async () => {
      if (!activeCompanyId || !user || !entityId) return null;

      const { data, error } = await supabase
        .from("lms_progress")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("user_id", user.id)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .maybeSingle();

      if (error) throw error;
      return data as LmsProgress | null;
    },
    enabled: !!activeCompanyId && !!user && !!entityId,
  });
}

// Get all progress for current user
export function useMyLmsProgress() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-lms-progress", activeCompanyId, user?.id],
    queryFn: async () => {
      if (!activeCompanyId || !user) return [];

      const { data, error } = await supabase
        .from("lms_progress")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as LmsProgress[];
    },
    enabled: !!activeCompanyId && !!user,
  });
}

// Get progress for lessons in a specific course (for calculating course progress)
export function useCourseLessonsProgress(courseId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["course-lessons-progress", courseId, user?.id],
    queryFn: async () => {
      if (!activeCompanyId || !user || !courseId) return { lessons: [], progress: [] };

      // Get lessons in course
      const { data: courseLessons, error: lessonsError } = await supabase
        .from("lms_course_lessons")
        .select("lesson_id, sort_order, lesson:lms_lessons(id, title, status, estimated_minutes)")
        .eq("course_id", courseId)
        .order("sort_order");

      if (lessonsError) throw lessonsError;

      // Get progress for those lessons
      const lessonIds = courseLessons?.map(cl => cl.lesson_id) || [];
      if (lessonIds.length === 0) return { lessons: courseLessons || [], progress: [] };

      const { data: progress, error: progressError } = await supabase
        .from("lms_progress")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("user_id", user.id)
        .eq("entity_type", "lesson")
        .in("entity_id", lessonIds);

      if (progressError) throw progressError;

      return { lessons: courseLessons || [], progress: progress as LmsProgress[] };
    },
    enabled: !!activeCompanyId && !!user && !!courseId,
  });
}

// Get progress for courses in a learning path
export function usePathCoursesProgress(pathId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["path-courses-progress", pathId, user?.id],
    queryFn: async () => {
      if (!activeCompanyId || !user || !pathId) return { courses: [], progress: [] };

      // Get courses in path
      const { data: pathCourses, error: coursesError } = await supabase
        .from("lms_path_courses")
        .select("course_id, sort_order, course:lms_courses(id, title, status, estimated_hours)")
        .eq("path_id", pathId)
        .order("sort_order");

      if (coursesError) throw coursesError;

      // Get progress for those courses
      const courseIds = pathCourses?.map(pc => pc.course_id) || [];
      if (courseIds.length === 0) return { courses: pathCourses || [], progress: [] };

      const { data: progress, error: progressError } = await supabase
        .from("lms_progress")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("user_id", user.id)
        .eq("entity_type", "course")
        .in("entity_id", courseIds);

      if (progressError) throw progressError;

      return { courses: pathCourses || [], progress: progress as LmsProgress[] };
    },
    enabled: !!activeCompanyId && !!user && !!pathId,
  });
}

export function useLmsProgressMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();

  const markComplete = useMutation({
    mutationFn: async ({ entityType, entityId }: { entityType: LmsEntityType; entityId: string }) => {
      if (!activeCompanyId || !user) throw new Error("No active company or user");

      // Upsert progress record
      const { data, error } = await supabase
        .from("lms_progress")
        .upsert({
          company_id: activeCompanyId,
          user_id: user.id,
          entity_type: entityType,
          entity_id: entityId,
          status: "completed",
          progress_percent: 100,
          completed_at: new Date().toISOString(),
          last_viewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "company_id,user_id,entity_type,entity_id",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lms-progress"] });
      queryClient.invalidateQueries({ queryKey: ["my-lms-progress"] });
      queryClient.invalidateQueries({ queryKey: ["course-lessons-progress"] });
      queryClient.invalidateQueries({ queryKey: ["path-courses-progress"] });
      toast.success("Marked as complete");
    },
    onError: (error) => {
      toast.error(`Failed to mark complete: ${error.message}`);
    },
  });

  const markIncomplete = useMutation({
    mutationFn: async ({ entityType, entityId }: { entityType: LmsEntityType; entityId: string }) => {
      if (!activeCompanyId || !user) throw new Error("No active company or user");

      const { data, error } = await supabase
        .from("lms_progress")
        .upsert({
          company_id: activeCompanyId,
          user_id: user.id,
          entity_type: entityType,
          entity_id: entityId,
          status: "in_progress",
          progress_percent: 0,
          completed_at: null,
          last_viewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "company_id,user_id,entity_type,entity_id",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-progress"] });
      queryClient.invalidateQueries({ queryKey: ["my-lms-progress"] });
      queryClient.invalidateQueries({ queryKey: ["course-lessons-progress"] });
      queryClient.invalidateQueries({ queryKey: ["path-courses-progress"] });
      toast.success("Marked as incomplete");
    },
    onError: (error) => {
      toast.error(`Failed to update progress: ${error.message}`);
    },
  });

  const startLearning = useMutation({
    mutationFn: async ({ entityType, entityId }: { entityType: LmsEntityType; entityId: string }) => {
      if (!activeCompanyId || !user) throw new Error("No active company or user");

      const { data, error } = await supabase
        .from("lms_progress")
        .upsert({
          company_id: activeCompanyId,
          user_id: user.id,
          entity_type: entityType,
          entity_id: entityId,
          status: "in_progress",
          started_at: new Date().toISOString(),
          last_viewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "company_id,user_id,entity_type,entity_id",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-progress"] });
      queryClient.invalidateQueries({ queryKey: ["my-lms-progress"] });
    },
    onError: (error) => {
      toast.error(`Failed to start: ${error.message}`);
    },
  });

  return { markComplete, markIncomplete, startLearning };
}

// Helper to get status display
export function getProgressStatusLabel(status: LmsProgressStatus | null): string {
  switch (status) {
    case "completed": return "Completed";
    case "in_progress": return "In Progress";
    default: return "Not Started";
  }
}

export function getProgressStatusColor(status: LmsProgressStatus | null): string {
  switch (status) {
    case "completed": return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "in_progress": return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    default: return "bg-muted text-muted-foreground";
  }
}
