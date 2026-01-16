/**
 * @deprecated LMS v1 enrollments have been replaced by Assignments in LMS v2.
 * This file is kept for reference but the underlying tables have been renamed to *_deprecated.
 * Use useLmsAssignments for the new assignment system.
 */

import { useQuery } from "@tanstack/react-query";

export type EnrollmentStatus = "enrolled" | "completed" | "dropped" | "waitlisted";

export interface LmsEnrollment {
  id: string;
  company_id: string;
  cohort_id: string;
  external_contact_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EnrollmentFilters {
  cohortId?: string;
  status?: EnrollmentStatus | "all";
  search?: string;
}

/**
 * @deprecated Use useLmsAssignments instead
 */
export function useLmsEnrollments(_filters: EnrollmentFilters = {}) {
  return useQuery({
    queryKey: ["enrollments-deprecated"],
    queryFn: async () => [] as LmsEnrollment[],
    enabled: false,
  });
}

/**
 * @deprecated Use useLmsAssignments instead
 */
export function useLmsEnrollmentsByCohort(_cohortId: string | undefined) {
  return useQuery({
    queryKey: ["enrollments-by-cohort-deprecated"],
    queryFn: async () => [] as LmsEnrollment[],
    enabled: false,
  });
}

/**
 * @deprecated LMS v1 enrollments are no longer available
 */
export function useLmsEnrollmentMutations() {
  return {
    enrollParticipant: { mutate: () => {}, mutateAsync: async () => ({} as LmsEnrollment), isPending: false },
    updateEnrollment: { mutate: () => {}, mutateAsync: async () => ({} as LmsEnrollment), isPending: false },
    unenrollParticipant: { mutate: () => {}, mutateAsync: async () => "", isPending: false },
  };
}

export function getEnrollmentStatusLabel(status: EnrollmentStatus): string {
  switch (status) {
    case "enrolled": return "Enrolled";
    case "completed": return "Completed";
    case "dropped": return "Dropped";
    case "waitlisted": return "Waitlisted";
    default: return status;
  }
}

export function getEnrollmentStatusColor(status: EnrollmentStatus): string {
  switch (status) {
    case "enrolled": return "bg-primary/10 text-primary";
    case "completed": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "dropped": return "bg-destructive/10 text-destructive";
    case "waitlisted": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    default: return "bg-muted";
  }
}
