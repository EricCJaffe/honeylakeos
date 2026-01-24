/**
 * Module-Safe Read Utilities
 * 
 * Provides standardized, module-aware read operations with performance guardrails.
 * Handles module enable/disable safety and expansion limits.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useCompanyModules, ENTITY_TO_MODULE_MAP } from "./useCompanyModules";
import {
  ReadModelEntityType,
  EntityReadOptions,
  ExpandedResult,
  ReadResultMeta,
  RELATION_LIMITS,
  RECURRENCE_LIMITS,
  applyLimit,
  createDisabledPlaceholder,
  getCalendarExpansionRange,
  getTaskExpansionRange,
} from "@/lib/readModels";
import type { EntityLink, EntityType } from "./useEntityLinks";

// ============================================================================
// Types
// ============================================================================

export interface ModuleSafeReadResult<T> {
  data: T | null;
  isLoading: boolean;
  isModuleEnabled: boolean;
  error: Error | null;
}

export interface ExpandedLinksResult {
  links: EntityLink[];
  meta: ReadResultMeta;
}

export interface ExpandedAttendeesResult {
  attendees: Array<{
    event_id: string;
    user_id: string;
    role: string;
    response_status: string;
    profile?: { full_name: string | null; email: string | null };
  }>;
  meta: ReadResultMeta;
}

export interface ExpandedOccurrencesResult {
  occurrences: Array<{
    occurrence_date: string;
    is_exception: boolean;
    is_override: boolean;
    override_id?: string;
    is_completed?: boolean;
    completed_at?: string;
  }>;
  meta: ReadResultMeta;
}

// ============================================================================
// Hook: useModuleSafeEntity
// ============================================================================

/**
 * Fetch a single entity with module safety checks.
 * Returns null data and isModuleEnabled=false if module is disabled.
 */
export function useModuleSafeEntity<T>(
  entityType: ReadModelEntityType,
  entityId: string | undefined,
  queryFn: () => Promise<T | null>
): ModuleSafeReadResult<T> {
  const { activeCompanyId } = useActiveCompany();
  const { isEntityModuleEnabled, loading: modulesLoading } = useCompanyModules();

  const isModuleEnabled = isEntityModuleEnabled(entityType);

  const { data, isLoading, error } = useQuery({
    queryKey: ["entity", entityType, entityId, activeCompanyId],
    queryFn,
    enabled: !!entityId && !!activeCompanyId && isModuleEnabled && !modulesLoading,
  });

  return {
    data: data ?? null,
    isLoading: isLoading || modulesLoading,
    isModuleEnabled,
    error: error as Error | null,
  };
}

// ============================================================================
// Hook: useExpandedLinks
// ============================================================================

/**
 * Fetch linked entities with limit guardrails and module safety.
 * Gracefully handles disabled target modules.
 */
export function useExpandedLinks(
  entityType: ReadModelEntityType,
  entityId: string | undefined,
  options: { limit?: number; linkTypes?: string[] } = {}
): {
  result: ExpandedLinksResult;
  isLoading: boolean;
  isModuleEnabled: boolean;
} {
  const { activeCompanyId } = useActiveCompany();
  const { isEntityModuleEnabled, loading: modulesLoading } = useCompanyModules();
  const limit = options.limit ?? RELATION_LIMITS.MAX_LINKS;

  const isModuleEnabled = isEntityModuleEnabled(entityType);

  const { data, isLoading } = useQuery({
    queryKey: ["expanded-links", entityType, entityId, activeCompanyId, limit],
    queryFn: async (): Promise<ExpandedLinksResult> => {
      if (!entityId || !activeCompanyId) {
        return {
          links: [],
          meta: { truncated: false, limit, expansions: ["links"] },
        };
      }

      // Fetch links where this entity is source or target
      const [fromResult, toResult] = await Promise.all([
        supabase
          .from("entity_links")
          .select("*")
          .eq("company_id", activeCompanyId)
          .eq("from_type", entityType)
          .eq("from_id", entityId)
          .limit(limit + 1), // Fetch one extra to detect truncation
        supabase
          .from("entity_links")
          .select("*")
          .eq("company_id", activeCompanyId)
          .eq("to_type", entityType)
          .eq("to_id", entityId)
          .limit(limit + 1),
      ]);

      if (fromResult.error) throw fromResult.error;
      if (toResult.error) throw toResult.error;

      const allLinks = [...(fromResult.data || []), ...(toResult.data || [])];

      // Apply link type filter if specified
      let filteredLinks = allLinks;
      if (options.linkTypes && options.linkTypes.length > 0) {
        filteredLinks = allLinks.filter((l) =>
          options.linkTypes!.includes(l.link_type)
        );
      }

      // Apply limit and track truncation
      const result = applyLimit(filteredLinks as EntityLink[], limit, "links");
      return {
        links: result.data,
        meta: result.meta,
      };
    },
    enabled: !!entityId && !!activeCompanyId && isModuleEnabled && !modulesLoading,
  });

  return {
    result: data ?? {
      links: [],
      meta: { truncated: false, limit, expansions: ["links"] },
    },
    isLoading: isLoading || modulesLoading,
    isModuleEnabled,
  };
}

