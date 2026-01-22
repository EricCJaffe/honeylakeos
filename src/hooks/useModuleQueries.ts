import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { ModuleKey } from "./useModuleAccess";
import { useCompanyModules } from "./useCompanyModules";

/**
 * Module-specific query keys that should be invalidated when a module is toggled
 */
const MODULE_QUERY_KEYS: Record<ModuleKey, string[][]> = {
  tasks: [
    ["tasks"],
    ["task"],
    ["task-series"],
    ["task-recurrence-exceptions"],
    ["task-recurrence-overrides"],
    ["task-assignees"],
  ],
  projects: [
    ["projects"],
    ["project"],
    ["project-phases"],
    ["project-phase-templates"],
    ["project-members"],
    ["project-documents"],
  ],
  calendar: [
    ["events"],
    ["event"],
    ["event-series"],
    ["recurring-events"],
    ["event-occurrences"],
    ["event-recurrence-exceptions"],
    ["event-recurrence-overrides"],
    ["event-attendees"],
    ["event-documents"],
  ],
  documents: [
    ["documents"],
    ["document"],
    ["document-files"],
  ],
  notes: [
    ["notes"],
    ["note"],
  ],
  folders: [
    ["folders"],
    ["folder"],
  ],
  groups: [
    ["groups"],
    ["group"],
    ["group-members"],
  ],
  locations: [
    ["locations"],
    ["location"],
    ["location-members"],
  ],
  forms: [
    ["forms"],
    ["form"],
    ["form-fields"],
    ["form-submissions"],
  ],
  workflows: [
    ["workflows"],
    ["workflow"],
    ["workflow-runs"],
  ],
  lms: [
    ["courses"],
    ["course"],
    ["cohorts"],
    ["cohort"],
    ["lms-sessions"],
    ["lms-session"],
    ["enrollments"],
    ["enrollment"],
    ["cohort-coaches"],
  ],
  crm: [
    ["crm-clients"],
    ["crm-client"],
    ["external-contacts"], // External contacts use CRM module
    ["external-contact"],
  ],
  coaches: [
    ["coach-profiles"],
    ["coach-profile"],
  ],
  coaching: [
    ["coaching-orgs"],
    ["coaching-org"],
    ["coaching-org-memberships"],
    ["coaching-managers"],
    ["coaching-coaches"],
    ["coaching-manager-assignments"],
    ["coaching-org-engagements"],
    ["coaching-engagement-assignments"],
    ["coaching-org-groups"],
    ["coaching-group-members"],
    ["coaching-permission-templates"],
    ["coaching-engagement-onboarding"],
    ["access-grants"],
  ],
  sales: [
    ["sales_pipelines"],
    ["sales_pipeline"],
    ["sales_pipeline_stages"],
    ["sales_opportunities"],
    ["sales_opportunity"],
    ["sales_campaigns"],
    ["sales_campaign"],
  ],
  donors: [
    ["donor-profiles"],
    ["donor-profile"],
    ["donations"],
    ["donation"],
    ["donor-pledges"],
    ["donor-campaigns"],
  ],
  finance: [
    ["finance-accounts"],
    ["invoices"],
    ["payments"],
    ["receipts"],
    ["bank-transactions"],
  ],
  reports: [
    ["analytics"],
    ["exports"],
    ["report-definitions"],
  ],
};

/**
 * Shared query keys that may need invalidation across modules
 */
const SHARED_QUERY_KEYS = [
  ["entity-links"],
  ["entity-search"],
  ["templates"],
  ["active-templates"],
];

/**
 * Hook to get a function that invalidates all queries for a specific module
 */
export function useModuleQueryInvalidation() {
  const queryClient = useQueryClient();

  const invalidateModuleQueries = useCallback(
    (moduleKey: ModuleKey) => {
      const queryKeys = MODULE_QUERY_KEYS[moduleKey] || [];
      
      // Invalidate module-specific queries
      queryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      // Also invalidate shared queries that may reference this module's data
      SHARED_QUERY_KEYS.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      // Invalidate the module access cache
      queryClient.invalidateQueries({ queryKey: ["company-module"] });
      queryClient.invalidateQueries({ queryKey: ["company-modules"] });
    },
    [queryClient]
  );

  const invalidateAllModuleQueries = useCallback(() => {
    // Invalidate all module queries
    Object.values(MODULE_QUERY_KEYS).forEach((keys) => {
      keys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    });

    // Invalidate shared queries
    SHARED_QUERY_KEYS.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });

    // Invalidate module access cache
    queryClient.invalidateQueries({ queryKey: ["company-module"] });
    queryClient.invalidateQueries({ queryKey: ["company-modules"] });
  }, [queryClient]);

  return {
    invalidateModuleQueries,
    invalidateAllModuleQueries,
  };
}

/**
 * Hook that checks if a module is enabled before allowing queries
 * Returns enabled state and loading - use enabled to conditionally run queries
 */
export function useModuleEnabled(moduleKey: ModuleKey) {
  const { isEnabled, loading } = useCompanyModules();

  return {
    isEnabled: isEnabled(moduleKey),
    loading,
  };
}
