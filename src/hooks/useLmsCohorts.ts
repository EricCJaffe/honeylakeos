/**
 * @deprecated LMS v1 cohorts have been replaced by Learning Paths and Courses in LMS v2.
 * This file is kept for reference but the underlying tables have been renamed to *_deprecated.
 * Use useLmsLearningPaths and useLmsCourses for the new self-paced learning system.
 */

import { useQuery } from "@tanstack/react-query";

export type CohortStatus = "planned" | "active" | "completed" | "archived";

export interface LmsCohort {
  id: string;
  company_id: string;
  course_id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: CohortStatus;
  linked_project_id: string | null;
  settings: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CohortFilters {
  courseId?: string;
  status?: CohortStatus | "all";
  search?: string;
}

/**
 * @deprecated Use useLmsLearningPaths instead
 */
export function useLmsCohorts(_filters: CohortFilters = {}) {
  return useQuery({
    queryKey: ["cohorts-deprecated"],
    queryFn: async () => [] as LmsCohort[],
    enabled: false, // Disabled - deprecated table
  });
}

/**
 * @deprecated Use useLmsLearningPath instead
 */
export function useLmsCohort(_cohortId: string | undefined) {
  return useQuery({
    queryKey: ["cohort-deprecated"],
    queryFn: async () => null as LmsCohort | null,
    enabled: false, // Disabled - deprecated table
  });
}

/**
 * @deprecated LMS v1 cohorts are no longer available
 */
export function useLmsCohortMutations() {
  return {
    createCohort: { mutate: () => {}, mutateAsync: async () => ({} as LmsCohort), isPending: false },
    updateCohort: { mutate: () => {}, mutateAsync: async () => ({} as LmsCohort), isPending: false },
    updateCohortStatus: { mutate: () => {}, mutateAsync: async () => ({} as LmsCohort), isPending: false },
    deleteCohort: { mutate: () => {}, mutateAsync: async () => "", isPending: false },
  };
}

export function getCohortStatusLabel(status: CohortStatus): string {
  switch (status) {
    case "planned": return "Planned";
    case "active": return "Active";
    case "completed": return "Completed";
    case "archived": return "Archived";
    default: return status;
  }
}

export function getCohortStatusColor(status: CohortStatus): string {
  switch (status) {
    case "planned": return "bg-muted text-muted-foreground";
    case "active": return "bg-primary/10 text-primary";
    case "completed": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "archived": return "bg-destructive/10 text-destructive";
    default: return "bg-muted";
  }
}
