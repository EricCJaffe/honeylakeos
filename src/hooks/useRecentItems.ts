import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuth } from "@/lib/auth";

// ============================================================================
// Types
// ============================================================================

export interface RecentDocument {
  id: string;
  name: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecentNote {
  id: string;
  title: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Hooks
// ============================================================================

const RECENT_LIMIT = 20;

/**
 * Fetch recent documents for the current user
 * "Recent" is determined by updated_at timestamp
 */
export function useRecentDocuments() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recent-documents", activeCompanyId, user?.id],
    queryFn: async (): Promise<RecentDocument[]> => {
      if (!activeCompanyId || !user) return [];

      const { data, error } = await supabase
        .from("documents")
        .select("id, name, folder_id, created_at, updated_at")
        .eq("company_id", activeCompanyId)
        .order("updated_at", { ascending: false })
        .limit(RECENT_LIMIT);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!activeCompanyId && !!user,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Fetch recent notes for the current user
 */
export function useRecentNotes() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recent-notes", activeCompanyId, user?.id],
    queryFn: async (): Promise<RecentNote[]> => {
      if (!activeCompanyId || !user) return [];

      const { data, error } = await supabase
        .from("notes")
        .select("id, title, folder_id, created_at, updated_at")
        .eq("company_id", activeCompanyId)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(RECENT_LIMIT);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!activeCompanyId && !!user,
    staleTime: 1000 * 60, // 1 minute
  });
}
