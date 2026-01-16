import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { useCompanyModules } from "./useCompanyModules";
import { toast } from "sonner";

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
  settings: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lms_courses?: {
    id: string;
    title: string;
  };
}

export interface CreateCohortInput {
  course_id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: CohortStatus;
}

export interface UpdateCohortInput {
  name?: string;
  description?: string;
  start_date?: string | null;
  end_date?: string | null;
  status?: CohortStatus;
  linked_project_id?: string | null;
  settings?: Record<string, unknown>;
}

export interface CohortFilters {
  courseId?: string;
  status?: CohortStatus | "all";
  search?: string;
}

export function useLmsCohorts(filters: CohortFilters = {}) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  return useQuery({
    queryKey: ["cohorts", activeCompanyId, filters],
    queryFn: async () => {
      if (!activeCompanyId || !lmsEnabled) return [];

      let query = supabase
        .from("lms_cohorts")
        .select("*, lms_courses(id, title)")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (filters.courseId) {
        query = query.eq("course_id", filters.courseId);
      }

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LmsCohort[];
    },
    enabled: !!activeCompanyId && lmsEnabled,
  });
}

export function useLmsCohort(cohortId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  return useQuery({
    queryKey: ["cohort", cohortId],
    queryFn: async () => {
      if (!cohortId || !activeCompanyId || !lmsEnabled) return null;

      const { data, error } = await supabase
        .from("lms_cohorts")
        .select("*, lms_courses(id, title)")
        .eq("id", cohortId)
        .eq("company_id", activeCompanyId)
        .maybeSingle();

      if (error) throw error;
      return data as LmsCohort | null;
    },
    enabled: !!cohortId && !!activeCompanyId && lmsEnabled,
  });
}

export function useLmsCohortMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { logEvent } = useAuditLog();

  const createCohort = useMutation({
    mutationFn: async (input: CreateCohortInput) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("lms_cohorts")
        .insert({
          company_id: activeCompanyId,
          course_id: input.course_id,
          name: input.name,
          description: input.description || null,
          start_date: input.start_date || null,
          end_date: input.end_date || null,
          status: input.status || "planned",
          created_by: userData.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LmsCohort;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
      logEvent({
        action: "lms.cohort_created",
        entityType: "lms_cohort",
        entityId: data.id,
        metadata: { name: data.name, courseId: data.course_id },
      });
      toast.success("Cohort created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create cohort: ${error.message}`);
    },
  });

  const updateCohort = useMutation({
    mutationFn: async ({ id, ...input }: UpdateCohortInput & { id: string }) => {
      const { data, error } = await supabase
        .from("lms_cohorts")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as LmsCohort;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
      queryClient.invalidateQueries({ queryKey: ["cohort", data.id] });
      logEvent({
        action: "lms.cohort_updated",
        entityType: "lms_cohort",
        entityId: data.id,
        metadata: { name: data.name },
      });
      toast.success("Cohort updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update cohort: ${error.message}`);
    },
  });

  const updateCohortStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CohortStatus }) => {
      const { data, error } = await supabase
        .from("lms_cohorts")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as LmsCohort;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
      queryClient.invalidateQueries({ queryKey: ["cohort", data.id] });
      logEvent({
        action: "lms.cohort_status_changed",
        entityType: "lms_cohort",
        entityId: data.id,
        metadata: { name: data.name, status: data.status },
      });
      toast.success(`Cohort status updated to ${data.status}`);
    },
    onError: (error) => {
      toast.error(`Failed to update cohort status: ${error.message}`);
    },
  });

  const deleteCohort = useMutation({
    mutationFn: async (cohortId: string) => {
      const { error } = await supabase
        .from("lms_cohorts")
        .delete()
        .eq("id", cohortId);

      if (error) throw error;
      return cohortId;
    },
    onSuccess: (cohortId) => {
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
      logEvent({
        action: "lms.cohort_deleted",
        entityType: "lms_cohort",
        entityId: cohortId,
        metadata: {},
      });
      toast.success("Cohort deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete cohort: ${error.message}`);
    },
  });

  return {
    createCohort,
    updateCohort,
    updateCohortStatus,
    deleteCohort,
  };
}

export function getCohortStatusLabel(status: CohortStatus): string {
  switch (status) {
    case "planned":
      return "Planned";
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

export function getCohortStatusColor(status: CohortStatus): string {
  switch (status) {
    case "planned":
      return "bg-muted text-muted-foreground";
    case "active":
      return "bg-primary/10 text-primary";
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "archived":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted";
  }
}
