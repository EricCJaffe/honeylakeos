/**
 * Read Model Configuration & Performance Guardrails
 * 
 * This module standardizes how module data is read, expanded, and composed
 * to ensure performance, consistency, and safety across all modules.
 */

import { addDays, addMonths } from "date-fns";

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * Default expansion limits for recurrence
 */
export const RECURRENCE_LIMITS = {
  /** Calendar: default expansion window in days */
  CALENDAR_DAYS: 60,
  /** Tasks: maximum occurrences to return */
  TASK_OCCURRENCES: 20,
  /** Maximum expansion window allowed (days) */
  MAX_EXPANSION_DAYS: 365,
} as const;

/**
 * Default limits for related data
 */
export const RELATION_LIMITS = {
  /** Maximum linked items returned per entity */
  MAX_LINKS: 50,
  /** Maximum attendees returned per event */
  MAX_ATTENDEES: 100,
  /** Maximum project phases */
  MAX_PHASES: 50,
  /** Maximum search results */
  MAX_SEARCH_RESULTS: 10,
} as const;

/**
 * Default pagination limits for list views
 * Used to prevent unbounded queries on main list pages
 */
export const LIST_LIMITS = {
  /** Default page size for most lists */
  DEFAULT_PAGE_SIZE: 50,
  /** CRM clients list */
  CRM_CLIENTS: 50,
  /** External contacts list */
  EXTERNAL_CONTACTS: 50,
  /** Forms list */
  FORMS: 50,
  /** Form submissions list */
  FORM_SUBMISSIONS: 100,
  /** Coaches list */
  COACHES: 50,
  /** LMS courses list */
  LMS_COURSES: 50,
  /** LMS cohorts list */
  LMS_COHORTS: 50,
  /** LMS sessions list */
  LMS_SESSIONS: 100,
  /** LMS enrollments list */
  LMS_ENROLLMENTS: 100,
  /** Maximum items to ever load in a single query */
  MAX_QUERY_LIMIT: 500,
} as const;

/**
 * Entity types supported by the read model system
 */
export type ReadModelEntityType = "task" | "project" | "note" | "document" | "event";

/**
 * Module keys mapped to entity types
 */
export const ENTITY_MODULE_MAP: Record<ReadModelEntityType, string> = {
  task: "tasks",
  project: "projects",
  note: "notes",
  document: "documents",
  event: "calendar",
};

// ============================================================================
// Read Options Types
// ============================================================================

/**
 * Options for recurrence expansion
 */
export interface RecurrenceExpansionOptions {
  /** Enable recurrence expansion (default: false) */
  expand: boolean;
  /** Custom start date for expansion window */
  rangeStart?: Date;
  /** Custom end date for expansion window */
  rangeEnd?: Date;
  /** Maximum occurrences to return (for tasks) */
  maxOccurrences?: number;
}

/**
 * Options for linked items expansion
 */
export interface LinkExpansionOptions {
  /** Enable linked items expansion (default: false) */
  expand: boolean;
  /** Maximum links to return */
  limit?: number;
  /** Filter by link type */
  linkTypes?: string[];
}

/**
 * Options for attendees expansion (calendar only)
 */
export interface AttendeeExpansionOptions {
  /** Enable attendees expansion (default: false) */
  expand: boolean;
  /** Maximum attendees to return */
  limit?: number;
  /** Include profile information */
  includeProfiles?: boolean;
}

/**
 * Options for phase expansion (projects only)
 */
export interface PhaseExpansionOptions {
  /** Enable phases expansion (default: false) */
  expand: boolean;
  /** Include task counts per phase */
  includeTaskCounts?: boolean;
}

/**
 * Complete read options for an entity
 */
export interface EntityReadOptions {
  recurrence?: RecurrenceExpansionOptions;
  links?: LinkExpansionOptions;
  attendees?: AttendeeExpansionOptions;
  phases?: PhaseExpansionOptions;
}

// ============================================================================
// Result Types with Metadata
// ============================================================================

/**
 * Metadata about truncation and expansion
 */
export interface ReadResultMeta {
  /** Whether results were truncated */
  truncated: boolean;
  /** Total count before truncation (if available) */
  totalCount?: number;
  /** Limit that was applied */
  limit: number;
  /** Expansions that were applied */
  expansions: string[];
  /** Module disabled placeholders */
  disabledModules?: string[];
}

/**
 * Wrapper for expanded data with metadata
 */
export interface ExpandedResult<T> {
  data: T[];
  meta: ReadResultMeta;
}

/**
 * Disabled state placeholder for module-safe reads
 */
