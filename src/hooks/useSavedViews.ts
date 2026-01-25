import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

// ============================================================================
// Types
// ============================================================================

export type SavedViewModule = "documents" | "notes";

export interface SavedViewConfig {
  folder_id?: string | null;
  unfiled?: boolean;
  search?: string;
  search_all?: boolean;
  [key: string]: unknown;
}

export interface SavedView extends Omit<Tables<"saved_views">, "config_json"> {
  config_json: SavedViewConfig;
}

export interface CreateSavedViewInput {
  module: SavedViewModule;
  name: string;
  is_personal: boolean;
  config: SavedViewConfig;
}

export interface UpdateSavedViewInput {
  id: string;
  name?: string;
  config?: SavedViewConfig;
  sort_order?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

const QUERY_KEYS = {
  all: ["saved-views"] as const,
  byModule: (module: SavedViewModule, companyId: string) =>
    [...QUERY_KEYS.all, module, companyId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch saved views for a specific module (documents or notes)
 */
export function useSavedViews(module: SavedViewModule) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.byModule(module, activeCompanyId ?? ""),
    queryFn: async (): Promise<SavedView[]> => {
      if (!activeCompanyId || !user) return [];

      const { data, error } = await supabase
        .from("saved_views")
        .select("*")
        .eq("module", module)
        .or(`owner_user_id.eq.${user.id},company_id.eq.${activeCompanyId}`)
        .order("is_personal", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as SavedView[];
    },
    enabled: !!activeCompanyId && !!user,
  });
}

/**
 * CRUD mutations for saved views
 */
export function useSavedViewMutations(module: SavedViewModule) {
  const queryClient = useQueryClient();
  const { activeCompanyId, isCompanyAdmin } = useActiveCompany();
  const { user } = useAuth();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
  };

  const create = useMutation({
    mutationFn: async (input: CreateSavedViewInput) => {
      if (!user) throw new Error("Not authenticated");

      // Calculate next sort_order
      const { data: existing } = await supabase
        .from("saved_views")
        .select("sort_order")
        .eq("module", input.module)
        .eq("is_personal", input.is_personal)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextSortOrder = ((existing?.[0]?.sort_order ?? 0) as number) + 1;

      const insertData: any = {
        module: input.module,
        name: input.name,
        is_personal: input.is_personal,
        config_json: input.config,
        sort_order: nextSortOrder,
      };

      if (input.is_personal) {
        insertData.owner_user_id = user.id;
      } else {
        if (!activeCompanyId) throw new Error("No active company");
        insertData.company_id = activeCompanyId;
      }

      const { data, error } = await supabase
        .from("saved_views")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as SavedView;
    },
    onSuccess: () => {
      invalidate();
      toast.success("View saved");
    },
    onError: () => {
      toast.error("Failed to save view");
    },
  });

  const update = useMutation({
    mutationFn: async (input: UpdateSavedViewInput) => {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (input.name !== undefined) updateData.name = input.name;
      if (input.config !== undefined) updateData.config_json = input.config;
      if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;

      const { data, error } = await supabase
        .from("saved_views")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data as SavedView;
    },
    onSuccess: () => {
      invalidate();
      toast.success("View updated");
    },
    onError: () => {
      toast.error("Failed to update view");
    },
  });

  const remove = useMutation({
    mutationFn: async (viewId: string) => {
      const { error } = await supabase
        .from("saved_views")
        .delete()
        .eq("id", viewId);

      if (error) throw error;
      return viewId;
    },
    onSuccess: () => {
      invalidate();
      toast.success("View deleted");
    },
    onError: () => {
      toast.error("Failed to delete view");
    },
  });

  const reorder = useMutation({
    mutationFn: async ({
      views,
    }: {
      views: Array<{ id: string; sort_order: number }>;
    }) => {
      // Update all in sequence (could be optimized with RPC)
      for (const view of views) {
        const { error } = await supabase
          .from("saved_views")
          .update({ sort_order: view.sort_order })
          .eq("id", view.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
    },
    onError: () => {
      toast.error("Failed to reorder views");
    },
  });

  return {
    create,
    update,
    remove,
    reorder,
    canCreateCompanyView: isCompanyAdmin,
  };
}
