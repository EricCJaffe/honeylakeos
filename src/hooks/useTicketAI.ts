import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useToast } from "@/hooks/use-toast";

export interface TriageResult {
  classification: string;
  severity: "low" | "medium" | "high" | "critical";
  affected_areas: string[];
  root_cause_hypothesis: string;
  suggested_fix: string;
  remediation_prompt: string;
  investigation_steps: string[];
  confidence: number;
  estimated_complexity: "trivial" | "small" | "medium" | "large";
}

export interface RemediationResult {
  changes: Array<{ path: string; summary: string }>;
  commit_message: string;
  summary: string;
  pr_url?: string;
  branch?: string;
  error?: string;
}

export function useTriggerTriage(ticketId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  return useMutation({
    mutationFn: async (ticket: { subject: string; description: string | null; category: string | null; priority: string }) => {
      if (!user) throw new Error("Not authenticated");
      if (!activeCompanyId) throw new Error("No active company");

      // Mark as analyzing
      await supabase
        .from("support_tickets")
        .update({ ai_triage_status: "analyzing" })
        .eq("id", ticketId);

      // Call ai-gateway for triage
      const { data, error } = await supabase.functions.invoke("ai-gateway", {
        body: {
          companyId: activeCompanyId,
          taskType: "support_triage",
          userPrompt: `Ticket Subject: ${ticket.subject}\n\nCategory: ${ticket.category || "other"}\nPriority: ${ticket.priority}\n\nDescription:\n${ticket.description || "No description provided"}`,
          context: {
            ticket_id: ticketId,
            category: ticket.category,
            priority: ticket.priority,
          },
        },
      });

      if (error) throw error;

      if (data?.outputJson) {
        // Save triage result
        await supabase
          .from("support_tickets")
          .update({
            ai_triage: data.outputJson,
            ai_triage_status: "complete",
          })
          .eq("id", ticketId);

        // Log event (fire-and-forget)
        supabase.from("support_ticket_events").insert({
          ticket_id: ticketId,
          event_type: "ai_triage_complete",
          created_by: user.id,
          payload: {
            classification: data.outputJson.classification,
            severity: data.outputJson.severity,
            confidence: data.outputJson.confidence,
          },
        }).then(({ error: e }) => { if (e) console.error("Event insert error:", e); });

        return data.outputJson as TriageResult;
      }

      // AI gateway returned but without valid output
      const errorMsg = data?.error || "AI triage returned no result";
      await supabase
        .from("support_tickets")
        .update({ ai_triage_status: "failed" })
        .eq("id", ticketId);
      throw new Error(errorMsg);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      toast({ title: "AI Triage complete" });
    },
    onError: async (error) => {
      // Mark as failed
      await supabase
        .from("support_tickets")
        .update({ ai_triage_status: "failed" })
        .eq("id", ticketId);
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      toast({
        title: "AI Triage failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });
}

export function useApproveRemediation(ticketId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      // Mark as generating, record approver
      await supabase
        .from("support_tickets")
        .update({
          remediation_status: "generating",
          remediation_approved_by: user.id,
          remediation_approved_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      // Log approval event
      supabase.from("support_ticket_events").insert({
        ticket_id: ticketId,
        event_type: "remediation_approved",
        created_by: user.id,
        payload: {},
      }).then(({ error: e }) => { if (e) console.error("Event insert error:", e); });

      // Call remediation edge function
      const { data, error } = await supabase.functions.invoke("support-ticket-remediate", {
        body: { ticketId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      toast({ title: "Fix generated — PR created" });
    },
    onError: async (error) => {
      await supabase
        .from("support_tickets")
        .update({
          remediation_status: "failed",
          remediation_result: { error: error instanceof Error ? error.message : "Unknown error" },
        })
        .eq("id", ticketId);
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      toast({
        title: "Remediation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });
}
