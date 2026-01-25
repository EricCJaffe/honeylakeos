import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import type { ProcedureStep, SOP, UpdateSOPInput } from "./useSOPs";

export type ReviewAction = "mark_unchanged" | "publish_update";

export interface CompleteReviewInput {
  sopId: string;
  action: ReviewAction;
  notes?: string;
  nextReviewDate?: string;
  updates?: UpdateSOPInput;
}

export function useSOPReview() {
  const queryClient = useQueryClient();

  const completeReview = useMutation({
    mutationFn: async ({ sopId, action, notes, nextReviewDate, updates }: CompleteReviewInput) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Get current SOP
      const { data: currentSOP, error: fetchError } = await supabase
        .from("sops")
        .select("*")
        .eq("id", sopId)
        .single();

      if (fetchError || !currentSOP) {
        throw new Error("SOP not found");
      }

      const now = new Date().toISOString();
      let newVersion = currentSOP.current_version;
      let changeSummary = "";

      if (action === "mark_unchanged") {
        // Just update review dates, no version change
        changeSummary = notes || "Reviewed - no changes required";
        
        const { error: updateError } = await supabase
          .from("sops")
          .update({
            last_reviewed_at: now,
            next_review_at: nextReviewDate || null,
            status: "active",
            review_reminder_sent_at: null,
            overdue_reminder_sent_at: null,
          })
          .eq("id", sopId);

        if (updateError) throw updateError;

        // Log review in revision history with same version
        await supabase.from("sop_revisions").insert({
          sop_id: sopId,
          version: currentSOP.current_version,
          title: currentSOP.title,
          purpose: currentSOP.purpose,
          scope: currentSOP.scope,
          owner_role: currentSOP.owner_role,
          tools_systems: currentSOP.tools_systems,
          procedure_steps: currentSOP.procedure_steps,
          exceptions_notes: currentSOP.exceptions_notes,
          related_sop_ids: currentSOP.related_sop_ids,
          change_summary: changeSummary,
          review_action: "mark_unchanged",
          revised_by: user.user.id,
        });

      } else if (action === "publish_update") {
        // Create new version with updates
        newVersion = currentSOP.current_version + 1;
        changeSummary = notes || "Updated during review";

        const updatePayload: Record<string, unknown> = {
          ...updates,
          current_version: newVersion,
          last_reviewed_at: now,
          next_review_at: nextReviewDate || null,
          status: "active",
          review_reminder_sent_at: null,
          overdue_reminder_sent_at: null,
        };

        if (updates?.procedure_steps) {
          updatePayload.procedure_steps = updates.procedure_steps as unknown as Json;
        }

        const { data: updatedSOP, error: updateError } = await supabase
          .from("sops")
          .update(updatePayload)
          .eq("id", sopId)
          .select()
          .single();

        if (updateError) throw updateError;

        // Create revision record for the new version
        await supabase.from("sop_revisions").insert({
          sop_id: sopId,
          version: newVersion,
          title: updatedSOP.title,
          purpose: updatedSOP.purpose,
          scope: updatedSOP.scope,
          owner_role: updatedSOP.owner_role,
          tools_systems: updatedSOP.tools_systems,
          procedure_steps: updatedSOP.procedure_steps,
          exceptions_notes: updatedSOP.exceptions_notes,
          related_sop_ids: updatedSOP.related_sop_ids,
          change_summary: changeSummary,
          review_action: "publish_update",
          revised_by: user.user.id,
        });
      }

      return { sopId, action, newVersion };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sops"] });
      queryClient.invalidateQueries({ queryKey: ["sop", result.sopId] });
      queryClient.invalidateQueries({ queryKey: ["sop-revisions", result.sopId] });
      
      if (result.action === "mark_unchanged") {
        toast.success("Review completed - SOP marked as unchanged");
      } else {
        toast.success(`Review completed - Published version ${result.newVersion}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete review: ${error.message}`);
    },
  });

  return { completeReview };
}