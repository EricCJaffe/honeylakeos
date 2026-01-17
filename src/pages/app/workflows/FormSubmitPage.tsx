import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { useWfForm, useWfFormFields, useWfSubmissionMutations } from "@/hooks/useWorkflowForms";
import type { WfFormField, WfFieldType } from "@/hooks/useWorkflowForms";

export default function FormSubmitPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const { data: form, isLoading: formLoading } = useWfForm(formId);
  const { data: fields, isLoading: fieldsLoading } = useWfFormFields(formId);
  const { submitForm } = useWfSubmissionMutations();

  const [values, setValues] = useState<Record<string, string | number | string[] | boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  if (formLoading || fieldsLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!form || form.status !== "published") {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Form not found or not published</p>
        <Button variant="link" onClick={() => navigate("/app/workflows")}>
          Back to Workflows
        </Button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!fields) return;

    // Validate required fields
    const missingRequired = fields.filter(
      (f) => f.is_required && !values[f.id]
    );

    if (missingRequired.length > 0) {
      alert(`Please fill in required fields: ${missingRequired.map((f) => f.label).join(", ")}`);
      return;
    }

    const formattedValues = fields.map((field) => {
      const val = values[field.id];
      let convertedValue: string | number | Date | object | null = null;
      if (typeof val === "boolean") {
        convertedValue = val ? "yes" : "no";
      } else if (Array.isArray(val)) {
        convertedValue = { items: val };
      } else if (val !== undefined) {
        convertedValue = val;
      }
      return { fieldId: field.id, value: convertedValue };
    });

    await submitForm.mutateAsync({
      formId: form.id,
      values: formattedValues,
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Form Submitted</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for your submission.
            </p>
            <Button onClick={() => navigate("/app/workflows")}>
              Back to Workflows
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderField = (field: WfFormField) => {
    const value = values[field.id];
    const options = field.options as string[] | null;

    switch (field.field_type as WfFieldType) {
      case "short_text":
      case "email":
      case "phone":
        return (
          <Input
            type={field.field_type === "email" ? "email" : field.field_type === "phone" ? "tel" : "text"}
            value={(value as string) ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
            placeholder={field.help_text ?? undefined}
          />
        );

      case "long_text":
        return (
          <Textarea
            value={(value as string) ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
            placeholder={field.help_text ?? undefined}
            rows={4}
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                [field.id]: e.target.value ? parseFloat(e.target.value) : "",
              }))
            }
            placeholder={field.help_text ?? undefined}
          />
        );

      case "date":
        return (
          <Input
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
          />
        );

      case "dropdown":
        return (
          <Select
            value={(value as string) ?? ""}
            onValueChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multi_select":
        const selectedOptions = (value as string[]) ?? [];
        return (
          <div className="space-y-2">
            {options?.map((option) => (
              <div key={option} className="flex items-center gap-2">
                <Checkbox
                  id={`${field.id}-${option}`}
                  checked={selectedOptions.includes(option)}
                  onCheckedChange={(checked) => {
                    const newSelected = checked
                      ? [...selectedOptions, option]
                      : selectedOptions.filter((o) => o !== option);
                    setValues((prev) => ({ ...prev, [field.id]: newSelected }));
                  }}
                />
                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={field.id}
              checked={(value as boolean) ?? false}
              onCheckedChange={(checked) =>
                setValues((prev) => ({ ...prev, [field.id]: !!checked }))
              }
            />
            <Label htmlFor={field.id}>{field.help_text || "Yes"}</Label>
          </div>
        );

      case "yes_no":
        return (
          <RadioGroup
            value={(value as string) ?? ""}
            onValueChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id={`${field.id}-yes`} />
                <Label htmlFor={`${field.id}-yes`}>Yes</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id={`${field.id}-no`} />
                <Label htmlFor={`${field.id}-no`}>No</Label>
              </div>
            </div>
          </RadioGroup>
        );

      case "rating":
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Button
                key={n}
                type="button"
                variant={(value as number) === n ? "default" : "outline"}
                size="sm"
                onClick={() => setValues((prev) => ({ ...prev, [field.id]: n }))}
              >
                {n}
              </Button>
            ))}
          </div>
        );

      default:
        return <Input />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader title={form.title} description={form.description || undefined} />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {fields?.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id}>
                {field.label}
                {field.is_required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {renderField(field)}
              {field.help_text && field.field_type !== "checkbox" && (
                <p className="text-sm text-muted-foreground">{field.help_text}</p>
              )}
            </div>
          ))}

          <div className="pt-4">
            <Button
              onClick={handleSubmit}
              disabled={submitForm.isPending}
              className="w-full"
            >
              {submitForm.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Form"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
