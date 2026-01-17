import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWfFormFieldMutations, type WfFormField } from "@/hooks/useWorkflowForms";

const fieldTypes = [
  { value: "short_text", label: "Short Text" },
  { value: "long_text", label: "Long Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "dropdown", label: "Dropdown" },
  { value: "multi_select", label: "Multi-Select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "rating", label: "Rating (1-5)" },
  { value: "yes_no", label: "Yes/No" },
] as const;

const formSchema = z.object({
  key: z.string().min(1, "Key is required").regex(/^[a-z_]+$/, "Key must be lowercase with underscores only"),
  label: z.string().min(1, "Label is required"),
  help_text: z.string().optional(),
  field_type: z.enum([
    "short_text",
    "long_text",
    "email",
    "phone",
    "number",
    "date",
    "dropdown",
    "multi_select",
    "checkbox",
    "rating",
    "yes_no",
  ]),
  is_required: z.boolean(),
  options_text: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface FormFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  field?: WfFormField | null;
}

export function FormFieldDialog({
  open,
  onOpenChange,
  formId,
  field,
}: FormFieldDialogProps) {
  const { createField, updateField } = useWfFormFieldMutations(formId);
  const isEditing = !!field;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      key: "",
      label: "",
      help_text: "",
      field_type: "short_text",
      is_required: false,
      options_text: "",
    },
  });

  const watchFieldType = form.watch("field_type");
  const showOptions = ["dropdown", "multi_select"].includes(watchFieldType);

  useEffect(() => {
    if (field) {
      const options = field.options as string[] | null;
      form.reset({
        key: field.key,
        label: field.label,
        help_text: field.help_text ?? "",
        field_type: field.field_type as FormValues["field_type"],
        is_required: field.is_required,
        options_text: options?.join("\n") ?? "",
      });
    } else {
      form.reset({
        key: "",
        label: "",
        help_text: "",
        field_type: "short_text",
        is_required: false,
        options_text: "",
      });
    }
  }, [field, form]);

  // Auto-generate key from label
  const watchLabel = form.watch("label");
  useEffect(() => {
    if (!isEditing && watchLabel) {
      const key = watchLabel
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      form.setValue("key", key);
    }
  }, [watchLabel, isEditing, form]);

  const onSubmit = async (values: FormValues) => {
    const options = values.options_text
      ? values.options_text.split("\n").filter((o) => o.trim())
      : [];

    const payload = {
      key: values.key,
      label: values.label,
      help_text: values.help_text || null,
      field_type: values.field_type,
      is_required: values.is_required,
      options: showOptions ? options : [],
    };

    if (isEditing && field) {
      await updateField.mutateAsync({ id: field.id, ...payload });
    } else {
      await createField.mutateAsync(payload);
    }
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Field" : "Add Field"}</DialogTitle>
          <DialogDescription>
            Configure this form field.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input placeholder="Full Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Key</FormLabel>
                  <FormControl>
                    <Input placeholder="full_name" {...field} disabled={isEditing} />
                  </FormControl>
                  <FormDescription>
                    Unique identifier (lowercase, underscores only)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="field_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select field type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fieldTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showOptions && (
              <FormField
                control={form.control}
                name="options_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Options</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>One option per line</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="help_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Help Text (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full legal name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_required"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Required</FormLabel>
                    <FormDescription>Make this field mandatory</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createField.isPending || updateField.isPending}
              >
                {createField.isPending || updateField.isPending
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Add Field"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
