import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { toast } from "sonner";
import { logAuditEvent } from "./useAuditLog";

export type OnboardingStep = 
  | "select_framework"
  | "core_setup"
  | "activate_components"
  | "coach_recommendations"
  | "final_review";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  "select_framework",
  "core_setup",
  "activate_components",
  "coach_recommendations",
  "final_review",
];

export const STEP_LABELS: Record<OnboardingStep, string> = {
  select_framework: "Select Framework",
  core_setup: "Core Setup",
  activate_components: "Activate Components",
  coach_recommendations: "Coach Recommendations",
  final_review: "Review & Launch",
};

export interface OnboardingState {
  company_id: string;
  framework_id: string | null;
  current_step: OnboardingStep;
  completed_steps: OnboardingStep[];
  coach_engagement_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useOnboardingState() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["onboarding-state", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return null;

      const { data, error } = await supabase
        .from("company_onboarding_state")
        .select("*")
        .eq("company_id", activeCompanyId)
        .maybeSingle();

      if (error) throw error;
      return data as OnboardingState | null;
    },
    enabled: !!activeCompanyId,
  });
}

export function useOnboardingMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const initializeOnboarding = useMutation({
    mutationFn: async (coachEngagementId?: string) => {
      if (!activeCompanyId) throw new Error("No company selected");

      const { data, error } = await supabase
        .from("company_onboarding_state")
        .upsert({
          company_id: activeCompanyId,
          current_step: "select_framework",
          completed_steps: [],
          coach_engagement_id: coachEngagementId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as OnboardingState;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-state", activeCompanyId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to initialize onboarding: ${error.message}`);
    },
  });

  const updateStep = useMutation({
    mutationFn: async ({
      currentStep,
      completedStep,
      frameworkId,
    }: {
      currentStep: OnboardingStep;
      completedStep?: OnboardingStep;
      frameworkId?: string;
    }) => {
      if (!activeCompanyId) throw new Error("No company selected");

      // First get current state
      const { data: existing } = await supabase
        .from("company_onboarding_state")
        .select("completed_steps")
        .eq("company_id", activeCompanyId)
        .single();

      const currentCompleted = (existing?.completed_steps as OnboardingStep[]) || [];
      const newCompleted = completedStep && !currentCompleted.includes(completedStep)
        ? [...currentCompleted, completedStep]
        : currentCompleted;

      const updates: Record<string, unknown> = {
        current_step: currentStep,
        completed_steps: newCompleted,
      };

      if (frameworkId !== undefined) {
        updates.framework_id = frameworkId;
      }

      const { data, error } = await supabase
        .from("company_onboarding_state")
        .update(updates)
        .eq("company_id", activeCompanyId)
        .select()
        .single();

      if (error) throw error;
      return data as OnboardingState;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-state", activeCompanyId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update onboarding: ${error.message}`);
    },
  });

  const completeOnboarding = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId) throw new Error("No company selected");

      const { data, error } = await supabase
        .from("company_onboarding_state")
        .update({
          current_step: "final_review",
          completed_at: new Date().toISOString(),
        })
        .eq("company_id", activeCompanyId)
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await logAuditEvent({
        companyId: activeCompanyId,
        action: "onboarding.completed",
        entityType: "company",
        entityId: activeCompanyId,
        metadata: {
          framework_id: data.framework_id,
          completed_steps: data.completed_steps,
        },
      });

      return data as OnboardingState;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-state", activeCompanyId] });
      toast.success("Onboarding completed!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete onboarding: ${error.message}`);
    },
  });

  const skipOnboarding = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId) throw new Error("No company selected");

      const { data, error } = await supabase
        .from("company_onboarding_state")
        .update({
          completed_at: new Date().toISOString(),
        })
        .eq("company_id", activeCompanyId)
        .select()
        .single();

      if (error) throw error;
      return data as OnboardingState;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-state", activeCompanyId] });
      toast.success("Onboarding skipped. You can resume later from Settings.");
    },
    onError: (error: Error) => {
      toast.error(`Failed to skip onboarding: ${error.message}`);
    },
  });

  return {
    initializeOnboarding,
    updateStep,
    completeOnboarding,
    skipOnboarding,
  };
}

