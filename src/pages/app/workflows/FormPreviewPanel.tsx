import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { X } from "lucide-react";
import type { WfForm, WfFormField, WfFieldType } from "@/hooks/useWorkflowForms";

interface FormPreviewPanelProps {
  form: WfForm;
  fields: WfFormField[];
  onClose: () => void;
}

export function FormPreviewPanel({ form, fields, onClose }: FormPreviewPanelProps) {
  const renderField = (field: WfFormField) => {
    // Handle options - can be string[], { items: string[] }, or { min, max } for ratings
    const rawOptions = field.options;
    let optionsArray: string[] = [];
    
    if (Array.isArray(rawOptions)) {
      optionsArray = rawOptions.filter((opt): opt is string => typeof opt === "string");
    } else if (rawOptions && typeof rawOptions === "object" && !Array.isArray(rawOptions) && "items" in (rawOptions as object)) {
      const items = (rawOptions as { items?: unknown }).items;
      if (Array.isArray(items)) {
        optionsArray = items.filter((opt): opt is string => typeof opt === "string");
      }
    }

    // For ratings, extract min/max
    const ratingConfig = rawOptions && typeof rawOptions === "object" && "min" in rawOptions
      ? (rawOptions as { min: number; max: number })
      : { min: 1, max: 5 };

    switch (field.field_type as WfFieldType) {
      case "short_text":
      case "email":
      case "phone":
        return (
          <Input
            type={field.field_type === "email" ? "email" : field.field_type === "phone" ? "tel" : "text"}
            placeholder={field.help_text ?? `Enter ${field.label.toLowerCase()}`}
            disabled
          />
        );

      case "long_text":
        return (
          <Textarea
            placeholder={field.help_text ?? `Enter ${field.label.toLowerCase()}`}
            rows={4}
            disabled
          />
        );

      case "number":
        return (
          <Input type="number" placeholder={field.help_text ?? "0"} disabled />
        );

      case "date":
        return <Input type="date" disabled />;

      case "dropdown":
        return (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {optionsArray.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multi_select":
        return (
          <div className="space-y-2">
            {optionsArray.map((option) => (
              <div key={option} className="flex items-center gap-2">
                <Checkbox id={`${field.id}-${option}`} disabled />
                <Label htmlFor={`${field.id}-${option}`} className="text-muted-foreground">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox id={field.id} disabled />
            <Label htmlFor={field.id} className="text-muted-foreground">
              {field.help_text || "Yes"}
            </Label>
          </div>
        );

      case "yes_no":
        return (
          <RadioGroup disabled>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id={`${field.id}-yes`} disabled />
                <Label htmlFor={`${field.id}-yes`} className="text-muted-foreground">Yes</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id={`${field.id}-no`} disabled />
                <Label htmlFor={`${field.id}-no`} className="text-muted-foreground">No</Label>
              </div>
            </div>
          </RadioGroup>
        );

      case "rating":
        // Generate rating buttons based on min/max config
        const ratingRange = Array.from(
          { length: ratingConfig.max - ratingConfig.min + 1 },
          (_, i) => ratingConfig.min + i
        );
        return (
          <div className="flex gap-2 flex-wrap">
            {ratingRange.map((n) => (
              <Button key={n} type="button" variant="outline" size="sm" disabled>
                {n}
              </Button>
            ))}
          </div>
        );

      default:
        return <Input disabled />;
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{form.title}</CardTitle>
          {form.description && (
            <CardDescription className="mt-2">{form.description}</CardDescription>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {fields.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No fields defined yet. Add fields to see the preview.
          </div>
        ) : (
          <>
            {fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label>
                  {field.label}
                  {field.is_required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {renderField(field)}
                {field.help_text && field.field_type !== "checkbox" && (
                  <p className="text-sm text-muted-foreground">{field.help_text}</p>
                )}
              </div>
            ))}

            <div className="pt-4 border-t">
              <Button disabled className="w-full">
                Submit Form (Preview)
              </Button>
            </div>
          </>
        )}

        <div className="text-center text-xs text-muted-foreground pt-4">
          This is a preview. Submissions are disabled.
        </div>
      </CardContent>
    </Card>
  );
}
