import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";

type AiTaskType = "workflow_copilot" | "template_copilot" | "insight_summary";

export interface AiReadiness {
  available: boolean;
  reason: string;
  dailyBudget: number | null;
  dailyUsed: number | null;
  monthlyBudget: number | null;
  monthlyUsed: number | null;
}

type AiGatewayReadiness = {
  available?: boolean;
  reason?: string;
  dailyBudget?: number;
  dailyUsed?: number;
  monthlyBudget?: number;
  monthlyUsed?: number;
};

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function useAiReadiness(taskType: AiTaskType, enabled = true) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["ai-readiness", activeCompanyId, taskType],
    enabled: enabled && !!activeCompanyId,
    staleTime: 30_000,
    queryFn: async (): Promise<AiReadiness> => {
      if (!activeCompanyId) {
        return {
          available: false,
          reason: "No active company selected",
          dailyBudget: null,
          dailyUsed: null,
          monthlyBudget: null,
          monthlyUsed: null,
        };
      }

      const { data, error } = await supabase.functions.invoke("ai-gateway", {
        body: {
          companyId: activeCompanyId,
          taskType,
          userPrompt: "status check",
          checkOnly: true,
        },
      });

      const payload = data as { readiness?: AiGatewayReadiness; error?: string } | null;

      if (error) {
        const message = toMessage(error).toLowerCase();
        if (message.includes("not found") || message.includes("does not exist")) {
          return {
            available: false,
            reason: "AI backend deployment not complete",
            dailyBudget: null,
            dailyUsed: null,
            monthlyBudget: null,
            monthlyUsed: null,
          };
        }

        return {
          available: false,
          reason: payload?.readiness?.reason || payload?.error || toMessage(error),
          dailyBudget: payload?.readiness?.dailyBudget ?? null,
          dailyUsed: payload?.readiness?.dailyUsed ?? null,
          monthlyBudget: payload?.readiness?.monthlyBudget ?? null,
          monthlyUsed: payload?.readiness?.monthlyUsed ?? null,
        };
      }

      if (!payload?.readiness) {
        return {
          available: false,
          reason: "Unable to determine AI readiness",
          dailyBudget: null,
          dailyUsed: null,
          monthlyBudget: null,
          monthlyUsed: null,
        };
      }

      return {
        available: payload.readiness.available === true,
        reason: payload.readiness.reason || (payload.readiness.available ? "AI is ready" : "AI is blocked"),
        dailyBudget: payload.readiness.dailyBudget ?? null,
        dailyUsed: payload.readiness.dailyUsed ?? null,
        monthlyBudget: payload.readiness.monthlyBudget ?? null,
        monthlyUsed: payload.readiness.monthlyUsed ?? null,
      };
    },
  });
}