export interface DisabledModulePlaceholder {
  type: "module_disabled";
  moduleKey: string;
  entityType: ReadModelEntityType;
  message: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get default recurrence expansion range for calendar events
 */
export function getCalendarExpansionRange(
  baseDate: Date = new Date(),
  days: number = RECURRENCE_LIMITS.CALENDAR_DAYS
): { start: Date; end: Date } {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  
  const end = addDays(start, Math.min(days, RECURRENCE_LIMITS.MAX_EXPANSION_DAYS));
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Get default recurrence expansion range for tasks
 * Uses a 60-day window but limits occurrences
 */
export function getTaskExpansionRange(
  baseDate: Date = new Date(),
  days: number = 60
): { start: Date; end: Date } {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  
  const end = addDays(start, Math.min(days, RECURRENCE_LIMITS.MAX_EXPANSION_DAYS));
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Apply limit to array and return with truncation metadata
 */
export function applyLimit<T>(
  items: T[],
  limit: number,
  expansionName: string
): ExpandedResult<T> {
  const truncated = items.length > limit;
  const data = truncated ? items.slice(0, limit) : items;
  
  return {
    data,
    meta: {
      truncated,
      totalCount: items.length,
      limit,
      expansions: [expansionName],
    },
  };
}

/**
 * Merge multiple expansion results
 */
export function mergeExpandedResults<T>(
  results: ExpandedResult<T>[]
): ExpandedResult<T> {
  const allData = results.flatMap((r) => r.data);
  const allExpansions = results.flatMap((r) => r.meta.expansions);
  const anyTruncated = results.some((r) => r.meta.truncated);
  
  return {
    data: allData,
    meta: {
      truncated: anyTruncated,
      limit: Math.max(...results.map((r) => r.meta.limit)),
      expansions: [...new Set(allExpansions)],
    },
  };
}

/**
 * Create a disabled module placeholder
 */
export function createDisabledPlaceholder(
  entityType: ReadModelEntityType,
  moduleKey: string
): DisabledModulePlaceholder {
  return {
    type: "module_disabled",
    moduleKey,
    entityType,
    message: `The ${moduleKey} module is currently disabled`,
  };
}

/**
 * Check if a value is a disabled placeholder
 */
export function isDisabledPlaceholder(
  value: unknown
): value is DisabledModulePlaceholder {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    (value as any).type === "module_disabled"
  );
}

// ============================================================================
// Default Read Options Factories
// ============================================================================

/**
 * Get default read options for entity detail views
 */
export function getDetailReadOptions(entityType: ReadModelEntityType): EntityReadOptions {
  const base: EntityReadOptions = {
    links: { expand: true, limit: RELATION_LIMITS.MAX_LINKS },
  };
  
  switch (entityType) {
    case "task":
      return {
        ...base,
        recurrence: {
          expand: true,
          maxOccurrences: RECURRENCE_LIMITS.TASK_OCCURRENCES,
        },
      };
    case "event":
      return {
        ...base,
        recurrence: {
          expand: true,
          ...getCalendarExpansionRange(),
        },
        attendees: {
          expand: true,
          limit: RELATION_LIMITS.MAX_ATTENDEES,
          includeProfiles: true,
        },
      };
    case "project":
      return {
        ...base,
        phases: { expand: true, includeTaskCounts: true },
      };
    default:
      return base;
  }
}

/**
 * Get default read options for list views (minimal expansion)
 */
export function getListReadOptions(): EntityReadOptions {
  return {
    links: { expand: false },
    recurrence: { expand: false },
    attendees: { expand: false },
    phases: { expand: false },
  };
}

// ============================================================================
// Debug Utilities (DEV mode only)
// ============================================================================

const isDev = import.meta.env.DEV;

/**
 * Log read operation debug info (DEV mode only)
 */
export function debugReadOperation(
  entityType: ReadModelEntityType,
  options: EntityReadOptions,
  meta: ReadResultMeta
): void {
  if (!isDev) return;
  
  const expansions = meta.expansions.length > 0
    ? meta.expansions.join(", ")
    : "none";
  
  console.debug(`[ReadModel] ${entityType}:`, {
    expansions,
    truncated: meta.truncated,
    disabledModules: meta.disabledModules,
  });
}

/**
 * Create debug-enhanced result (DEV mode only)
 */
export function withDebugMeta<T extends { meta?: ReadResultMeta }>(
  result: T,
  entityType: ReadModelEntityType,
  options: EntityReadOptions
): T {
  if (!isDev || !result.meta) return result;
  
  debugReadOperation(entityType, options, result.meta);
  return result;
}
