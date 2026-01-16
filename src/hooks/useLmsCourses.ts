import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { useCompanyModules } from "./useCompanyModules";
import { toast } from "sonner";

export type CourseStatus = "draft" | "published" | "archived";

export interface LmsCourse {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  status: CourseStatus;
  default_duration_minutes: number | null;
  settings: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCourseInput {
  title: string;
  description?: string;
  status?: CourseStatus;
  default_duration_minutes?: number;
}

export interface UpdateCourseInput {
  title?: string;
  description?: string;
  status?: CourseStatus;
  default_duration_minutes?: number;
  settings?: Record<string, unknown>;
}

export interface CourseFilters {
  status?: CourseStatus | "all";
  search?: string;
}

export function useLmsCourses(filters: CourseFilters = {}) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  return useQuery({
    queryKey: ["courses", activeCompanyId, filters],
    queryFn: async () => {
      if (!activeCompanyId || !lmsEnabled) return [];

      let query = supabase
        .from("lms_courses")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LmsCourse[];
    },
    enabled: !!activeCompanyId && lmsEnabled,
  });
}

export function useLmsCourse(courseId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  return useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      if (!courseId || !activeCompanyId || !lmsEnabled) return null;

      const { data, error } = await supabase
        .from("lms_courses")
        .select("*")
        .eq("id", courseId)
        .eq("company_id", activeCompanyId)
        .maybeSingle();

      if (error) throw error;
      return data as LmsCourse | null;
    },
    enabled: !!courseId && !!activeCompanyId && lmsEnabled,
  });
}

export function useLmsCourseMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { logEvent } = useAuditLog();

  const createCourse = useMutation({
    mutationFn: async (input: CreateCourseInput) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("lms_courses")
        .insert({
          company_id: activeCompanyId,
          title: input.title,
          description: input.description || null,
          status: input.status || "draft",
          default_duration_minutes: input.default_duration_minutes || null,
          created_by: userData.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LmsCourse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      logEvent({
        action: "lms.course_created",
        entityType: "lms_course",
        entityId: data.id,
        metadata: { title: data.title },
      });
      toast.success("Course created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create course: ${error.message}`);
    },
  });

  const updateCourse = useMutation({
    mutationFn: async ({ id, ...input }: UpdateCourseInput & { id: string }) => {
      const { data, error } = await supabase
        .from("lms_courses")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as LmsCourse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["course", data.id] });
      logEvent({
        action: "lms.course_updated",
        entityType: "lms_course",
        entityId: data.id,
        metadata: { title: data.title },
      });
      toast.success("Course updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update course: ${error.message}`);
    },
  });

  const publishCourse = useMutation({
    mutationFn: async (courseId: string) => {
      const { data, error } = await supabase
        .from("lms_courses")
        .update({ status: "published", updated_at: new Date().toISOString() })
        .eq("id", courseId)
        .select()
        .single();

      if (error) throw error;
      return data as LmsCourse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["course", data.id] });
      logEvent({
        action: "lms.course_published",
        entityType: "lms_course",
        entityId: data.id,
        metadata: { title: data.title },
      });
      toast.success("Course published successfully");
    },
    onError: (error) => {
      toast.error(`Failed to publish course: ${error.message}`);
    },
  });

  const archiveCourse = useMutation({
    mutationFn: async (courseId: string) => {
      const { data, error } = await supabase
        .from("lms_courses")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("id", courseId)
        .select()
        .single();

      if (error) throw error;
      return data as LmsCourse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["course", data.id] });
      logEvent({
        action: "lms.course_archived",
        entityType: "lms_course",
        entityId: data.id,
        metadata: { title: data.title },
      });
      toast.success("Course archived successfully");
    },
    onError: (error) => {
      toast.error(`Failed to archive course: ${error.message}`);
    },
  });

  const deleteCourse = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from("lms_courses")
        .delete()
        .eq("id", courseId);

      if (error) throw error;
      return courseId;
    },
    onSuccess: (courseId) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      logEvent({
        action: "lms.course_deleted",
        entityType: "lms_course",
        entityId: courseId,
        metadata: {},
      });
      toast.success("Course deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete course: ${error.message}`);
    },
  });

  return {
    createCourse,
    updateCourse,
    publishCourse,
    archiveCourse,
    deleteCourse,
  };
}

export function getStatusLabel(status: CourseStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "published":
      return "Published";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

export function getStatusColor(status: CourseStatus): string {
  switch (status) {
    case "draft":
      return "bg-muted text-muted-foreground";
    case "published":
      return "bg-primary/10 text-primary";
    case "archived":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted";
  }
}