// ============================================================================
// Hook: useExpandedAttendees
// ============================================================================

/**
 * Fetch event attendees with limit guardrails.
 */
export function useExpandedAttendees(
  eventId: string | undefined,
  options: { limit?: number; includeProfiles?: boolean } = {}
): {
  result: ExpandedAttendeesResult;
  isLoading: boolean;
  isModuleEnabled: boolean;
} {
  const { activeCompanyId } = useActiveCompany();
  const { isEntityModuleEnabled, loading: modulesLoading } = useCompanyModules();
  const limit = options.limit ?? RELATION_LIMITS.MAX_ATTENDEES;

  const isModuleEnabled = isEntityModuleEnabled("event");

  const { data, isLoading } = useQuery({
    queryKey: ["expanded-attendees", eventId, activeCompanyId, limit],
    queryFn: async (): Promise<ExpandedAttendeesResult> => {
      if (!eventId || !activeCompanyId) {
        return {
          attendees: [],
          meta: { truncated: false, limit, expansions: ["attendees"] },
        };
      }

      const { data: attendees, error } = await supabase
        .from("event_attendees")
        .select("*")
        .eq("event_id", eventId)
        .limit(limit + 1);

      if (error) throw error;

      const truncated = (attendees?.length || 0) > limit;
      const limitedAttendees = truncated
        ? (attendees || []).slice(0, limit)
        : attendees || [];

      // Optionally fetch profiles
      let attendeesWithProfiles = limitedAttendees;
      if (options.includeProfiles && limitedAttendees.length > 0) {
        const { data: members } = await supabase.rpc("get_company_member_directory", {
          p_company_id: activeCompanyId,
        });

        const memberMap = new Map(
          (members || []).map((m: any) => [
            m.user_id,
            { full_name: m.full_name, email: m.email },
          ])
        );

        attendeesWithProfiles = limitedAttendees.map((a) => ({
          ...a,
          profile: memberMap.get(a.user_id) || null,
        }));
      }

      return {
        attendees: attendeesWithProfiles,
        meta: {
          truncated,
          totalCount: attendees?.length,
          limit,
          expansions: ["attendees"],
        },
      };
    },
    enabled: !!eventId && !!activeCompanyId && isModuleEnabled && !modulesLoading,
  });

  return {
    result: data ?? {
      attendees: [],
      meta: { truncated: false, limit, expansions: ["attendees"] },
    },
    isLoading: isLoading || modulesLoading,
    isModuleEnabled,
  };
}

// ============================================================================
// Hook: useExpandedRecurrence
// ============================================================================

/**
 * Expand recurrence with limits and module safety.
 */
