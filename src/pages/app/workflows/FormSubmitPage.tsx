import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypeformRunner, FormSettings } from "@/components/forms/TypeformRunner";
import { useWfForm, useWfFormFields, useWfSubmissionMutations } from "@/hooks/useWorkflowForms";
import { useFormLogicRules, LogicRule } from "@/hooks/useFormLogicRules";

export default function FormSubmitPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Optional entity linking from URL params
  const linkedEntityType = searchParams.get("entityType") ?? undefined;
  const linkedEntityId = searchParams.get("entityId") ?? undefined;
  
  const { data: form, isLoading: formLoading } = useWfForm(formId);
  const { data: fields, isLoading: fieldsLoading } = useWfFormFields(formId);
  const { data: logicRules, isLoading: rulesLoading } = useFormLogicRules(formId);
  const { submitForm } = useWfSubmissionMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (formLoading || fieldsLoading || rulesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!form || form.status !== "published") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Form Not Available</h1>
          <p className="text-muted-foreground mb-6">
            This form is not published or doesn't exist.
          </p>
          <Button onClick={() => navigate("/app/workflows")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workflows
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (!fields) throw new Error("Form not loaded");
    
    setIsSubmitting(true);
    try {
      const formattedValues = fields
        .filter((field) => values[field.id] !== undefined)
        .map((field) => {
          const val = values[field.id];
          let convertedValue: string | number | object | null = null;
          
          if (typeof val === "boolean") {
            convertedValue = val ? "yes" : "no";
          } else if (Array.isArray(val)) {
            convertedValue = { items: val };
          } else if (val !== undefined && val !== null) {
            convertedValue = val as string | number;
          }
          
          return { fieldId: field.id, value: convertedValue };
        });

      await submitForm.mutateAsync({
        formId: form.id,
        values: formattedValues,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const settings = ((form as any).settings as FormSettings) ?? {};
  
  // Map logic rules to the format expected by TypeformRunner
  const mappedRules = (logicRules ?? []).map((r: LogicRule) => ({
    id: r.id,
    source_field_id: r.source_field_id,
    operator: r.operator,
    value: r.value,
    action: r.action,
    target_field_id: r.target_field_id,
  }));

  return (
    <TypeformRunner
      formTitle={form.title}
      formDescription={form.description}
      fields={fields ?? []}
      settings={settings}
      logicRules={mappedRules}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      linkedEntityType={linkedEntityType}
      linkedEntityId={linkedEntityId}
    />
  );
}