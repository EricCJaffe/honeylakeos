import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";

export interface ListeningSession {
  id: string;
  company_id: string;
  title: string;
  held_on: string;
  meeting_id: string | null;
  questions: { no: number; text: string }[];
  summary: string | null;
  created_at: string;
}

export interface ListeningItem {
  id: string;
  session_id: string;
  company_id: string;
  question_no: number;
  text: string;
  source: string;
  votes: number;
  theme: string | null;
  cluster: string | null;
  status: string;
  owner_text: string | null;
  status_note: string | null;
  comments: string | null;
  sort_order: number;
  created_at: string;
}

export interface ListeningItemComment {
  id: string;
  item_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export function useListeningSessions() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["listening-sessions", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const client = supabase as any;
      const { data, error } = await client
        .from("listening_sessions")
        .select("id, company_id, title, held_on, meeting_id, questions, summary, created_at")
        .eq("company_id", activeCompanyId)
        .order("held_on", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ListeningSession[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useListeningItems(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["listening-items", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const client = supabase as any;
      const { data, error } = await client
        .from("listening_items")
        .select("id, session_id, company_id, question_no, text, source, votes, theme, cluster, status, owner_text, status_note, comments, sort_order, created_at")
        .eq("session_id", sessionId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ListeningItem[];
    },
    enabled: !!sessionId,
  });
}

export function useListeningItemComments(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["listening-item-comments", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const client = supabase as any;
      const { data: items } = await client
        .from("listening_items")
        .select("id")
        .eq("session_id", sessionId);
      if (!items?.length) return [];
      const itemIds = items.map((i: { id: string }) => i.id);
      const { data, error } = await client
        .from("listening_item_comments")
        .select("id, item_id, author_name, body, created_at")
        .in("item_id", itemIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ListeningItemComment[];
    },
    enabled: !!sessionId,
  });
}
