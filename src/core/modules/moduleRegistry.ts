/**
 * Module Registry - Single source of truth for all BusinessOS modules.
 * 
 * This registry defines module metadata, routes, and default enablement state.
 * Used by navigation, route guards, and admin UI.
 */

import { LucideIcon, LayoutDashboard, Users, FolderKanban, CheckSquare, FileText, ClipboardList, GitBranch, GraduationCap, DollarSign, Settings, Calendar, MapPin, Building, Building2, Megaphone, BarChart3, Handshake, Contact, ClipboardCheck } from "lucide-react";

// ============= TYPES =============

export type ModuleId =
  | "core"
  | "crm"
  | "projects"
  | "tasks"
  | "docs"
  | "notes"
  | "calendar"
  | "groups"
  | "locations"
  | "departments"
  | "board_meetings"
  | "exit_survey"
  | "forms"
  | "workflows"
  | "lms"
  | "finance"
  | "reports"
  | "announcements"
  | "contacts"
  | "admin";

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  description: string;
  routePrefix: string;
  navLabel: string;
  icon: LucideIcon;
  requiredRoles: ("member" | "company_admin")[];
  defaultEnabled: boolean;
  /** If true, cannot be disabled via feature flags */
  isCore: boolean;
  /** Display order in navigation (lower = higher) */
  navOrder: number;
  /** Nav section this module belongs to */
  navSection: "main" | "operations" | "finance" | "learning" | "admin";
}

export interface FeatureFlag {
  id: string;
  company_id: string;
  module_id: string;
  enabled: boolean;
  updated_at: string;
}

// ============= MODULE DEFINITIONS =============

