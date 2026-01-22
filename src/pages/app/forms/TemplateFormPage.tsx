import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypeformRunner, FormSettings } from "@/components/forms/TypeformRunner";
import { useFormByTemplateKey, useCreateFormFromTemplate, getFormTemplate } from "@/hooks/useFormByTemplateKey";
import { useWfSubmissionMutations } from "@/hooks/useWorkflowForms";
import type { WfFormField } from "@/hooks/useWorkflowForms";

export default function TemplateFormPage() {
  const { templateKey } = useParams<{ templateKey: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Optional coaching engagement linking
  const coachingEngagementId = searchParams.get("engagementId") ?? undefined;
  
  const { data: form, isLoading: formLoading } = useFormByTemplateKey(templateKey);
  const createForm = useCreateFormFromTemplate();
  const { submitForm } = useWfSubmissionMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const template = templateKey ? getFormTemplate(templateKey) : undefined;

  // Auto-create form from template if it doesn't exist
  useEffect(() => {
    const initForm = async () => {
      if (!formLoading && !form && template && !isInitializing) {
        setIsInitializing(true);
        try {
          await createForm.mutateAsync(templateKey!);
        } finally {
          setIsInitializing(false);
        }
      }
    };
    initForm();
  }, [formLoading, form, template, templateKey]);

  if (formLoading || isInitializing || createForm.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Preparing your form...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Template Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The form template "{templateKey}" does not exist.
          </p>
          <Button onClick={() => navigate("/app/workflows")}>
            Back to Workflows
          </Button>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (!form.fields) throw new Error("Form fields not loaded");
    
    setIsSubmitting(true);
    try {
      const fields = (form as any).fields as WfFormField[];
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
      
      // Redirect to submissions list
      navigate(`/app/forms/submissions?template=${templateKey}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const settings: FormSettings = {
    displayMode: "typeform",
    showProgress: true,
    thankYouTitle: "Goals Submitted!",
    thankYouBody: "Your annual goals have been saved successfully. You can view and edit them from the submissions page.",
  };

  return (
    <TypeformRunner
      formTitle={form.title}
      formDescription={form.description}
      fields={(form as any).fields ?? []}
      settings={settings}
      logicRules={[]}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />
  );
}