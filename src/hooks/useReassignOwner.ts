import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type EntityType = "project" | "task" | "note" | "document";

interface ReassignResult {
  success: boolean;
  error?: string;
  entity?: string;
  entity_id?: string;
  new_owner_id?: string;
  previous_owner_id?: string;
}

interface UseReassignOwnerOptions {
  onSuccess?: (result: ReassignResult) => void;
  onError?: (error: string) => void;
}

export function useReassignOwner(options?: UseReassignOwnerOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      newOwnerId,
    }: {
      entityType: EntityType;
      entityId: string;
      newOwnerId: string;
    }) => {
      const { data, error } = await supabase.rpc("reassign_owner", {
        p_entity: entityType,
        p_id: entityId,
        p_new_owner: newOwnerId,
      });

      if (error) throw error;

      const result = data as unknown as ReassignResult;
      if (!result.success) {
        throw new Error(result.error || "Failed to reassign owner");
      }

      return result;
    },
    onSuccess: (result) => {
      // Invalidate relevant queries based on entity type
      if (result.entity === "project") {
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.invalidateQueries({ queryKey: ["project", result.entity_id] });
      } else if (result.entity === "task") {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["task", result.entity_id] });
      } else if (result.entity === "note") {
        queryClient.invalidateQueries({ queryKey: ["notes"] });
        queryClient.invalidateQueries({ queryKey: ["note", result.entity_id] });
      } else if (result.entity === "document") {
        queryClient.invalidateQueries({ queryKey: ["documents"] });
        queryClient.invalidateQueries({ queryKey: ["document", result.entity_id] });
      }

      toast.success("Owner updated successfully");
      options?.onSuccess?.(result);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to change owner");
      options?.onError?.(error.message);
    },
  });
}
