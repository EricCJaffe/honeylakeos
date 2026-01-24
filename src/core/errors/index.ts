/**
 * Core Errors - Public API
 * 
 * Export all error handling and resilience utilities.
 */

// Logging
export { logError, logWarning, logInfo, generateErrorId } from "./logging";
export type { ErrorContext } from "./logging";

// Error Boundaries
export { AppErrorBoundary, AppErrorFallback } from "./AppErrorBoundary";
export { ModuleErrorBoundary, withModuleErrorBoundary } from "./ModuleErrorBoundary";

// Safe Mode
export { SafeModeShell } from "./SafeModeShell";
