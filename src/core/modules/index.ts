/**
 * Core Modules - Public API
 * 
 * Export all module-related functionality from a single entry point.
 */

// Registry
export {
  MODULE_REGISTRY,
  getModuleByRoute,
  isModuleEnabled,
  getEnabledModules,
  getModulesBySection,
  getCoreModules,
  getToggleableModules,
  legacyModuleKeyToModuleId,
} from "./moduleRegistry";

export type { ModuleId, ModuleDefinition, FeatureFlag } from "./moduleRegistry";

// Flags Hook
export {
  useCompanyModuleFlags,
  featureFlagsQueryKey,
  ModuleFlagsProvider,
  useModuleFlags,
} from "./useCompanyModuleFlags";

export type { FeatureFlagRow, UseCompanyModuleFlagsResult } from "./useCompanyModuleFlags";

// Components
export { ModuleDisabledPage } from "./ModuleDisabledPage";
export { ModuleFlagGuard, withModuleFlagGuard } from "./ModuleFlagGuard";
export { FeatureFlagsPanel } from "./FeatureFlagsPanel";
