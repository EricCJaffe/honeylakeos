/**
 * Centralized query configuration for performance guardrails.
 * Used to ensure consistent pagination, caching, and limits across the app.
 */

// ============= PAGINATION DEFAULTS =============

export const LIST_LIMITS = {
  /** Default page size for list views */
  DEFAULT_PAGE_SIZE: 25,
  /** Maximum items for infinite scroll */
  MAX_INFINITE_SCROLL: 100,
  /** Maximum items for dropdowns/selectors */
  MAX_DROPDOWN_ITEMS: 50,
  /** Maximum items for recent items */
  MAX_RECENT_ITEMS: 20,
  /** Maximum items for search results */
  MAX_SEARCH_RESULTS: 25,
} as const;

// ============= QUERY TIMEOUTS =============

export const QUERY_TIMEOUTS = {
  /** Timeout for standard queries (ms) */
  STANDARD: 10000,
  /** Timeout for analytics/report queries (ms) */
  ANALYTICS: 30000,
  /** Timeout for search queries (ms) */
  SEARCH: 5000,
} as const;

// ============= STALE TIMES (CACHING) =============

export const STALE_TIMES = {
  /** Static data that rarely changes (modules, navigation) */
  STATIC: 10 * 60 * 1000, // 10 minutes
  /** Semi-static data (folder trees, task lists) */
  SEMI_STATIC: 5 * 60 * 1000, // 5 minutes
  /** Frequently updated data (tasks, projects) */
  DYNAMIC: 1 * 60 * 1000, // 1 minute
  /** Real-time data (notifications, alerts) */
  REALTIME: 30 * 1000, // 30 seconds
  /** User-specific preferences */
  USER_PREFS: 15 * 60 * 1000, // 15 minutes
} as const;

// ============= REPORT LIMITS =============

export const REPORT_LIMITS = {
  /** Maximum date range in days for reports */
  MAX_DATE_RANGE_DAYS: 730, // 24 months
  /** Default date range in days */
  DEFAULT_DATE_RANGE_DAYS: 30,
  /** Maximum rows in report results */
  MAX_RESULT_ROWS: 1000,
  /** Cache duration for report results (ms) */
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
} as const;

// ============= DEBOUNCE TIMES =============

export const DEBOUNCE_TIMES = {
  /** Debounce for search inputs */
  SEARCH: 300,
  /** Debounce for auto-save */
  AUTOSAVE: 1000,
  /** Debounce for filter changes */
  FILTER: 200,
} as const;

// ============= ERROR MESSAGES =============

export const FRIENDLY_ERRORS = {
  PERMISSION_DENIED: "You don't have permission to perform this action.",
  NOT_FOUND: "The item you're looking for was not found or may have been deleted.",
  STALE_LINK: "This link points to an item that no longer exists.",
  NETWORK_ERROR: "Unable to connect. Please check your internet connection.",
  TIMEOUT: "This request is taking too long. Please try again.",
  UNKNOWN: "Something went wrong. Please try again.",
} as const;

// ============= QUERY KEY FACTORIES =============

/**
 * Type-safe query key factories for consistent cache management
 */
export const queryKeys = {
  // Navigation & Config
  modules: () => ["modules"] as const,
  companyModules: (companyId: string) => ["company-modules-full", companyId] as const,
  navigation: (companyId: string) => ["navigation", companyId] as const,
  terminology: (companyId: string) => ["terminology", companyId] as const,

  // Folders
  folders: (companyId: string, scope?: string) => 
    scope ? ["folders", companyId, scope] as const : ["folders", companyId] as const,
  folderTree: (companyId: string) => ["folder-tree", companyId] as const,

  // Tasks
  tasks: (companyId: string) => ["tasks", companyId] as const,
  taskLists: (companyId: string) => ["task-lists", companyId] as const,
  myTasks: (userId: string) => ["my-tasks", userId] as const,
  projectTasks: (projectId: string) => ["project-tasks", projectId] as const,

  // Projects
  projects: (companyId: string) => ["projects", companyId] as const,
  projectPhases: (projectId: string) => ["project-phases", projectId] as const,

  // Documents & Notes
  documents: (companyId: string, folderId?: string) => 
    folderId ? ["documents", companyId, folderId] as const : ["documents", companyId] as const,
  notes: (companyId: string, folderId?: string) => 
    folderId ? ["notes", companyId, folderId] as const : ["notes", companyId] as const,

  // Recent Items
  recentItems: (companyId: string, userId: string) => ["recent-items", companyId, userId] as const,
  savedViews: (companyId: string, userId: string) => ["saved-views", companyId, userId] as const,

  // Reports
  reports: (companyId: string) => ["reports", companyId] as const,
  reportRuns: (reportId: string) => ["report-runs", reportId] as const,

  // Partner/engagement alerts
  partnerAlerts: (companyId: string) => ["partner-alerts", companyId] as const,
  healthScores: (companyId: string) => ["health-scores", companyId] as const,
} as const;
