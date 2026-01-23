/**
 * Coaching Hooks Index
 * 
 * Central export for all coaching-related hooks including:
 * - Unified Program Key Hook (primary entry point)
 * - Program Pack Resolution Engine
 * - Dynamic Form Resolution
 * - Terminology Resolution
 * - Workflow Resolution
 * - Dashboard Widget Resolution
 */

// =============================================
// PRIMARY: Unified Program Key Hook
// =============================================
// This is the main entry point for program pack resolution.
// Use this hook to access programKey, terminology, and asset resolvers
// without prop drilling.
export {
  useProgramKey,
  useSimpleProgramKey,
  useAvailableProgramPacks as useAvailablePacks,
  buildResolvedKey,
  extractBaseKey,
  hasProgramPrefix,
  type ProgramPack,
  type TerminologyResult,
  type ResolvedAssets,
  type ResolvedFormAsset,
  type ResolvedWorkflowAsset,
  type ResolvedDashboardWidget,
  type DashboardType,
  type UseProgramKeyResult,
} from "../useProgramKey";

// =============================================
// Program Pack Resolution Engine (legacy/detailed access)
// =============================================
export {
  useOrgProgramKey,
  useActiveProgramKey,
  useResolvedTerminology,
  useTermResolver,
  useResolvedFormTemplate,
  resolveFormTemplateKey,
  useResolvedWorkflowTemplates,
  useResolvedDashboardWidgets,
  useAvailableProgramPacks,
  useCurrentPackInfo,
  usePrefetchPackAssets,
  type ResolvedAsset,
  type ProgramPackInfo,
} from "../useProgramPackResolver";

// =============================================
// Dynamic Form Resolution
// =============================================
export {
  useResolvedForm,
  useEngagementResolvedForm,
  useAvailableFormBaseKeys,
  useFormActivationMutations,
  extractBaseKeyFromTemplate,
  buildTemplateKey,
  type ResolvedForm,
} from "../useFormResolver";

// =============================================
// Coaching Terminology (uses resolution engine internally)
// =============================================
export {
  useCoachingTerminology,
  useEngagementTerminology,
  DEFAULT_COACHING_TERMS,
} from "../useCoachingTerminology";

// =============================================
// Coaching Role & Context
// =============================================
export {
  useCoachingRole,
  getCoachingDashboardRoute,
  type CoachingRole,
  type CoachingRoleInfo,
} from "../useCoachingRole";

// =============================================
// Org Workflows (uses resolution engine)
// =============================================
export {
  useOrgWorkflows,
  useOrgWorkflow,
  useOrgWorkflowMutations,
  usePackWorkflowTemplates,
  type OrgWorkflow,
  type OrgWorkflowStep,
} from "../useOrgWorkflows";

// =============================================
// Org Program Settings (pack selection & seeding)
// =============================================
export {
  useAvailableProgramPacksWithCounts,
  useOrgProgramStatus,
  useOrgProgramMutations,
  type ProgramPackOption,
  type OrgProgramStatus,
  type ApplyPackResult,
  type ReseedResult,
} from "../useOrgProgramSettings";

// =============================================
// Form Templates (uses resolution engine)
// =============================================
export {
  getFormTemplate,
  resolveFormTemplateKey as resolveFormKey,
  extractFormBaseKey,
  useFormByTemplateKey,
  useCreateFormFromTemplate,
  useEnsureFormFromTemplate,
  getAvailableFormTemplates,
} from "../useFormByTemplateKey";