export function useExpandedRecurrence(
  entityType: "task" | "event",
  entityId: string | undefined,
  options: {
    rangeStart?: Date;
    rangeEnd?: Date;
    maxOccurrences?: number;
  } = {}
): {
  result: ExpandedOccurrencesResult;
  isLoading: boolean;
  isModuleEnabled: boolean;
} {
  const { activeCompanyId } = useActiveCompany();
  const { isEntityModuleEnabled, loading: modulesLoading } = useCompanyModules();

  const isModuleEnabled = isEntityModuleEnabled(entityType);

  // Calculate default ranges based on entity type
  const defaultRange =
    entityType === "event"
      ? getCalendarExpansionRange()
      : getTaskExpansionRange();

  const rangeStart = options.rangeStart ?? defaultRange.start;
  const rangeEnd = options.rangeEnd ?? defaultRange.end;
  const maxOccurrences =
    options.maxOccurrences ?? RECURRENCE_LIMITS.TASK_OCCURRENCES;

  const { data, isLoading } = useQuery({
    queryKey: [
      "expanded-recurrence",
      entityType,
      entityId,
      rangeStart.toISOString(),
      rangeEnd.toISOString(),
      maxOccurrences,
    ],
    queryFn: async (): Promise<ExpandedOccurrencesResult> => {
      if (!entityId || !activeCompanyId) {
        return {
          occurrences: [],
          meta: {
            truncated: false,
            limit: maxOccurrences,
            expansions: ["recurrence"],
          },
        };
      }

      // Call the appropriate RPC based on entity type
      let rpcResult;
      if (entityType === "event") {
        const { data, error } = await supabase.rpc("expand_event_series", {
          p_event_id: entityId,
          p_range_start: rangeStart.toISOString(),
          p_range_end: rangeEnd.toISOString(),
        });
        if (error) throw error;
        rpcResult = data;
      } else {
        const { data, error } = await supabase.rpc("expand_task_series", {
          p_task_id: entityId,
          p_range_start: rangeStart.toISOString(),
          p_range_end: rangeEnd.toISOString(),
        });
        if (error) throw error;
        rpcResult = data;
      }

      const occurrences = (rpcResult || []).filter(
        (o: any) => !o.is_exception
      );

      // Apply occurrence limit for tasks
      const truncated =
        entityType === "task" && occurrences.length > maxOccurrences;
      const limitedOccurrences = truncated
        ? occurrences.slice(0, maxOccurrences)
        : occurrences;

      return {
        occurrences: limitedOccurrences.map((o: any) => ({
          occurrence_date: o.occurrence_date,
          is_exception: o.is_exception,
          is_override: o.is_override,
          override_id: o.override_task_id || o.override_event_id,
          is_completed: o.is_completed,
          completed_at: o.completed_at,
        })),
        meta: {
          truncated,
          totalCount: occurrences.length,
          limit: maxOccurrences,
          expansions: ["recurrence"],
        },
      };
    },
    enabled: !!entityId && !!activeCompanyId && isModuleEnabled && !modulesLoading,
  });

  return {
    result: data ?? {
      occurrences: [],
      meta: {
        truncated: false,
        limit: maxOccurrences,
        expansions: ["recurrence"],
      },
    },
    isLoading: isLoading || modulesLoading,
    isModuleEnabled,
  };
}

// ============================================================================
// Hook: useBatchEntityDetails
// ============================================================================

interface BatchEntityResult {
  id: string;
  name?: string;
  title?: string;
}

/**
 * Batch fetch entity details to prevent N+1 queries.
 * Returns a map of entityId -> entity data.
 */
export function useBatchEntityDetails(
  entityType: ReadModelEntityType,
  entityIds: string[]
): {
  dataMap: Map<string, BatchEntityResult>;
  isLoading: boolean;
  isModuleEnabled: boolean;
} {
  const { activeCompanyId } = useActiveCompany();
  const { isEntityModuleEnabled, loading: modulesLoading } = useCompanyModules();

  const isModuleEnabled = isEntityModuleEnabled(entityType);
  const uniqueIds = [...new Set(entityIds)].filter(Boolean);

  const { data, isLoading } = useQuery({
    queryKey: ["batch-entities", entityType, uniqueIds.sort().join(","), activeCompanyId],
    queryFn: async (): Promise<Map<string, BatchEntityResult>> => {
      if (uniqueIds.length === 0 || !activeCompanyId) return new Map();

      let results: BatchEntityResult[] = [];
      
      switch (entityType) {
        case "task": {
          const { data, error } = await supabase
            .from("tasks")
            .select("id, title")
            .eq("company_id", activeCompanyId)
            .in("id", uniqueIds);
          if (error) throw error;
          results = (data || []).map(d => ({ id: d.id, title: d.title }));
          break;
        }
        case "project": {
          const { data, error } = await supabase
            .from("projects")
            .select("id, name")
            .eq("company_id", activeCompanyId)
            .in("id", uniqueIds);
          if (error) throw error;
          results = (data || []).map(d => ({ id: d.id, name: d.name }));
          break;
        }
        case "note": {
          const { data, error } = await supabase
            .from("notes")
            .select("id, title")
            .eq("company_id", activeCompanyId)
            .in("id", uniqueIds);
          if (error) throw error;
          results = (data || []).map(d => ({ id: d.id, title: d.title }));
          break;
        }
        case "document": {
          const { data, error } = await supabase
            .from("documents")
            .select("id, name")
            .eq("company_id", activeCompanyId)
            .in("id", uniqueIds);
          if (error) throw error;
          results = (data || []).map(d => ({ id: d.id, name: d.name }));
          break;
        }
        case "event": {
          const { data, error } = await supabase
            .from("events")
            .select("id, title")
            .eq("company_id", activeCompanyId)
            .in("id", uniqueIds);
          if (error) throw error;
          results = (data || []).map(d => ({ id: d.id, title: d.title }));
          break;
        }
      }

      const map = new Map<string, BatchEntityResult>();
      results.forEach((item) => {
        map.set(item.id, item);
      });
      return map;
    },
    enabled: uniqueIds.length > 0 && !!activeCompanyId && isModuleEnabled && !modulesLoading,
  });

  return {
    dataMap: data ?? new Map<string, BatchEntityResult>(),
    isLoading: isLoading || modulesLoading,
    isModuleEnabled,
  };
}
