import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuth } from "@/lib/auth";
import { useAuditLog } from "./useAuditLog";
import { toast } from "sonner";

export type AnnouncementStatus = "draft" | "published" | "archived";

export interface Announcement {
  id: string;
  company_id: string;
  title: string;
  body_rte: string;
  status: AnnouncementStatus;
  publish_at: string | null;
  expires_at: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementRead {
  id: string;
  announcement_id: string;
  user_id: string;
  company_id: string;
  read_at: string;
}

interface AnnouncementWithReadStatus extends Announcement {
  is_read: boolean;
}

// Fetch all announcements for the company (admin view)
export function useAnnouncements(status?: AnnouncementStatus) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["announcements", activeCompanyId, status],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      let query = supabase
        .from("announcements")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Announcement[];
    },
    enabled: !!activeCompanyId,
  });
}

// Fetch a single announcement
export function useAnnouncement(id: string | undefined) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["announcement", id],
    queryFn: async () => {
      if (!id || !activeCompanyId) return null;

      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("id", id)
        .eq("company_id", activeCompanyId)
        .single();

      if (error) throw error;
      return data as Announcement;
    },
    enabled: !!id && !!activeCompanyId,
  });
}

// Fetch active announcements for dashboard (with read status)
export function useActiveAnnouncements() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["active-announcements", activeCompanyId, user?.id],
    queryFn: async () => {
      if (!activeCompanyId || !user) return [];

      const now = new Date().toISOString();

      // Fetch published announcements that are currently active
      const { data: announcements, error: announcementsError } = await supabase
        .from("announcements")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("status", "published")
        .or(`publish_at.is.null,publish_at.lte.${now}`)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false });

      if (announcementsError) throw announcementsError;

      // Fetch user's read announcements
      const { data: reads, error: readsError } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", user.id);

      if (readsError) throw readsError;

      const readIds = new Set(reads?.map((r) => r.announcement_id) || []);

      // Combine with read status
      const announcementsWithStatus: AnnouncementWithReadStatus[] = (announcements || []).map((a) => ({
        ...a,
        is_read: readIds.has(a.id),
      })) as AnnouncementWithReadStatus[];

      return announcementsWithStatus;
    },
    enabled: !!activeCompanyId && !!user,
  });
}

// Fetch unread announcements count
export function useUnreadAnnouncementsCount() {
  const { data: announcements } = useActiveAnnouncements();
  return announcements?.filter((a) => !a.is_read).length || 0;
}

// Fetch read counts for an announcement (admin)
export function useAnnouncementReadCount(announcementId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["announcement-read-count", announcementId],
    queryFn: async () => {
      if (!announcementId || !activeCompanyId) return { readCount: 0, totalMembers: 0 };

      // Count reads for this announcement
      const { count: readCount, error: readError } = await supabase
        .from("announcement_reads")
        .select("*", { count: "exact", head: true })
        .eq("announcement_id", announcementId);

      if (readError) throw readError;

      // Count total active members in company
      const { count: totalMembers, error: membersError } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .eq("company_id", activeCompanyId)
        .eq("status", "active");

      if (membersError) throw membersError;

      return {
        readCount: readCount || 0,
        totalMembers: totalMembers || 0,
      };
    },
    enabled: !!announcementId && !!activeCompanyId,
  });
}

// Mutations
export function useAnnouncementMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { log } = useAuditLog();

  const createAnnouncement = useMutation({
    mutationFn: async (input: {
      title: string;
      body_rte: string;
      status?: AnnouncementStatus;
      publish_at?: string | null;
      expires_at?: string | null;
    }) => {
      if (!activeCompanyId || !user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("announcements")
        .insert({
          company_id: activeCompanyId,
          title: input.title,
          body_rte: input.body_rte,
          status: input.status || "draft",
          publish_at: input.publish_at,
          expires_at: input.expires_at,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Announcement;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      log("announcement.created", "announcement", data.id, { title: data.title });
      toast.success("Announcement created");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create announcement");
    },
  });

  const updateAnnouncement = useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      body_rte?: string;
      status?: AnnouncementStatus;
      publish_at?: string | null;
      expires_at?: string | null;
    }) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from("announcements")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Announcement;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcement", data.id] });
      queryClient.invalidateQueries({ queryKey: ["active-announcements"] });
      log("announcement.updated", "announcement", data.id, { title: data.title });
      toast.success("Announcement updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update announcement");
    },
  });

  const publishAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("announcements")
        .update({ status: "published", publish_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Announcement;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcement", data.id] });
      queryClient.invalidateQueries({ queryKey: ["active-announcements"] });
      log("announcement.published", "announcement", data.id, { title: data.title });
      toast.success("Announcement published");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to publish announcement");
    },
  });

  const archiveAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("announcements")
        .update({ status: "archived" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Announcement;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcement", data.id] });
      queryClient.invalidateQueries({ queryKey: ["active-announcements"] });
      log("announcement.archived", "announcement", data.id, { title: data.title });
      toast.success("Announcement archived");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to archive announcement");
    },
  });

  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["active-announcements"] });
      toast.success("Announcement deleted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete announcement");
    },
  });

  const acknowledgeAnnouncement = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!activeCompanyId || !user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("announcement_reads")
        .upsert(
          {
            announcement_id: announcementId,
            user_id: user.id,
            company_id: activeCompanyId,
            read_at: new Date().toISOString(),
          },
          { onConflict: "announcement_id,user_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcement-read-count"] });
      toast.success("Marked as read");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to acknowledge");
    },
  });

  return {
    createAnnouncement,
    updateAnnouncement,
    publishAnnouncement,
    archiveAnnouncement,
    deleteAnnouncement,
    acknowledgeAnnouncement,
  };
}