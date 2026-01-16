/**
 * @deprecated LMS v1 sessions have been replaced by Lessons in LMS v2.
 * This file is kept for reference but the underlying tables have been renamed to *_deprecated.
 * Use useLmsLessons for the new self-paced learning system.
 */

import { useQuery } from "@tanstack/react-query";

export interface LmsSession {
  id: string;
  company_id: string;
  course_id: string;
  cohort_id: string | null;
  title: string;
  description: string | null;
  start_at: string | null;
  end_at: string | null;
  all_day: boolean;
  location_text: string | null;
  meeting_url: string | null;
  linked_event_id: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionInput {
  course_id: string;
  cohort_id?: string;
  title: string;
  description?: string;
  start_at?: string;
  end_at?: string;
  all_day?: boolean;
  location_text?: string;
  meeting_url?: string;
  createCalendarEvent?: boolean;
}

export interface UpdateSessionInput {
  title?: string;
  description?: string;
  start_at?: string | null;
  end_at?: string | null;
  all_day?: boolean;
  location_text?: string | null;
  meeting_url?: string | null;
  sort_order?: number;
}

export interface SessionFilters {
  courseId?: string;
  cohortId?: string;
  search?: string;
}

/**
 * @deprecated Use useLmsLessons instead
 */
export function useLmsSessions(_filters: SessionFilters = {}) {
  return useQuery({
    queryKey: ["lms-sessions-deprecated"],
    queryFn: async () => [] as LmsSession[],
    enabled: false,
  });
}

/**
 * @deprecated Use useLmsLesson instead
 */
export function useLmsSession(_sessionId: string | undefined) {
  return useQuery({
    queryKey: ["lms-session-deprecated"],
    queryFn: async () => null as LmsSession | null,
    enabled: false,
  });
}

/**
 * @deprecated LMS v1 session mutations are no longer available
 */
export function useLmsSessionMutations() {
  return {
    createSession: { mutate: () => {}, mutateAsync: async () => ({} as LmsSession), isPending: false },
    updateSession: { mutate: () => {}, mutateAsync: async () => ({} as LmsSession), isPending: false },
    deleteSession: { mutate: () => {}, mutateAsync: async () => "", isPending: false },
  };
}
