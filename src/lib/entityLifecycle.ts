/**
 * Entity Lifecycle Management
 * 
 * Standardizes deletion, archival, and orphan safety rules across all modules.
 * Defines consistent behavior for soft-delete, archive, and hard-delete operations.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Entity types that support lifecycle management
 */
export type LifecycleEntityType = 
  | "task" 
  | "project" 
  | "note" 
  | "document" 
  | "event" 
  | "template"
  | "employee"
  | "location"
  | "group"
  | "crm_client"
  | "external_contact";

/**
 * Lifecycle status values
 */
export type LifecycleStatus = "active" | "archived";

/**
 * Operations that can be performed on entities
 */
export type LifecycleOperation = "archive" | "restore" | "delete";

/**
 * Scope for recurring entities
 */
export type RecurrenceScope = "single" | "series" | "this_and_future";

/**
 * Result of a lifecycle operation
 */
export interface LifecycleResult {
  success: boolean;
  operation: LifecycleOperation;
  entityType: LifecycleEntityType;
  entityId: string;
  scope?: RecurrenceScope;
  affectedLinks?: number;
  affectedChildren?: number;
  error?: string;
}

/**
 * Configuration for how each entity type handles lifecycle operations
 */
export interface EntityLifecycleConfig {
  /** Does this entity support archival (soft-delete)? */
  supportsArchive: boolean;
  /** Does this entity support hard delete? */
  supportsHardDelete: boolean;
  /** Status column name (null for boolean is_active pattern) */
  statusColumn: "status" | "is_active";
  /** Should links be removed on delete? */
  removeLinksOnDelete: boolean;
  /** Should links be preserved on archive? */
  preserveLinksOnArchive: boolean;
  /** Related entities to check for orphan cleanup */
  orphanCheckEntities?: LifecycleEntityType[];
  /** Cascade behavior description */
  cascadeNotes: string;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Lifecycle configuration per entity type
 */
export const ENTITY_LIFECYCLE_CONFIG: Record<LifecycleEntityType, EntityLifecycleConfig> = {
  task: {
    supportsArchive: true,
    supportsHardDelete: true,
    statusColumn: "status",
    removeLinksOnDelete: true,
    preserveLinksOnArchive: true,
    orphanCheckEntities: [],
    cascadeNotes: "Archiving preserves links and history. Deleting removes links but does NOT affect linked notes/documents.",
  },
  project: {
    supportsArchive: true,
    supportsHardDelete: false, // Prefer archive over delete
    statusColumn: "status",
    removeLinksOnDelete: true,
    preserveLinksOnArchive: true,
    orphanCheckEntities: ["task", "note", "document"],
    cascadeNotes: "Archiving does NOT delete tasks, notes, or documents. Linked items remain but show archived state.",
  },
  note: {
    supportsArchive: true,
    supportsHardDelete: true,
    statusColumn: "status",
    removeLinksOnDelete: true,
    preserveLinksOnArchive: true,
    orphanCheckEntities: [],
    cascadeNotes: "Archiving preserves links. Deleting removes links only, no cascades.",
  },
  document: {
    supportsArchive: false, // Documents use hard delete with storage cleanup
    supportsHardDelete: true,
    statusColumn: "status",
    removeLinksOnDelete: true,
    preserveLinksOnArchive: true,
    orphanCheckEntities: [],
    cascadeNotes: "Deleting removes links and storage file. Consider archiving notes instead.",
  },
  event: {
    supportsArchive: false, // Events use hard delete
    supportsHardDelete: true,
    statusColumn: "status",
    removeLinksOnDelete: true,
    preserveLinksOnArchive: false,
    orphanCheckEntities: [],
    cascadeNotes: "Deleting single event removes attendees and links. Deleting recurring parent removes entire series.",
  },
  template: {
    supportsArchive: true, // Uses is_active = false
    supportsHardDelete: false, // Prefer deactivation
    statusColumn: "is_active",
    removeLinksOnDelete: false,
    preserveLinksOnArchive: true,
    orphanCheckEntities: [],
    cascadeNotes: "Deactivating prevents future use. Does NOT affect entities created from template.",
  },
  employee: {
    supportsArchive: true,
    supportsHardDelete: false,
    statusColumn: "status",
    removeLinksOnDelete: false,
    preserveLinksOnArchive: true,
    orphanCheckEntities: [],
    cascadeNotes: "Archiving removes from active lists. Employee data preserved for audit.",
  },
  location: {
    supportsArchive: true,
    supportsHardDelete: true,
    statusColumn: "status",
    removeLinksOnDelete: false,
    preserveLinksOnArchive: true,
    orphanCheckEntities: [],
    cascadeNotes: "Archiving removes from active lists. Members are not affected.",
  },
  group: {
    supportsArchive: true,
    supportsHardDelete: true,
    statusColumn: "status",
    removeLinksOnDelete: false,
    preserveLinksOnArchive: true,
    orphanCheckEntities: [],
    cascadeNotes: "Deleting removes group members. Group-based permissions are revoked.",
  },
  crm_client: {
    supportsArchive: true,
    supportsHardDelete: true,
    statusColumn: "status",
    removeLinksOnDelete: true,
    preserveLinksOnArchive: true,
    orphanCheckEntities: [],
    cascadeNotes: "Archiving preserves links. Deleting removes links only.",
  },
  external_contact: {
    supportsArchive: true,
    supportsHardDelete: true,
    statusColumn: "status",
    removeLinksOnDelete: true,
    preserveLinksOnArchive: true,
    orphanCheckEntities: [],
    cascadeNotes: "Archiving preserves links. Deleting removes links and CRM associations.",
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get lifecycle config for an entity type
 */
export function getLifecycleConfig(entityType: LifecycleEntityType): EntityLifecycleConfig {
  return ENTITY_LIFECYCLE_CONFIG[entityType];
}

/**
 * Check if an operation is allowed for an entity type
 */
export function isOperationAllowed(
  entityType: LifecycleEntityType,
  operation: LifecycleOperation
): boolean {
  const config = getLifecycleConfig(entityType);
  
  switch (operation) {
    case "archive":
    case "restore":
      return config.supportsArchive;
    case "delete":
      return config.supportsHardDelete;
    default:
      return false;
  }
}

/**
 * Get confirmation message for an operation
 */
export function getConfirmationMessage(
  entityType: LifecycleEntityType,
  operation: LifecycleOperation,
  isRecurringSeries: boolean = false
): { title: string; description: string; destructive: boolean } {
  const config = getLifecycleConfig(entityType);
  const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1);
  
  if (operation === "archive") {
    return {
      title: `Archive ${entityLabel}?`,
      description: `This ${entityType} will be moved to archived items. ${config.preserveLinksOnArchive ? "Links and history will be preserved." : ""} You can restore it later.`,
      destructive: false,
    };
  }
  
  if (operation === "restore") {
    return {
      title: `Restore ${entityLabel}?`,
      description: `This ${entityType} will be restored to active items.`,
      destructive: false,
    };
  }
  
  // Delete operation
  if (entityType === "event" && isRecurringSeries) {
    return {
      title: "Delete Recurring Series?",
      description: "This will delete the entire recurring series, including all occurrences and exceptions. This cannot be undone.",
      destructive: true,
    };
  }
  
  return {
    title: `Delete ${entityLabel}?`,
    description: config.removeLinksOnDelete
      ? `This ${entityType} and its links will be permanently deleted. This cannot be undone.`
      : `This ${entityType} will be permanently deleted. This cannot be undone.`,
    destructive: true,
  };
}

/**
 * Get the status value for archive/restore operations
 */
export function getStatusValue(
  entityType: LifecycleEntityType,
  operation: "archive" | "restore"
): { column: string; value: unknown } {
  const config = getLifecycleConfig(entityType);
  
  if (config.statusColumn === "is_active") {
    return {
      column: "is_active",
      value: operation === "restore",
    };
  }
  
  return {
    column: "status",
    value: operation === "archive" ? "archived" : "active",
  };
}

/**
 * Map entity type to table name
 */
export function entityTypeToTable(entityType: LifecycleEntityType): string {
  const tableMap: Record<LifecycleEntityType, string> = {
    task: "tasks",
    project: "projects",
    note: "notes",
    document: "documents",
    event: "events",
    template: "templates",
    employee: "employees",
    location: "locations",
    group: "groups",
    crm_client: "crm_clients",
    external_contact: "external_contacts",
  };
  return tableMap[entityType];
}

/**
 * Check if an entity is archived
 */
export function isEntityArchived(
  entityType: LifecycleEntityType,
  entity: Record<string, unknown>
): boolean {
  const config = getLifecycleConfig(entityType);
  
  if (config.statusColumn === "is_active") {
    return entity.is_active === false;
  }
  
  return entity.status === "archived";
}

// ============================================================================
// Audit Action Helpers
// ============================================================================

/**
 * Get audit action name for a lifecycle operation
 */
export function getAuditAction(
  entityType: LifecycleEntityType,
  operation: LifecycleOperation,
  scope?: RecurrenceScope
): string {
  const prefix = entityType;
  
  switch (operation) {
    case "archive":
      return `${prefix}.archived`;
    case "restore":
      return `${prefix}.restored`;
    case "delete":
      if (scope === "series") {
        return `${prefix}.series_deleted`;
      }
      return `${prefix}.deleted`;
    default:
      return `${prefix}.updated`;
  }
}

/**
 * Build audit metadata for a lifecycle operation
 */
export function buildAuditMetadata(
  operation: LifecycleOperation,
  options: {
    scope?: RecurrenceScope;
    affectedLinks?: number;
    affectedChildren?: number;
    previousStatus?: string;
  } = {}
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    operation,
  };
  
  if (options.scope) {
    metadata.scope = options.scope;
  }
  
  if (options.affectedLinks !== undefined && options.affectedLinks > 0) {
    metadata.affected_links = options.affectedLinks;
  }
  
  if (options.affectedChildren !== undefined && options.affectedChildren > 0) {
    metadata.affected_children = options.affectedChildren;
  }
  
  if (options.previousStatus) {
    metadata.previous_status = options.previousStatus;
  }
  
  return metadata;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if an entity can be safely deleted (no blocking references)
 */
export function canSafelyDelete(
  entityType: LifecycleEntityType,
  hasActiveChildren: boolean,
  hasLinkedItems: boolean
): { allowed: boolean; reason?: string } {
  const config = getLifecycleConfig(entityType);
  
  // Projects with active children should be archived, not deleted
  if (entityType === "project" && hasActiveChildren) {
    return {
      allowed: false,
      reason: "Projects with active tasks cannot be deleted. Archive the project instead.",
    };
  }
  
  // Templates that are in use should be deactivated, not deleted
  if (entityType === "template" && hasLinkedItems) {
    return {
      allowed: false,
      reason: "Templates that have been used cannot be deleted. Deactivate instead.",
    };
  }
  
  // Allow deletion with link cleanup for other cases
  return { allowed: true };
}

/**
 * Check if linking to an archived entity should be blocked
 */
export function shouldBlockLinkToArchived(entityType: LifecycleEntityType): boolean {
  // Block new links to archived projects
  if (entityType === "project") {
    return true;
  }
  
  // Allow links to other archived entities (they show archived state)
  return false;
}
