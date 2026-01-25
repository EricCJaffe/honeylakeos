import { useMembership } from "@/lib/membership";
import { useModuleAccess, ModuleKey } from "./useModuleAccess";
import { useCapabilitySettings, CapabilityFlag, DEFAULT_CAPABILITY_SETTINGS } from "./useCapabilitySettings";

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
 * Mapping from module key to capability flags
 */
const MODULE_CAPABILITY_MAP: Record<string, { manage: CapabilityFlag; publish?: CapabilityFlag }> = {
  crm: { manage: "crm_member_manage_enabled" },
  coaches: { manage: "coaches_member_manage_enabled" },
  forms: { manage: "forms_member_manage_enabled", publish: "forms_member_publish_enabled" },
  lms: { manage: "lms_member_manage_enabled", publish: "lms_member_publish_enabled" },
};

/**
 * Centralized hook for checking module permissions and capabilities.
 * 
 * This hook provides capability flags for each module that can be used to:
 * 1. Gate UI elements (hide/disable buttons)
 * 2. Validate backend operations (throw PermissionError if not allowed)
 * 
 * Capabilities are determined by:
 * - Admin status (admins always have all capabilities)
 * - Company capability settings (configurable by company admins)
 * - Module enablement status
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

  const { settings, isLoading: settingsLoading } = useCapabilitySettings();

  const loading = membershipLoading || moduleLoading || settingsLoading;

  // Check if user is any kind of admin
  const isAdmin = isCompanyAdmin || isSiteAdmin || isSuperAdmin;

  // Check if user is a regular member with access
  const isMember = !!activeMembership;

  // Get capability flags for this module
  const moduleCapabilities = MODULE_CAPABILITY_MAP[moduleKey];

  // ============================================================================
  // Capability Calculation
  // ============================================================================
  
  // Base capabilities - all members can read if module is enabled
  const canRead = hasAccess && isMember;

  // Manage capabilities (create/edit/archive/delete)
  // Admins always have access; members check capability flag
  const memberCanManage = moduleCapabilities?.manage
    ? settings[moduleCapabilities.manage]
    : true; // Default permissive for modules without explicit capability

  const canCreate = hasAccess && (isAdmin || (isMember && memberCanManage));
  const canEdit = hasAccess && (isAdmin || (isMember && memberCanManage));
  const canArchive = hasAccess && (isAdmin || (isMember && memberCanManage));
  const canDelete = hasAccess && (isAdmin || (isMember && memberCanManage));

  // Publish capability - for Forms and LMS
  // Admins always have access; members check publish capability flag
  const memberCanPublish = moduleCapabilities?.publish
    ? settings[moduleCapabilities.publish]
    : memberCanManage; // Fall back to manage capability if no publish flag

  const canPublish = hasAccess && (isAdmin || (isMember && memberCanPublish));

  // Admin capability - for settings and templates
  // This is always admin-only
  const canAdmin = hasAccess && isAdmin;

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
    loading: membershipLoading 
  } = useMembership();

  const { settings, isLoading: settingsLoading } = useCapabilitySettings();

  const loading = membershipLoading || settingsLoading;

  const isAdmin = isCompanyAdmin || isSiteAdmin || isSuperAdmin;
  const isMember = !!activeMembership;
  const hasAccess = isMember;

  // Check capability flag
  const memberCanManage = settings.contacts_member_manage_enabled;

  // External contacts is a core system - always available to members for reading
  const canRead = hasAccess;
  const canCreate = hasAccess && (isAdmin || memberCanManage);
  const canEdit = hasAccess && (isAdmin || memberCanManage);
  const canArchive = hasAccess && (isAdmin || memberCanManage);
  const canDelete = hasAccess && (isAdmin || memberCanManage);
  const canPublish = hasAccess; // Not applicable
  const canAdmin = hasAccess && isAdmin;

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