export const MODULE_REGISTRY: Record<ModuleId, ModuleDefinition> = {
  core: {
    id: "core",
    name: "Core Platform",
    description: "Dashboard and essential platform features",
    routePrefix: "/app",
    navLabel: "Dashboard",
    icon: LayoutDashboard,
    requiredRoles: ["member"],
    defaultEnabled: true,
    isCore: true,
    navOrder: 0,
    navSection: "main",
  },
  tasks: {
    id: "tasks",
    name: "Tasks",
    description: "Task management and tracking",
    routePrefix: "/app/tasks",
    navLabel: "Tasks",
    icon: CheckSquare,
    requiredRoles: ["member"],
    defaultEnabled: true,
    isCore: true,
    navOrder: 10,
    navSection: "main",
  },
  projects: {
    id: "projects",
    name: "Projects",
    description: "Project planning and management",
    routePrefix: "/app/projects",
    navLabel: "Projects",
    icon: FolderKanban,
    requiredRoles: ["member"],
    defaultEnabled: true,
    isCore: true,
    navOrder: 20,
    navSection: "main",
  },
  calendar: {
    id: "calendar",
    name: "Calendar",
    description: "Events and scheduling",
    routePrefix: "/app/calendar",
    navLabel: "Calendar",
    icon: Calendar,
    requiredRoles: ["member"],
    defaultEnabled: true,
    isCore: true,
    navOrder: 30,
    navSection: "main",
  },
  notes: {
    id: "notes",
    name: "Notes",
    description: "Note-taking and documentation",
    routePrefix: "/app/notes",
    navLabel: "Notes",
    icon: FileText,
    requiredRoles: ["member"],
    defaultEnabled: true,
    isCore: true,
    navOrder: 40,
    navSection: "main",
  },
  docs: {
    id: "docs",
    name: "Documents",
    description: "File and document management",
    routePrefix: "/app/documents",
    navLabel: "Documents",
    icon: FileText,
    requiredRoles: ["member"],
    defaultEnabled: true,
    isCore: true,
    navOrder: 50,
    navSection: "main",
  },
  groups: {
    id: "groups",
    name: "Groups",
    description: "Team and group management",
    routePrefix: "/app/groups",
    navLabel: "Groups",
    icon: Users,
    requiredRoles: ["member"],
    defaultEnabled: true,
    isCore: true,
    navOrder: 60,
    navSection: "main",
  },
  locations: {
    id: "locations",
    name: "Locations",
    description: "Location and site management",
    routePrefix: "/app/locations",
    navLabel: "Locations",
    icon: MapPin,
    requiredRoles: ["member"],
    defaultEnabled: true,
    isCore: true,
    navOrder: 70,
    navSection: "main",
  },
  board_meetings: {
    id: "board_meetings",
    name: "Board Meetings",
    description: "Board meeting management, agendas, voting, and minutes",
    routePrefix: "/app/board",
    navLabel: "Board Meetings",
    icon: Building,
    requiredRoles: ["member"],
    defaultEnabled: false,
    isCore: false,
    navOrder: 85,
    navSection: "main",
  },
  departments: {
    id: "departments",
    name: "Departments",
    description: "Department directory and structure",
    routePrefix: "/app/departments",
    navLabel: "Departments",
    icon: Building2,
    requiredRoles: ["member"],
    defaultEnabled: true,
    isCore: false,
    navOrder: 80,
    navSection: "main",
  },
  exit_survey: {
    id: "exit_survey",
    name: "Exit Survey",
    description: "Patient exit survey management and analytics",
    routePrefix: "/app/exit-survey",
    navLabel: "Exit Survey",
    icon: ClipboardCheck,
    requiredRoles: ["member"],
    defaultEnabled: true,
    isCore: false,
    navOrder: 88,
    navSection: "main",
  },
  crm: {
    id: "crm",
    name: "CRM",
    description: "Customer relationship management",
    routePrefix: "/app/crm",
    navLabel: "CRM",
    icon: Handshake,
    requiredRoles: ["member"],
    defaultEnabled: false,
    isCore: false,
    navOrder: 100,
    navSection: "operations",
  },
  contacts: {
    id: "contacts",
    name: "Contacts",
    description: "External contact management",
    routePrefix: "/app/contacts",
    navLabel: "Contacts",
    icon: Contact,
    requiredRoles: ["member"],
    defaultEnabled: false,
    isCore: false,
    navOrder: 110,
    navSection: "operations",
  },
  forms: {
    id: "forms",
    name: "Forms",
    description: "Form builder and submissions",
    routePrefix: "/app/forms",
    navLabel: "Forms",
    icon: ClipboardList,
    requiredRoles: ["member"],
    defaultEnabled: false,
    isCore: false,
    navOrder: 120,
    navSection: "operations",
  },
  workflows: {
    id: "workflows",
    name: "Workflows",
    description: "Process automation and workflows",
    routePrefix: "/app/workflows",
    navLabel: "Workflows",
    icon: GitBranch,
    requiredRoles: ["member"],
    defaultEnabled: false,
    isCore: false,
    navOrder: 130,
    navSection: "operations",
  },
  announcements: {
    id: "announcements",
    name: "Announcements",
    description: "Company-wide announcements",
    routePrefix: "/app/announcements",
    navLabel: "Announcements",
    icon: Megaphone,
    requiredRoles: ["member"],
    defaultEnabled: false,
    isCore: false,
    navOrder: 140,
    navSection: "operations",
  },
  finance: {
    id: "finance",
    name: "Finance",
    description: "Financial management and reporting",
    routePrefix: "/app/finance",
    navLabel: "Finance",
    icon: DollarSign,
    requiredRoles: ["member"],
    defaultEnabled: false,
    isCore: false,
    navOrder: 200,
    navSection: "finance",
  },
  reports: {
    id: "reports",
    name: "Reports",
    description: "Analytics and reporting",
    routePrefix: "/app/reports",
    navLabel: "Reports",
    icon: BarChart3,
    requiredRoles: ["member"],
    defaultEnabled: false,
    isCore: false,
    navOrder: 210,
    navSection: "finance",
  },
  lms: {
    id: "lms",
    name: "Learning",
    description: "Learning management system",
    routePrefix: "/app/lms",
    navLabel: "Learning",
    icon: GraduationCap,
    requiredRoles: ["member"],
    defaultEnabled: false,
    isCore: false,
    navOrder: 300,
    navSection: "learning",
  },
  admin: {
    id: "admin",
    name: "Admin",
    description: "Company administration",
    routePrefix: "/app/admin",
    navLabel: "Admin",
    icon: Settings,
    requiredRoles: ["company_admin"],
    defaultEnabled: true,
    isCore: true,
    navOrder: 900,
    navSection: "admin",
  },
};

