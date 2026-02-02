import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { useCompanyModules } from "./useCompanyModules";
import { useLmsPermissions } from "./useModulePermissions";
import { toast } from "sonner";

export type LessonStatus = "draft" | "published" | "archived";
export type Visibility = "company_private" | "company_public";
export type ContentType = "youtube" | "file_asset" | "external_link" | "rich_text";

export interface LmsLesson {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  content_type: ContentType;
  youtube_url: string | null;
  file_asset_path: string | null;
  external_url: string | null;
  rich_text_body: string | null;
  estimated_minutes: number | null;
  visibility: Visibility;
  status: LessonStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CreateLessonInput {
  title: string;
  description?: string;
  thumbnail_url?: string;
  content_type: ContentType;
  youtube_url?: string;
  file_asset_path?: string;
  external_url?: string;
  rich_text_body?: string;
  estimated_minutes?: number;
  visibility?: Visibility;
  status?: LessonStatus;
}

export interface UpdateLessonInput {
  title?: string;
  description?: string;
  thumbnail_url?: string | null;
  content_type?: ContentType;
  youtube_url?: string | null;
  file_asset_path?: string | null;
  external_url?: string | null;
  rich_text_body?: string | null;
  estimated_minutes?: number | null;
  visibility?: Visibility;
  status?: LessonStatus;
}

export interface LessonFilters {
  status?: LessonStatus | "all";
  visibility?: Visibility | "all";
  content_type?: ContentType | "all";
  search?: string;
}

export function useLmsLessons(filters: LessonFilters = {}) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  return useQuery({
    queryKey: ["lms-lessons", activeCompanyId, filters],
    queryFn: async () => {
      if (!activeCompanyId || !lmsEnabled) return [];

      let query = supabase
        .from("lms_lessons")
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

      if (filters.content_type && filters.content_type !== "all") {
        query = query.eq("content_type", filters.content_type);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as LmsLesson[];
    },
    enabled: !!activeCompanyId && lmsEnabled,
  });
}

export function useLmsLesson(lessonId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  return useQuery({
    queryKey: ["lms-lesson", lessonId],
    queryFn: async () => {
      if (!lessonId || !activeCompanyId || !lmsEnabled) return null;

      const { data, error } = await supabase
        .from("lms_lessons")
        .select("*")
        .eq("id", lessonId)
        .eq("company_id", activeCompanyId)
        .maybeSingle();

      if (error) throw error;
      return data as LmsLesson | null;
    },
    enabled: !!lessonId && !!activeCompanyId && lmsEnabled,
  });
}

export function useLmsLessonMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { log } = useAuditLog();
  const permissions = useLmsPermissions();

  const createLesson = useMutation({
    mutationFn: async (input: CreateLessonInput) => {
      if (!activeCompanyId) throw new Error("No active company");
      permissions.assertCapability("canCreate", "create lesson");

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("lms_lessons")
        .insert({
          company_id: activeCompanyId,
          title: input.title,
          description: input.description || null,
          thumbnail_url: input.thumbnail_url || null,
          content_type: input.content_type,
          youtube_url: input.youtube_url || null,
          file_asset_path: input.file_asset_path || null,
          external_url: input.external_url || null,
          rich_text_body: input.rich_text_body || null,
          estimated_minutes: input.estimated_minutes || null,
          visibility: input.visibility || "company_private",
          status: input.status || "draft",
          created_by: userData.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LmsLesson;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lms-lessons"] });
      log("lms.lesson_created", "lms_lesson", data.id, { title: data.title });
      toast.success("Lesson created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create lesson: ${error.message}`);
    },
  });

  const updateLesson = useMutation({
    mutationFn: async ({ id, ...input }: UpdateLessonInput & { id: string }) => {
      if (input.status === "published") {
        permissions.assertCapability("canPublish", "publish lesson");
      } else {
        permissions.assertCapability("canEdit", "update lesson");
      }

      const { data, error } = await supabase
        .from("lms_lessons")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as LmsLesson;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lms-lessons"] });
      queryClient.invalidateQueries({ queryKey: ["lms-lesson", data.id] });
      log("lms.lesson_updated", "lms_lesson", data.id, { title: data.title });
      toast.success("Lesson updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update lesson: ${error.message}`);
    },
  });

  const publishLesson = useMutation({
    mutationFn: async (lessonId: string) => {
      permissions.assertCapability("canPublish", "publish lesson");

      const { data, error } = await supabase
        .from("lms_lessons")
        .update({ status: "published", updated_at: new Date().toISOString() })
        .eq("id", lessonId)
        .select()
        .single();

      if (error) throw error;
      return data as LmsLesson;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lms-lessons"] });
      queryClient.invalidateQueries({ queryKey: ["lms-lesson", data.id] });
      log("lms.lesson_published", "lms_lesson", data.id, { title: data.title });
      toast.success("Lesson published successfully");
    },
    onError: (error) => {
      toast.error(`Failed to publish lesson: ${error.message}`);
    },
  });

  const archiveLesson = useMutation({
    mutationFn: async (lessonId: string) => {
      const { data, error } = await supabase
        .from("lms_lessons")
        .update({ 
          status: "archived", 
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq("id", lessonId)
        .select()
        .single();

      if (error) throw error;
      return data as LmsLesson;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lms-lessons"] });
      queryClient.invalidateQueries({ queryKey: ["lms-lesson", data.id] });
      log("lms.lesson_archived", "lms_lesson", data.id, { title: data.title });
      toast.success("Lesson archived successfully");
    },
    onError: (error) => {
      toast.error(`Failed to archive lesson: ${error.message}`);
    },
  });

  const deleteLesson = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase.from("lms_lessons").delete().eq("id", lessonId);
      if (error) throw error;
      return lessonId;
    },
    onSuccess: (lessonId) => {
      queryClient.invalidateQueries({ queryKey: ["lms-lessons"] });
      log("lms.lesson_deleted", "lms_lesson", lessonId, {});
      toast.success("Lesson deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete lesson: ${error.message}`);
    },
  });

  return { createLesson, updateLesson, publishLesson, archiveLesson, deleteLesson };
}

export function getLessonStatusLabel(status: LessonStatus): string {
  switch (status) {
    case "draft": return "Draft";
    case "published": return "Published";
    case "archived": return "Archived";
    default: return status;
  }
}

export function getLessonStatusColor(status: LessonStatus): string {
  switch (status) {
    case "draft": return "bg-muted text-muted-foreground";
    case "published": return "bg-primary/10 text-primary";
    case "archived": return "bg-destructive/10 text-destructive";
    default: return "bg-muted";
  }
}

export function getContentTypeLabel(type: ContentType): string {
  switch (type) {
    case "youtube": return "YouTube Video";
    case "file_asset": return "File/PDF";
    case "external_link": return "External Link";
    case "rich_text": return "Rich Text";
    default: return type;
  }
}

export function getContentTypeIcon(type: ContentType): string {
  switch (type) {
    case "youtube": return "video";
    case "file_asset": return "file";
    case "external_link": return "link";
    case "rich_text": return "text";
    default: return "file";
  }
}
