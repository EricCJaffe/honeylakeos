import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useCompanyModules, ENTITY_TO_MODULE_MAP } from "./useCompanyModules";
import { useAuditLog } from "./useAuditLog";
import { toast } from "sonner";

export type EntityType = "task" | "project" | "note" | "document" | "event";
export type LinkType = "related" | "blocks" | "depends_on" | "reference";

export interface EntityLink {
  id: string;
  company_id: string;
  from_type: EntityType;
  from_id: string;
  to_type: EntityType;
  to_id: string;
  link_type: LinkType;
  created_by: string;
  created_at: string;
}

export interface LinkedEntity {
  link: EntityLink;
  entity: {
    id: string;
    name: string;
    type: EntityType;
  };
}

export function useEntityLinks(entityType: EntityType, entityId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();
  const { isEntityModuleEnabled, loading: modulesLoading } = useCompanyModules();
  const queryClient = useQueryClient();
  const { log: logAudit } = useAuditLog();

  // Check if source entity's module is enabled
  const isSourceModuleEnabled = isEntityModuleEnabled(entityType);

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["entity-links", entityType, entityId, activeCompanyId],
    queryFn: async () => {
      if (!entityId || !activeCompanyId) return [];

      // Get links where this entity is the source
      const { data: fromLinks, error: fromError } = await supabase
        .from("entity_links")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("from_type", entityType)
        .eq("from_id", entityId);

      if (fromError) throw fromError;

      // Get links where this entity is the target
      const { data: toLinks, error: toError } = await supabase
        .from("entity_links")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("to_type", entityType)
        .eq("to_id", entityId);

      if (toError) throw toError;

      return [...(fromLinks || []), ...(toLinks || [])] as EntityLink[];
    },
    // Only fetch if source module is enabled
    enabled: !!entityId && !!activeCompanyId && isSourceModuleEnabled && !modulesLoading,
  });

  const createLink = useMutation({
    mutationFn: async ({
      toType,
      toId,
      linkType = "related",
    }: {
      toType: EntityType;
      toId: string;
      linkType?: LinkType;
    }) => {
      if (!entityId || !activeCompanyId) throw new Error("Missing entity or company");

      // Pre-check that source module is enabled
      if (!isSourceModuleEnabled) {
        throw new Error(`The ${entityType} module is currently disabled`);
      }

      // Pre-check that target module is enabled (UI should prevent this, but double-check)
      if (!isEntityModuleEnabled(toType)) {
        throw new Error(`The ${toType} module is currently disabled`);
      }

      const { data, error } = await supabase.rpc("create_entity_link", {
        p_company_id: activeCompanyId,
        p_from_type: entityType,
        p_from_id: entityId,
        p_to_type: toType,
        p_to_id: toId,
        p_link_type: linkType,
      });

      if (error) throw error;
      return { linkId: data, toType, toId, linkType };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["entity-links"] });
      toast.success("Link created");
      
      // Audit log the link creation
      logAudit("link.created", "entity_link", result.linkId as string, {
        from_type: entityType,
        from_id: entityId,
        to_type: result.toType,
        to_id: result.toId,
        link_type: result.linkType,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create link");
    },
  });

  const deleteLink = useMutation({
    mutationFn: async (linkId: string) => {
      // Find the link details before deletion for audit logging
      const link = links.find(l => l.id === linkId);
      
      const { data, error } = await supabase.rpc("delete_entity_link", {
        p_link_id: linkId,
      });

      if (error) throw error;
      return { linkId, link };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["entity-links"] });
      toast.success("Link removed");
      
      // Audit log the link deletion
      if (result.link) {
        logAudit("link.deleted", "entity_link", result.linkId, {
          from_type: result.link.from_type,
          from_id: result.link.from_id,
          to_type: result.link.to_type,
          to_id: result.link.to_id,
          link_type: result.link.link_type,
        });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove link");
    },
  });

  return {
    links,
    isLoading,
    createLink,
    deleteLink,
    isModuleEnabled: isSourceModuleEnabled,
  };
}

/**
 * Standard entity search (backward compatible)
 */
export function useEntitySearch(entityType: EntityType, searchQuery: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["entity-search", entityType, searchQuery, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId || !searchQuery || searchQuery.length < 2) return [];

      let query;
      switch (entityType) {
        case "task":
          query = supabase
            .from("tasks")
            .select("id, title")
            .eq("company_id", activeCompanyId)
            .ilike("title", `%${searchQuery}%`)
            .limit(10);
          break;
        case "project":
          query = supabase
            .from("projects")
            .select("id, name")
            .eq("company_id", activeCompanyId)
            .ilike("name", `%${searchQuery}%`)
            .limit(10);
          break;
        case "note":
          query = supabase
            .from("notes")
            .select("id, title")
            .eq("company_id", activeCompanyId)
            .ilike("title", `%${searchQuery}%`)
            .limit(10);
          break;
        case "document":
          query = supabase
            .from("documents")
            .select("id, name")
            .eq("company_id", activeCompanyId)
            .ilike("name", `%${searchQuery}%`)
            .limit(10);
          break;
        case "event":
          query = supabase
            .from("events")
            .select("id, title")
            .eq("company_id", activeCompanyId)
            .ilike("title", `%${searchQuery}%`)
            .limit(10);
          break;
        default:
          return [];
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((item: Record<string, unknown>) => ({
        id: item.id as string,
        name: (item.title || item.name) as string,
      }));
    },
    enabled: !!activeCompanyId && searchQuery.length >= 2,
  });
}

/**
 * Module-aware entity search that only searches if the module is enabled.
 * Returns empty results for disabled modules without throwing errors.
 */
export function useModuleAwareEntitySearch(entityType: EntityType, searchQuery: string) {
  const { activeCompanyId } = useActiveCompany();
  const { isEntityModuleEnabled, loading: modulesLoading } = useCompanyModules();

  const isModuleEnabled = isEntityModuleEnabled(entityType);

  return useQuery({
    queryKey: ["entity-search", entityType, searchQuery, activeCompanyId, "module-aware"],
    queryFn: async () => {
      if (!activeCompanyId || !searchQuery || searchQuery.length < 2) return [];

      let query;
      switch (entityType) {
        case "task":
          query = supabase
            .from("tasks")
            .select("id, title")
            .eq("company_id", activeCompanyId)
            .ilike("title", `%${searchQuery}%`)
            .limit(10);
          break;
        case "project":
          query = supabase
            .from("projects")
            .select("id, name")
            .eq("company_id", activeCompanyId)
            .ilike("name", `%${searchQuery}%`)
            .limit(10);
          break;
        case "note":
          query = supabase
            .from("notes")
            .select("id, title")
            .eq("company_id", activeCompanyId)
            .ilike("title", `%${searchQuery}%`)
            .limit(10);
          break;
        case "document":
          query = supabase
            .from("documents")
            .select("id, name")
            .eq("company_id", activeCompanyId)
            .ilike("name", `%${searchQuery}%`)
            .limit(10);
          break;
        case "event":
          query = supabase
            .from("events")
            .select("id, title")
            .eq("company_id", activeCompanyId)
            .ilike("title", `%${searchQuery}%`)
            .limit(10);
          break;
        default:
          return [];
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((item: Record<string, unknown>) => ({
        id: item.id as string,
        name: (item.title || item.name) as string,
      }));
    },
    // Only run search if module is enabled
    enabled: !!activeCompanyId && searchQuery.length >= 2 && isModuleEnabled && !modulesLoading,
  });
}