// ============= HELPER FUNCTIONS =============

/**
 * Get module definition by route pathname.
 * Returns undefined if no module matches the route.
 */
export function getModuleByRoute(pathname: string): ModuleDefinition | undefined {
  // Sort by route prefix length descending to match most specific first
  const sortedModules = Object.values(MODULE_REGISTRY).sort(
    (a, b) => b.routePrefix.length - a.routePrefix.length
  );

  for (const module of sortedModules) {
    // Exact match for core dashboard
    if (module.id === "core" && pathname === "/app") {
      return module;
    }
    // Prefix match for other modules
    if (module.id !== "core" && pathname.startsWith(module.routePrefix)) {
      return module;
    }
  }

  return undefined;
}

/**
 * Check if a module is enabled for a company.
 * Core modules are always enabled.
 * 
 * Feature flags act as an OVERRIDE mechanism:
 * - If a flag explicitly exists and is `false` → module is disabled (blast radius control)
 * - If no flag exists → module is enabled (defers to legacy company_modules system)
 * - Core modules are always enabled regardless of flags
 * 
 * @param moduleId - The module ID to check
 * @param flags - Map of moduleId to enabled state from feature_flags table
 * @returns true if the module is enabled
 */
export function isModuleEnabled(
  moduleId: ModuleId,
  flags: Map<string, boolean>
): boolean {
  const module = MODULE_REGISTRY[moduleId];
  if (!module) return false;
  
  // Core modules are always enabled
  if (module.isCore) return true;
  
  // Feature flags act as explicit overrides only
  // If a flag exists, respect its value; otherwise default to enabled
  // This allows the legacy company_modules system to remain authoritative
  // while feature_flags can be used to explicitly disable modules for blast radius control
  if (flags.has(moduleId)) {
    return flags.get(moduleId) ?? true;
  }
  
  // No flag exists - allow module (defer to legacy system)
  return true;
}

/**
 * Get list of enabled modules, ordered by navOrder.
 * 
 * @param flags - Map of moduleId to enabled state
 * @param includeAdmin - Whether to include admin modules (based on user role)
 * @returns Ordered array of enabled module definitions
 */
export function getEnabledModules(
  flags: Map<string, boolean>,
  includeAdmin: boolean = false
): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY)
    .filter((module) => {
      // Filter out admin if user doesn't have access
      if (module.navSection === "admin" && !includeAdmin) {
        return false;
      }
      return isModuleEnabled(module.id, flags);
    })
    .sort((a, b) => a.navOrder - b.navOrder);
}

/**
 * Get all modules grouped by nav section.
 */
export function getModulesBySection(
  flags: Map<string, boolean>,
  includeAdmin: boolean = false
): Record<string, ModuleDefinition[]> {
  const enabledModules = getEnabledModules(flags, includeAdmin);
  
  return enabledModules.reduce((acc, module) => {
    const section = module.navSection;
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(module);
    return acc;
  }, {} as Record<string, ModuleDefinition[]>);
}

/**
 * Get core modules that cannot be disabled.
 */
export function getCoreModules(): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter((m) => m.isCore);
}

/**
 * Get premium/optional modules that can be toggled.
 */
export function getToggleableModules(): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY)
    .filter((m) => !m.isCore)
    .sort((a, b) => a.navOrder - b.navOrder);
}

/**
 * Map legacy moduleKey to new ModuleId.
 * Used for backward compatibility with existing code.
 */
export function legacyModuleKeyToModuleId(moduleKey: string): ModuleId | undefined {
  const mapping: Record<string, ModuleId> = {
    tasks: "tasks",
    projects: "projects",
    calendar: "calendar",
    notes: "notes",
    documents: "docs",
    groups: "groups",
    locations: "locations",
    departments: "departments",
    board_meetings: "board_meetings",
    exit_survey: "exit_survey",
    crm: "crm",
    external_contacts: "contacts",
    forms: "forms",
    workflows: "workflows",
    announcements: "announcements",
    finance: "finance",
    reports: "reports",
    lms: "lms",
  };
  return mapping[moduleKey];
}
