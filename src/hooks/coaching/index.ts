/**
 * Coaching Hooks Index
 * 
 * Central export for all coaching-related hooks including:
 * - Program Pack Resolution Engine
 * - Dynamic Form Resolution
 * - Terminology Resolution
 * - Workflow Resolution
 * - Dashboard Widget Resolution
 */

// Program Pack Resolution Engine
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
  buildResolvedKey,
  extractBaseKey,
  hasProgramPrefix,
  type ResolvedAsset,
  type ProgramPackInfo,
} from "../useProgramPackResolver";

// Dynamic Form Resolution
export {
  useResolvedForm,
  useEngagementResolvedForm,
  useAvailableFormBaseKeys,
  useFormActivationMutations,
  extractBaseKeyFromTemplate,
  buildTemplateKey,
  type ResolvedForm,
} from "../useFormResolver";

// Coaching Terminology (uses resolution engine internally)
export {
  useCoachingTerminology,
  useEngagementTerminology,
  DEFAULT_COACHING_TERMS,
} from "../useCoachingTerminology";

// Coaching Role & Context
export {
  useCoachingRole,
  getCoachingDashboardRoute,
  type CoachingRole,
  type CoachingRoleInfo,
} from "../useCoachingRole";

// Org Workflows (uses resolution engine)
export {
  useOrgWorkflows,
  useOrgWorkflow,
  useOrgWorkflowMutations,
  usePackWorkflowTemplates,
  type OrgWorkflow,
  type OrgWorkflowStep,
} from "../useOrgWorkflows";

// Form Templates (uses resolution engine)
export {
  getFormTemplate,
  resolveFormTemplateKey as resolveFormKey,
  extractFormBaseKey,
  useFormByTemplateKey,
  useCreateFormFromTemplate,
  useEnsureFormFromTemplate,
  getAvailableFormTemplates,
} from "../useFormByTemplateKey";
