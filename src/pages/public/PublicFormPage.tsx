import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TypeformRunner, FormSettings, LogicRule } from "@/components/forms/TypeformRunner";
import type { WfFormField } from "@/hooks/useWorkflowForms";

export default function PublicFormPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  
  // Optional entity linking from URL params
  const linkedEntityType = searchParams.get("entityType") ?? undefined;
  const linkedEntityId = searchParams.get("entityId") ?? undefined;

  // Fetch form by public token - use any to work around missing column types
  const { data: form, isLoading: formLoading, error: formError } = useQuery({
    queryKey: ["public-form", token],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");

      const { data, error } = await (supabase as any)
        .from("wf_forms")
        .select("*")
        .eq("public_token", token)
        .eq("status", "published")
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  // Fetch form fields
  const { data: fields, isLoading: fieldsLoading } = useQuery({
    queryKey: ["public-form-fields", form?.id],
    queryFn: async () => {
      if (!form?.id) return [];

      const { data, error } = await supabase
        .from("wf_form_fields")
        .select("*")
        .eq("form_id", form.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as WfFormField[];
    },
    enabled: !!form?.id,
  });

  // Fetch logic rules
  const { data: logicRules } = useQuery({
    queryKey: ["public-form-logic-rules", form?.id],
    queryFn: async () => {
      if (!form?.id) return [];

      // Cast to any for table not in types yet
      const { data, error } = await (supabase as any)
        .from("wf_form_logic_rules")
        .select("*")
        .eq("form_id", form.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as LogicRule[];
    },
    enabled: !!form?.id,
  });

  // Handle form submission
  const handleSubmit = async (values: Record<string, unknown>) => {
    if (!form?.id || !fields) throw new Error("Form not loaded");

    // Create submission
    const { data: submission, error: submissionError } = await supabase
      .from("wf_form_submissions")
      .insert({
        form_id: form.id,
        submitter_user_id: null, // Public submission
        company_context_id: form.company_id,
        status: "submitted",
        linked_entity_type: linkedEntityType ?? null,
        linked_entity_id: linkedEntityId ?? null,
      } as any)
      .select()
      .single();

    if (submissionError) throw submissionError;

    // Create submission values
    const submissionValues = fields
      .filter((field) => values[field.id] !== undefined)
      .map((field) => {
        const val = values[field.id];
        let processedValue: string | number | object | null = null;

        if (typeof val === "boolean") {
          processedValue = val ? "yes" : "no";
        } else if (Array.isArray(val)) {
          processedValue = { items: val };
        } else if (val !== undefined && val !== null) {
          processedValue = val as string | number;
        }

        return {
          submission_id: submission.id,
          field_id: field.id,
          value: processedValue,
        };
      });

    if (submissionValues.length > 0) {
      const { error: valuesError } = await supabase
        .from("wf_form_submission_values")
        .insert(submissionValues);

      if (valuesError) throw valuesError;
    }
  };

  // Loading state
  if (formLoading || fieldsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error or not found
  if (formError || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Form Not Found</h1>
          <p className="text-muted-foreground">
            This form doesn't exist, has been unpublished, or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  const settings = ((form as any).settings as FormSettings) ?? {};

  return (
    <TypeformRunner
      formTitle={form.title}
      formDescription={form.description}
      fields={fields ?? []}
      settings={settings}
      logicRules={logicRules?.map((r) => ({
        id: r.id,
        source_field_id: r.source_field_id,
        operator: r.operator,
        value: r.value,
        action: r.action,
        target_field_id: r.target_field_id,
      })) ?? []}
      onSubmit={handleSubmit}
      linkedEntityType={linkedEntityType}
      linkedEntityId={linkedEntityId}
    />
  );
}