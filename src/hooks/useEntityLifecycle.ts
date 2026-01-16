/**
 * Entity Lifecycle Hook
 * 
 * Provides standardized archive, restore, and delete operations with:
 * - Consistent audit logging
 * - Link cleanup on delete
 * - Module safety checks
 * - Orphan prevention
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { toast } from "sonner";
import {
  LifecycleEntityType,
  LifecycleOperation,
  LifecycleResult,
  RecurrenceScope,
  getLifecycleConfig,
  getStatusValue,
  getAuditAction,
  buildAuditMetadata,
  isOperationAllowed,
  getConfirmationMessage,
} from "@/lib/entityLifecycle";

// ============================================================================
// Types
// ============================================================================

export interface ArchiveParams {
  entityId: string;
}

export interface RestoreParams {
  entityId: string;
}

export interface DeleteParams {
  entityId: string;
  /** For recurring events/tasks */
  scope?: RecurrenceScope;
  /** Skip confirmation (already confirmed) */
  confirmed?: boolean;
}

export interface UseEntityLifecycleOptions {
  /** Callback on successful operation */
  onSuccess?: (result: LifecycleResult) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Query keys to invalidate after operation */
  invalidateKeys?: string[][];
}

// ============================================================================
// Hook
// ============================================================================

export function useEntityLifecycle(
  entityType: LifecycleEntityType,
  options: UseEntityLifecycleOptions = {}
) {
  const { activeCompanyId } = useActiveCompany();
  const { log: logAudit } = useAuditLog();
  const queryClient = useQueryClient();
  const config = getLifecycleConfig(entityType);

  /**
   * Invalidate related queries after operation
   */
  const invalidateQueries = () => {
    // Always invalidate entity-specific queries
    queryClient.invalidateQueries({ queryKey: [entityType] });
    queryClient.invalidateQueries({ queryKey: [`${entityType}s`] });
    queryClient.invalidateQueries({ queryKey: ["entity-links"] });
    
    // Invalidate custom keys if provided
    if (options.invalidateKeys) {
      options.invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    }
  };

  /**
   * Execute status update on the appropriate table
   */
  const executeStatusUpdate = async (
    entityId: string,
    operation: "archive" | "restore"
  ): Promise<void> => {
    if (!activeCompanyId) throw new Error("No active company");
    
    const { column, value } = getStatusValue(entityType, operation);
    const updateData = { [column]: value };
    
    let error: Error | null = null;
    
    switch (entityType) {
      case "task": {
        const result = await supabase
          .from("tasks")
          .update(updateData as any)
          .eq("id", entityId)
          .eq("company_id", activeCompanyId);
        error = result.error;
        break;
      }
      case "project": {
        const result = await supabase
          .from("projects")
          .update(updateData as any)
          .eq("id", entityId)
          .eq("company_id", activeCompanyId);
        error = result.error;
        break;
      }
      case "note": {
        const result = await supabase
          .from("notes")
          .update(updateData as any)
          .eq("id", entityId)
          .eq("company_id", activeCompanyId);
        error = result.error;
        break;
      }
      case "document": {
        const result = await supabase
          .from("documents")
          .update(updateData as any)
          .eq("id", entityId)
          .eq("company_id", activeCompanyId);
        error = result.error;
        break;
      }
      case "template": {
        const result = await supabase
          .from("templates")
          .update(updateData as any)
          .eq("id", entityId)
          .eq("company_id", activeCompanyId);
        error = result.error;
        break;
      }
      case "employee": {
        const result = await supabase
          .from("employees")
          .update(updateData as any)
          .eq("id", entityId)
          .eq("company_id", activeCompanyId);
        error = result.error;
        break;
      }
      case "location": {
        const result = await supabase
          .from("locations")
          .update(updateData as any)
          .eq("id", entityId)
          .eq("company_id", activeCompanyId);
        error = result.error;
        break;
      }
      case "group": {
        const result = await supabase
          .from("groups")
          .update(updateData as any)
          .eq("id", entityId)
          .eq("company_id", activeCompanyId);
        error = result.error;
        break;
      }
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
    
    if (error) throw error;
  };

  /**
   * Execute delete on the appropriate table
   */
  const executeDelete = async (entityId: string): Promise<void> => {
    if (!activeCompanyId) throw new Error("No active company");
    
    let error: Error | null = null;
    
    switch (entityType) {
      case "task": {
        const result = await supabase
          .from("tasks")
          .delete()
          .eq("id", entityId)
          .eq("company_id", activeCompanyId);
        error = result.error;
        break;
      }
      case "note": {
        const result = await supabase
          .from("notes")
          .delete()
          .eq("id", entityId)
          .eq("company_id", activeCompanyId);
        error = result.error;
        break;
      }
      case "document": {
        const result = await supabase
          .from("documents")
          .delete()
          .eq("id", entityId)
          .eq("company_id", activeCompanyId);
        error = result.error;
        break;
      }
      case "event": {
        const result = await supabase
          .from("events")
          .delete()
          .eq("id", entityId)
          .eq("company_id", activeCompanyId);
        error = result.error;
        break;
      }
      case "location": {
        const result = await supabase
          .from("locations")
          .delete()
          .eq("id", entityId)
          .eq("company_id", activeCompanyId);
        error = result.error;
        break;
      }
      case "group": {
        const result = await supabase
          .from("groups")
          .delete()
          .eq("id", entityId)
          .eq("company_id", activeCompanyId);
        error = result.error;
        break;
      }
      default:
        throw new Error(`Delete not supported for ${entityType}`);
    }
    
    if (error) throw error;
  };

  // ============================================================================
  // Archive Mutation
  // ============================================================================

  const archive = useMutation({
    mutationFn: async ({ entityId }: ArchiveParams): Promise<LifecycleResult> => {
      if (!isOperationAllowed(entityType, "archive")) {
        throw new Error(`Archive is not supported for ${entityType}`);
      }

      await executeStatusUpdate(entityId, "archive");

      return {
        success: true,
        operation: "archive",
        entityType,
        entityId,
      };
    },
    onSuccess: (result) => {
      invalidateQueries();
      toast.success(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} archived`);
      
      // Audit log
      logAudit(
        getAuditAction(entityType, "archive") as any,
        entityType as any,
        result.entityId,
        buildAuditMetadata("archive")
      );
      
      options.onSuccess?.(result);
    },
    onError: (error: Error) => {
      toast.error(error.message || `Failed to archive ${entityType}`);
      options.onError?.(error);
    },
  });

  // ============================================================================
  // Restore Mutation
  // ============================================================================

  const restore = useMutation({
    mutationFn: async ({ entityId }: RestoreParams): Promise<LifecycleResult> => {
      if (!isOperationAllowed(entityType, "restore")) {
        throw new Error(`Restore is not supported for ${entityType}`);
      }

      await executeStatusUpdate(entityId, "restore");

      return {
        success: true,
        operation: "restore",
        entityType,
        entityId,
      };
    },
    onSuccess: (result) => {
      invalidateQueries();
      toast.success(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} restored`);
      
      // Audit log
      logAudit(
        getAuditAction(entityType, "restore") as any,
        entityType as any,
        result.entityId,
        buildAuditMetadata("restore")
      );
      
      options.onSuccess?.(result);
    },
    onError: (error: Error) => {
      toast.error(error.message || `Failed to restore ${entityType}`);
      options.onError?.(error);
    },
  });

  // ============================================================================
  // Helper: Remove entity links
  // ============================================================================

  const removeLinksForEntity = async (targetEntityType: string, targetEntityId: string): Promise<number> => {
    if (!activeCompanyId) return 0;
    
    // Delete links where this entity is source or target
    const { data: fromLinks } = await supabase
      .from("entity_links")
      .select("id")
      .eq("company_id", activeCompanyId)
      .eq("from_type", targetEntityType)
      .eq("from_id", targetEntityId);
      
    const { data: toLinks } = await supabase
      .from("entity_links")
      .select("id")
      .eq("company_id", activeCompanyId)
      .eq("to_type", targetEntityType)
      .eq("to_id", targetEntityId);
    
    const allLinkIds = [
      ...(fromLinks || []).map(l => l.id),
      ...(toLinks || []).map(l => l.id),
    ];
    
    if (allLinkIds.length > 0) {
      await supabase
        .from("entity_links")
        .delete()
        .in("id", allLinkIds);
    }
    
    return allLinkIds.length;
  };

  // ============================================================================
  // Delete Mutation
  // ============================================================================

  const deleteMutation = useMutation({
    mutationFn: async ({ entityId, scope }: DeleteParams): Promise<LifecycleResult> => {
      if (!activeCompanyId) throw new Error("No active company");
      if (!isOperationAllowed(entityType, "delete")) {
        throw new Error(`Delete is not supported for ${entityType}. Use archive instead.`);
      }

      let affectedLinks = 0;
      let affectedChildren = 0;

      // Remove links if configured
      if (config.removeLinksOnDelete) {
        affectedLinks = await removeLinksForEntity(entityType, entityId);
      }

      // Special handling for events (recurring series)
      if (entityType === "event" && scope === "series") {
        // Delete recurrence exceptions
        await supabase
          .from("event_recurrence_exceptions")
          .delete()
          .eq("event_id", entityId)
          .eq("company_id", activeCompanyId);

        // Delete recurrence overrides
        const { data: overrides } = await supabase
          .from("event_recurrence_overrides")
          .select("override_event_id")
          .eq("series_event_id", entityId)
          .eq("company_id", activeCompanyId);

        if (overrides && overrides.length > 0) {
          const overrideIds = overrides.map(o => o.override_event_id);
          
          // Remove links from override events
          for (const id of overrideIds) {
            await removeLinksForEntity("event", id);
          }
          
          // Delete override events
          await supabase
            .from("events")
            .delete()
            .in("id", overrideIds);
            
          affectedChildren = overrideIds.length;
        }

        // Delete attendees
        await supabase
          .from("event_attendees")
          .delete()
          .eq("event_id", entityId);
      }

      // Special handling for tasks (recurring series)
      if (entityType === "task" && scope === "series") {
        // Delete recurrence exceptions
        await supabase
          .from("task_recurrence_exceptions")
          .delete()
          .eq("task_id", entityId)
          .eq("company_id", activeCompanyId);

        // Delete occurrence completions
        await supabase
          .from("task_occurrence_completions")
          .delete()
          .eq("series_task_id", entityId)
          .eq("company_id", activeCompanyId);

        // Delete recurrence overrides
        const { data: overrides } = await supabase
          .from("task_recurrence_overrides")
          .select("override_task_id")
          .eq("series_task_id", entityId)
          .eq("company_id", activeCompanyId);

        if (overrides && overrides.length > 0) {
          const overrideIds = overrides.map(o => o.override_task_id);
          
          // Remove links from override tasks
          for (const id of overrideIds) {
            await removeLinksForEntity("task", id);
          }
          
          // Delete override tasks
          await supabase
            .from("tasks")
            .delete()
            .in("id", overrideIds);
            
          affectedChildren = overrideIds.length;
        }
      }

      // Single event - remove attendees
      if (entityType === "event" && scope !== "series") {
        await supabase
          .from("event_attendees")
          .delete()
          .eq("event_id", entityId);
      }

      // Delete the main entity
      await executeDelete(entityId);

      return {
        success: true,
        operation: "delete",
        entityType,
        entityId,
        scope,
        affectedLinks,
        affectedChildren,
      };
    },
    onSuccess: (result) => {
      invalidateQueries();
      
      const message = result.scope === "series"
        ? `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} series deleted`
        : `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} deleted`;
      toast.success(message);
      
      // Audit log
      logAudit(
        getAuditAction(entityType, "delete", result.scope) as any,
        entityType as any,
        result.entityId,
        buildAuditMetadata("delete", {
          scope: result.scope,
          affectedLinks: result.affectedLinks,
          affectedChildren: result.affectedChildren,
        })
      );
      
      options.onSuccess?.(result);
    },
    onError: (error: Error) => {
      toast.error(error.message || `Failed to delete ${entityType}`);
      options.onError?.(error);
    },
  });

  // ============================================================================
  // Return
  // ============================================================================

  return {
    archive,
    restore,
    delete: deleteMutation,
    config,
    getConfirmation: (operation: LifecycleOperation, isRecurringSeries = false) =>
      getConfirmationMessage(entityType, operation, isRecurringSeries),
    isArchiveAllowed: config.supportsArchive,
    isDeleteAllowed: config.supportsHardDelete,
  };
}
