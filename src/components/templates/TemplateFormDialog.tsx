import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTemplateMutations, Template, TemplateType } from "@/hooks/useTemplates";

const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  template_type: z.enum(["task", "project", "note", "document", "event"]),
  is_active: z.boolean().default(true),
  // Task fields
  task_title: z.string().optional(),
  task_description: z.string().optional(),
  task_priority: z.string().optional(),
  task_status: z.string().optional(),
  // Project fields
  project_name: z.string().optional(),
  project_description: z.string().optional(),
  project_emoji: z.string().optional(),
  project_status: z.string().optional(),
  // Note fields
  note_title: z.string().optional(),
  note_content: z.string().optional(),
  note_color: z.string().optional(),
  // Event fields
  event_title: z.string().optional(),
  event_description: z.string().optional(),
  event_all_day: z.boolean().optional(),
  event_category: z.string().optional(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Template | null;
  defaultType?: TemplateType;
}

const templateTypes = [
  { value: "task", label: "Task" },
  { value: "project", label: "Project" },
  { value: "note", label: "Note" },
  { value: "document", label: "Document" },
  { value: "event", label: "Event" },
];

const priorities = ["low", "medium", "high", "urgent"];
const taskStatuses = ["to_do", "in_progress", "done"];
const projectStatuses = ["active", "on_hold", "completed", "archived"];
const projectEmojis = ["📋", "🚀", "💡", "🎯", "📊", "🔧", "📝", "⭐", "🏆", "🎨"];
const noteColors = ["default", "red", "orange", "yellow", "green", "blue", "purple"];

function payloadToFormValues(payload: Record<string, any>, templateType: TemplateType): Partial<TemplateFormValues> {
  const prefix = templateType === "task" ? "task_" :
                 templateType === "project" ? "project_" :
                 templateType === "note" ? "note_" :
                 templateType === "event" ? "event_" : "";
  
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    result[`${prefix}${key}`] = value;
  }
  return result;
}

function formValuesToPayload(values: TemplateFormValues): Record<string, any> {
  const payload: Record<string, any> = {};
  const prefix = values.template_type === "task" ? "task_" :
                 values.template_type === "project" ? "project_" :
                 values.template_type === "note" ? "note_" :
                 values.template_type === "event" ? "event_" : "";

  for (const [key, value] of Object.entries(values)) {
    if (key.startsWith(prefix) && value !== undefined && value !== "") {
      const fieldName = key.replace(prefix, "");
      payload[fieldName] = value;
    }
  }
  return payload;
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  defaultType,
}: TemplateFormDialogProps) {
  const { createTemplate, updateTemplate } = useTemplateMutations();
  const isEditing = !!template;

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      template_type: defaultType || "task",
      is_active: true,
    },
  });

  const selectedType = form.watch("template_type");

  React.useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        description: template.description || "",
        template_type: template.template_type,
        is_active: template.is_active,
        ...payloadToFormValues(template.payload, template.template_type),
      });
    } else {
      form.reset({
        name: "",
        description: "",
        template_type: defaultType || "task",
        is_active: true,
      });
    }
  }, [template, defaultType, form]);

  const onSubmit = async (values: TemplateFormValues) => {
    const payload = formValuesToPayload(values);

    if (isEditing && template) {
      await updateTemplate.mutateAsync({
        id: template.id,
        name: values.name,
        description: values.description || null,
        payload,
        isActive: values.is_active,
      });
    } else {
      await createTemplate.mutateAsync({
        templateType: values.template_type,
        name: values.name,
        description: values.description,
        payload,
      });
    }
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="template_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templateTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Weekly Report Task" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What is this template for?" rows={2} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Default Values</h4>

              {/* Task Fields */}
              {selectedType === "task" && (
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="task_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Default task title" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="task_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Default description" rows={2} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="task_priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {priorities.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="task_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {taskStatuses.map((s) => (
                                <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Project Fields */}
              {selectedType === "project" && (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <FormField
                      control={form.control}
                      name="project_emoji"
                      render={({ field }) => (
                        <FormItem className="w-20">
                          <FormLabel>Icon</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="📋" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {projectEmojis.map((e) => (
                                <SelectItem key={e} value={e}>{e}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="project_name"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Default project name" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="project_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Default description" rows={2} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="project_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projectStatuses.map((s) => (
                              <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Note Fields */}
              {selectedType === "note" && (
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="note_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Default note title" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="note_content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Default content or template" rows={4} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="note_color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {noteColors.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Event Fields */}
              {selectedType === "event" && (
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="event_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Default event title" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="event_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Default description" rows={2} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="event_category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Meeting" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="event_all_day"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <FormLabel className="text-sm">All Day</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Document - minimal fields */}
              {selectedType === "document" && (
                <p className="text-sm text-muted-foreground">
                  Document templates can pre-fill name and description when uploading files.
                </p>
              )}
            </div>

            {isEditing && (
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Active</FormLabel>
                      <FormDescription className="text-xs">
                        Inactive templates won't appear in selection dropdowns
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTemplate.isPending || updateTemplate.isPending}
              >
                {createTemplate.isPending || updateTemplate.isPending
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Create Template"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
