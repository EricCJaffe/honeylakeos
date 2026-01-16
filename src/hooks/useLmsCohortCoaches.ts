/**
 * @deprecated LMS v1 cohort coaches have been replaced by the new LMS v2 system.
 * This file is kept for reference but the underlying tables have been renamed to *_deprecated.
 */

import { useQuery } from "@tanstack/react-query";

export interface LmsCohortCoach {
  id: string;
  company_id: string;
  cohort_id: string;
  coach_profile_id: string | null;
  external_contact_id: string | null;
  role: string;
  created_by: string | null;
  created_at: string;
}

export interface AssignCoachInput {
  cohort_id: string;
  coach_profile_id?: string;
  external_contact_id?: string;
  role?: string;
}

/**
 * @deprecated LMS v1 cohort coaches are no longer available
 */
export function useLmsCohortCoaches(_cohortId: string | undefined) {
  return useQuery({
    queryKey: ["cohort-coaches-deprecated"],
    queryFn: async () => [] as LmsCohortCoach[],
    enabled: false,
  });
}

/**
 * @deprecated LMS v1 cohort coach mutations are no longer available
 */
export function useLmsCohortCoachMutations() {
  return {
    assignCoach: { mutate: () => {}, mutateAsync: async () => ({} as LmsCohortCoach), isPending: false },
    updateCoachRole: { mutate: () => {}, mutateAsync: async () => ({} as LmsCohortCoach), isPending: false },
    removeCoach: { mutate: () => {}, mutateAsync: async () => ({ assignmentId: "", cohortId: "" }), isPending: false },
  };
}

export function getCoachDisplayName(_coach: LmsCohortCoach): string {
  return "Unknown";
}

export function getCoachEmail(_coach: LmsCohortCoach): string | null {
  return null;
}
