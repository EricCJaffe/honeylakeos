import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { useCompanyModules } from "./useCompanyModules";
import { toast } from "sonner";

export interface LmsCohortCoach {
  id: string;
  company_id: string;
  cohort_id: string;
  coach_profile_id: string | null;
  external_contact_id: string | null;
  role: string;
  created_by: string | null;
  created_at: string;
  coach_profiles?: {
    id: string;
    profile_type: string;
    external_contacts: {
      id: string;
      full_name: string;
      email: string | null;
    };
  } | null;
  external_contacts?: {
    id: string;
    full_name: string;
    email: string | null;
  } | null;
}

export interface AssignCoachInput {
  cohort_id: string;
  coach_profile_id?: string;
  external_contact_id?: string;
  role?: string;
}

export function useLmsCohortCoaches(cohortId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();
  const { isEnabled } = useCompanyModules();
  const lmsEnabled = isEnabled("lms");

  return useQuery({
    queryKey: ["cohort-coaches", cohortId],
    queryFn: async () => {
      if (!cohortId || !activeCompanyId || !lmsEnabled) return [];

      const { data, error } = await supabase
        .from("lms_cohort_coaches")
        .select(`
          *,
          coach_profiles(id, profile_type, external_contacts(id, full_name, email)),
          external_contacts(id, full_name, email)
        `)
        .eq("cohort_id", cohortId)
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as LmsCohortCoach[];
    },
    enabled: !!cohortId && !!activeCompanyId && lmsEnabled,
  });
}

export function useLmsCohortCoachMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { logEvent } = useAuditLog();

  const assignCoach = useMutation({
    mutationFn: async (input: AssignCoachInput) => {
      if (!activeCompanyId) throw new Error("No active company");
      if (!input.coach_profile_id && !input.external_contact_id) {
        throw new Error("Either coach profile or external contact is required");
      }

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("lms_cohort_coaches")
        .insert({
          company_id: activeCompanyId,
          cohort_id: input.cohort_id,
          coach_profile_id: input.coach_profile_id || null,
          external_contact_id: input.external_contact_id || null,
          role: input.role || "instructor",
          created_by: userData.user?.id || null,
        })
        .select(`
          *,
          coach_profiles(id, profile_type, external_contacts(id, full_name, email)),
          external_contacts(id, full_name, email)
        `)
        .single();

      if (error) throw error;
      return data as LmsCohortCoach;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cohort-coaches"] });
      
      const coachName = data.coach_profiles?.external_contacts?.full_name 
        || data.external_contacts?.full_name 
        || "Coach";

      logEvent({
        action: "lms.coach_assigned",
        entityType: "lms_cohort",
        entityId: data.cohort_id,
        metadata: {
          coachId: data.coach_profile_id || data.external_contact_id,
          coachName,
          role: data.role,
        },
      });
      toast.success(`${coachName} assigned to cohort`);
    },
    onError: (error) => {
      if (error.message.includes("duplicate")) {
        toast.error("This coach is already assigned to this cohort");
      } else {
        toast.error(`Failed to assign coach: ${error.message}`);
      }
    },
  });

  const updateCoachRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { data, error } = await supabase
        .from("lms_cohort_coaches")
        .update({ role })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as LmsCohortCoach;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cohort-coaches"] });
      logEvent({
        action: "lms.coach_role_updated",
        entityType: "lms_cohort",
        entityId: data.cohort_id,
        metadata: { role: data.role },
      });
      toast.success("Coach role updated");
    },
    onError: (error) => {
      toast.error(`Failed to update coach role: ${error.message}`);
    },
  });

  const removeCoach = useMutation({
    mutationFn: async (assignmentId: string) => {
      // First get the assignment to log properly
      const { data: assignment } = await supabase
        .from("lms_cohort_coaches")
        .select("cohort_id")
        .eq("id", assignmentId)
        .single();

      const { error } = await supabase
        .from("lms_cohort_coaches")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;
      return { assignmentId, cohortId: assignment?.cohort_id };
    },
    onSuccess: ({ cohortId }) => {
      queryClient.invalidateQueries({ queryKey: ["cohort-coaches"] });
      logEvent({
        action: "lms.coach_removed",
        entityType: "lms_cohort",
        entityId: cohortId || "",
        metadata: {},
      });
      toast.success("Coach removed from cohort");
    },
    onError: (error) => {
      toast.error(`Failed to remove coach: ${error.message}`);
    },
  });

  return {
    assignCoach,
    updateCoachRole,
    removeCoach,
  };
}

export function getCoachDisplayName(coach: LmsCohortCoach): string {
  return (
    coach.coach_profiles?.external_contacts?.full_name ||
    coach.external_contacts?.full_name ||
    "Unknown"
  );
}

export function getCoachEmail(coach: LmsCohortCoach): string | null {
  return (
    coach.coach_profiles?.external_contacts?.email ||
    coach.external_contacts?.email ||
    null
  );
}
