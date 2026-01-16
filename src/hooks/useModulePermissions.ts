import { useMembership } from "@/lib/membership";
import { useModuleAccess, ModuleKey } from "./useModuleAccess";

/**
 * Permission capabilities for module operations.
 * Each capability maps to specific actions within a module.
 */
export interface ModuleCapabilities {
  /** Can view/list items in this module */
  canRead: boolean;
  /** Can create new items */
  canCreate: boolean;
  /** Can edit existing items */
  canEdit: boolean;
  /** Can archive/unarchive items */
  canArchive: boolean;
  /** Can permanently delete items */
  canDelete: boolean;
  /** Can publish/unpublish (for Forms, LMS) */
  canPublish: boolean;
  /** Can configure settings/templates (admin-level) */
  canAdmin: boolean;
}

/**
 * Result from the useModulePermissions hook
 */
export interface ModulePermissionsResult extends ModuleCapabilities {
  /** Whether the module is enabled for the company */
  isModuleEnabled: boolean;
  /** Whether the user has any access to this module */
  hasAccess: boolean;
  /** Loading state */
  loading: boolean;
  /** Helper to check a specific capability and throw if not allowed */
  assertCapability: (capability: keyof ModuleCapabilities, action?: string) => void;
}

/**
 * Permission error for failed capability checks
 */
export class PermissionError extends Error {
  constructor(capability: string, action?: string) {
    super(action 
      ? `Permission denied: ${action}` 
      : `Admin permission required`
    );
    this.name = "PermissionError";
  }
}

/**
 * Centralized hook for checking module permissions and capabilities.
 * 
 * This hook provides capability flags for each module that can be used to:
 * 1. Gate UI elements (hide/disable buttons)
 * 2. Validate backend operations (throw PermissionError if not allowed)
 * 
 * Current behavior (Phase 2 - permissive defaults):
 * - All company members have full access to all enabled modules
 * - Publish/Admin capabilities are currently open but gated for future restriction
 * 
 * Future behavior (Phase 3+):
 * - Capability flags can be driven by company settings or role configuration
 * - No code changes required in consuming components
 * 
 * @param moduleKey - The module to check permissions for
 */
export function useModulePermissions(moduleKey: ModuleKey): ModulePermissionsResult {
  const { 
    isCompanyAdmin, 
    isSiteAdmin, 
    isSuperAdmin,
    activeMembership,
    loading: membershipLoading 
  } = useMembership();

  const {
    isModuleEnabled,
    hasAccess,
    loading: moduleLoading,
  } = useModuleAccess(moduleKey);

  const loading = membershipLoading || moduleLoading;

  // Check if user is any kind of admin
  const isAdmin = isCompanyAdmin || isSiteAdmin || isSuperAdmin;

  // Check if user has module_admin role
  const isModuleAdmin = activeMembership?.role === "module_admin";

  // Check if user is a regular member with access
  const isMember = !!activeMembership;

  // ============================================================================
  // Capability Calculation
  // ============================================================================
  // Phase 2: All capabilities are permissive by default for company members
  // This allows the system to function as before while preparing for future
  // role-based restrictions.
  
  // Base capabilities - all members can read if module is enabled
  const canRead = hasAccess && isMember;

  // Create/Edit capabilities - currently open to all members
  // Future: can be restricted via company settings
  const canCreate = hasAccess && isMember;
  const canEdit = hasAccess && isMember;

  // Archive/Delete capabilities - currently open to all members
  // Future: can be restricted to admins/specific roles
  const canArchive = hasAccess && isMember;
  const canDelete = hasAccess && isMember;

  // Publish capability - for Forms and LMS
  // Currently open but flagged for future admin-only restriction
  // This is the first capability likely to be restricted
  const canPublish = hasAccess && (isAdmin || isModuleAdmin || isMember);

  // Admin capability - for settings and templates
  // This remains open but is prepared for future restriction
  const canAdmin = hasAccess && (isAdmin || isModuleAdmin || isMember);

  /**
   * Assert that a capability is available, throw PermissionError if not.
   * Use this in mutation functions for backend enforcement.
   */
  const assertCapability = (capability: keyof ModuleCapabilities, action?: string) => {
    const capabilities: ModuleCapabilities = {
      canRead,
      canCreate,
      canEdit,
      canArchive,
      canDelete,
      canPublish,
      canAdmin,
    };

    if (!capabilities[capability]) {
      throw new PermissionError(capability, action);
    }
  };

  return {
    isModuleEnabled,
    hasAccess,
    loading,
    canRead,
    canCreate,
    canEdit,
    canArchive,
    canDelete,
    canPublish,
    canAdmin,
    assertCapability,
  };
}

// ============================================================================
// Module-Specific Permission Hooks
// ============================================================================

/**
 * CRM permissions hook
 */
export function useCrmPermissions() {
  return useModulePermissions("crm");
}

/**
 * External Contacts permissions - uses a pseudo module key
 * External Contacts is always available as a core module
 */
export function useExternalContactsPermissions() {
  const { 
    isCompanyAdmin, 
    isSiteAdmin, 
    isSuperAdmin,
    activeMembership,
    loading 
  } = useMembership();

  const isAdmin = isCompanyAdmin || isSiteAdmin || isSuperAdmin;
  const isModuleAdmin = activeMembership?.role === "module_admin";
  const isMember = !!activeMembership;
  const hasAccess = isMember;

  // External contacts is a core system - always available to members
  const canRead = hasAccess;
  const canCreate = hasAccess;
  const canEdit = hasAccess;
  const canArchive = hasAccess;
  const canDelete = hasAccess;
  const canPublish = hasAccess; // Not applicable
  const canAdmin = hasAccess && (isAdmin || isModuleAdmin);

  const assertCapability = (capability: keyof ModuleCapabilities, action?: string) => {
    const capabilities: ModuleCapabilities = {
      canRead,
      canCreate,
      canEdit,
      canArchive,
      canDelete,
      canPublish,
      canAdmin,
    };

    if (!capabilities[capability]) {
      throw new PermissionError(capability, action);
    }
  };

  return {
    isModuleEnabled: true, // Always enabled
    hasAccess,
    loading,
    canRead,
    canCreate,
    canEdit,
    canArchive,
    canDelete,
    canPublish,
    canAdmin,
    assertCapability,
  };
}

/**
 * Coaches/Partners permissions hook
 */
export function useCoachesPermissions() {
  return useModulePermissions("coaches");
}

/**
 * Forms permissions hook with publish-specific flag
 */
export function useFormsPermissions() {
  const permissions = useModulePermissions("forms");
  
  return {
    ...permissions,
    // Publish is a distinct action for forms
    // Currently permissive but ready for future restriction
    canPublishForms: permissions.canPublish,
  };
}

/**
 * LMS permissions hook with publish-specific flags
 */
export function useLmsPermissions() {
  const permissions = useModulePermissions("lms");
  
  return {
    ...permissions,
    // Course publishing is a distinct admin action
    canPublishCourses: permissions.canPublish,
    // Enrollment management
    canManageEnrollments: permissions.canEdit,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a permission error is a PermissionError
 */
export function isPermissionError(error: unknown): error is PermissionError {
  return error instanceof PermissionError;
}

/**
 * Get user-friendly message for permission denial
 */
export function getPermissionDeniedMessage(capability?: string): string {
  return "Admin permission required";
}
