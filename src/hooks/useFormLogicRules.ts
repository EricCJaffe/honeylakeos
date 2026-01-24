import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LogicRule {
  id: string;
  form_id: string;
  source_field_id: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty";
  value: unknown;
  action: "skip_to" | "hide_block" | "end_form";
  target_field_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLogicRuleInput {
  form_id: string;
  source_field_id: string;
  operator: LogicRule["operator"];
  value?: unknown;
  action: LogicRule["action"];
  target_field_id?: string | null;
}

export interface UpdateLogicRuleInput {
  id: string;
  operator?: LogicRule["operator"];
  value?: unknown;
  action?: LogicRule["action"];
  target_field_id?: string | null;
}

const QUERY_KEY = "form-logic-rules";

export function useFormLogicRules(formId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, formId],
    queryFn: async () => {
      if (!formId) return [];

      // Cast to any to work around type generation
      const { data, error } = await (supabase as any)
        .from("wf_form_logic_rules")
        .select("*")
        .eq("form_id", formId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data as LogicRule[]) ?? [];
    },
    enabled: !!formId,
  });
}

export function useLogicRuleMutations(formId: string) {
  const queryClient = useQueryClient();

  const createRule = useMutation({
    mutationFn: async (input: CreateLogicRuleInput) => {
      // Get current max sort_order
      const { data: existing } = await (supabase as any)
        .from("wf_form_logic_rules")
        .select("sort_order")
        .eq("form_id", formId)
        .order("sort_order", { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

      const { data, error } = await (supabase as any)
        .from("wf_form_logic_rules")
        .insert({
          ...input,
          sort_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LogicRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, formId] });
      toast.success("Logic rule created");
    },
    onError: (error: Error) => {
      toast.error("Failed to create logic rule: " + error.message);
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateLogicRuleInput) => {
      const { data, error } = await (supabase as any)
        .from("wf_form_logic_rules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as LogicRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, formId] });
      toast.success("Logic rule updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update logic rule: " + error.message);
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await (supabase as any)
        .from("wf_form_logic_rules")
        .delete()
        .eq("id", ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, formId] });
      toast.success("Logic rule deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete logic rule: " + error.message);
    },
  });

  return {
    createRule,
    updateRule,
    deleteRule,
  };
}