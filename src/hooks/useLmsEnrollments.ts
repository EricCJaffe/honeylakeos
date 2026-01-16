import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { useCompanyModules } from "./useCompanyModules";
import { toast } from "sonner";

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
  external_contacts?: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    organization_name: string | null;
  };
  lms_cohorts?: {
    id: string;
    name: string;
    course_id: string;
    lms_courses?: {
      id: string;
      title: string;
    };
  };
}

export interface CreateEnrollmentInput {
  cohort_id: string;
  external_contact_id: string;
  status?: EnrollmentStatus;
  notes?: string;
}

export interface UpdateEnrollmentInput {
  status?: EnrollmentStatus;
  notes?: string | null;
  completed_at?: string | null;
}

export interface EnrollmentFilters {
  cohortId?: string;
  status?: EnrollmentStatus | "all";
  search?: string;
}

export function useLmsEnrollments(filters: EnrollmentFilters = {}) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  return useQuery({
    queryKey: ["enrollments", activeCompanyId, filters],
    queryFn: async () => {
      if (!activeCompanyId || !lmsEnabled) return [];

      let query = supabase
        .from("lms_enrollments")
        .select(`
          *,
          external_contacts(id, full_name, email, phone, organization_name),
          lms_cohorts(id, name, course_id, lms_courses(id, title))
        `)
        .eq("company_id", activeCompanyId)
        .order("enrolled_at", { ascending: false });

      if (filters.cohortId) {
        query = query.eq("cohort_id", filters.cohortId);
      }

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Apply search filter client-side for nested data
      let results = data as LmsEnrollment[];
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter(
          (e) =>
            e.external_contacts?.full_name?.toLowerCase().includes(searchLower) ||
            e.external_contacts?.email?.toLowerCase().includes(searchLower) ||
            e.external_contacts?.organization_name?.toLowerCase().includes(searchLower)
        );
      }

      return results;
    },
    enabled: !!activeCompanyId && lmsEnabled,
  });
}

export function useLmsEnrollmentsByCohort(cohortId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  return useQuery({
    queryKey: ["enrollments", "cohort", cohortId],
    queryFn: async () => {
      if (!cohortId || !activeCompanyId || !lmsEnabled) return [];

      const { data, error } = await supabase
        .from("lms_enrollments")
        .select(`
          *,
          external_contacts(id, full_name, email, phone, organization_name)
        `)
        .eq("cohort_id", cohortId)
        .eq("company_id", activeCompanyId)
        .order("enrolled_at", { ascending: false });

      if (error) throw error;
      return data as LmsEnrollment[];
    },
    enabled: !!cohortId && !!activeCompanyId && lmsEnabled,
  });
}

export function useLmsEnrollmentMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { logEvent } = useAuditLog();

  const enrollParticipant = useMutation({
    mutationFn: async (input: CreateEnrollmentInput) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("lms_enrollments")
        .insert({
          company_id: activeCompanyId,
          cohort_id: input.cohort_id,
          external_contact_id: input.external_contact_id,
          status: input.status || "enrolled",
          notes: input.notes || null,
          created_by: userData.user?.id || null,
        })
        .select(`
          *,
          external_contacts(id, full_name, email)
        `)
        .single();

      if (error) throw error;
      return data as LmsEnrollment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      logEvent({
        action: "lms.participant_enrolled",
        entityType: "lms_enrollment",
        entityId: data.id,
        metadata: {
          cohortId: data.cohort_id,
          contactId: data.external_contact_id,
          contactName: data.external_contacts?.full_name,
        },
      });
      toast.success("Participant enrolled successfully");
    },
    onError: (error) => {
      if (error.message.includes("duplicate")) {
        toast.error("This participant is already enrolled in this cohort");
      } else {
        toast.error(`Failed to enroll participant: ${error.message}`);
      }
    },
  });

  const updateEnrollment = useMutation({
    mutationFn: async ({ id, ...input }: UpdateEnrollmentInput & { id: string }) => {
      const updateData: Record<string, unknown> = { ...input };

      // Auto-set completed_at when status changes to completed
      if (input.status === "completed" && !input.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("lms_enrollments")
        .update(updateData)
        .eq("id", id)
        .select(`
          *,
          external_contacts(id, full_name, email)
        `)
        .single();

      if (error) throw error;
      return data as LmsEnrollment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      logEvent({
        action: "lms.enrollment_updated",
        entityType: "lms_enrollment",
        entityId: data.id,
        metadata: {
          status: data.status,
          contactName: data.external_contacts?.full_name,
        },
      });
      toast.success("Enrollment updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update enrollment: ${error.message}`);
    },
  });

  const unenrollParticipant = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from("lms_enrollments")
        .delete()
        .eq("id", enrollmentId);

      if (error) throw error;
      return enrollmentId;
    },
    onSuccess: (enrollmentId) => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      logEvent({
        action: "lms.participant_unenrolled",
        entityType: "lms_enrollment",
        entityId: enrollmentId,
        metadata: {},
      });
      toast.success("Participant removed from cohort");
    },
    onError: (error) => {
      toast.error(`Failed to remove participant: ${error.message}`);
    },
  });

  return {
    enrollParticipant,
    updateEnrollment,
    unenrollParticipant,
  };
}

export function getEnrollmentStatusLabel(status: EnrollmentStatus): string {
  switch (status) {
    case "enrolled":
      return "Enrolled";
    case "completed":
      return "Completed";
    case "dropped":
      return "Dropped";
    case "waitlisted":
      return "Waitlisted";
    default:
      return status;
  }
}

export function getEnrollmentStatusColor(status: EnrollmentStatus): string {
  switch (status) {
    case "enrolled":
      return "bg-primary/10 text-primary";
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "dropped":
      return "bg-destructive/10 text-destructive";
    case "waitlisted":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    default:
      return "bg-muted";
  }
}
