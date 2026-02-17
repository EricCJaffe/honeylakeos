import * as React from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import { useAiReadiness } from "@/hooks/useAiReadiness";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  task_project_id: z.string().optional(),
  task_phase_id: z.string().optional(),
  // Project fields
  project_name: z.string().optional(),
  project_description: z.string().optional(),
  project_emoji: z.string().optional(),
  project_status: z.string().optional(),
  // Note fields
  note_title: z.string().optional(),
  note_content: z.string().optional(),
  note_color: z.string().optional(),
  note_project_id: z.string().optional(),
  // Document fields
  document_name: z.string().optional(),
  document_description: z.string().optional(),
  document_project_id: z.string().optional(),
  // Event fields
  event_title: z.string().optional(),
  event_description: z.string().optional(),
  event_all_day: z.boolean().optional(),
  event_category: z.string().optional(),
  event_project_id: z.string().optional(),
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

type AiTemplateField = {
  label: string;
  options?: string[];
};

type AiTemplateDraft = {
  title: string;
  description: string;
  defaults?: Record<string, unknown>;
  fields?: AiTemplateField[];
};

function normalizeKey(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function parseAiTemplateDraft(value: unknown): AiTemplateDraft {
  if (!value || typeof value !== "object") {
    throw new Error("AI returned an invalid template payload");
  }

  const raw = value as Record<string, unknown>;
  if (typeof raw.title !== "string" || !raw.title.trim()) {
    throw new Error("AI payload is missing a valid title");
  }
  if (typeof raw.description !== "string") {
    throw new Error("AI payload is missing a valid description");
  }

  const fields = Array.isArray(raw.fields)
    ? raw.fields
        .filter((field) => !!field && typeof field === "object")
        .map((field) => {
          const f = field as Record<string, unknown>;
          return {
            label: typeof f.label === "string" ? f.label : "",
            options: Array.isArray(f.options) ? f.options.filter((opt) => typeof opt === "string") as string[] : undefined,
          };
        })
        .filter((field) => field.label.length > 0)
    : [];

  return {
    title: raw.title,
    description: raw.description,
    defaults: raw.defaults && typeof raw.defaults === "object" ? raw.defaults as Record<string, unknown> : undefined,
    fields,
  };
}

function applyAiDraftToFormValues(
  draft: AiTemplateDraft,
  templateType: TemplateType,
  projectEmojiOptions: string[],
): Partial<TemplateFormValues> {
  const values: Partial<TemplateFormValues> = {
    name: draft.title,
    description: draft.description,
    template_type: templateType,
  };

  const defaults = draft.defaults || {};
  const getDefault = (key: string): string | undefined => {
    const value = defaults[key];
    return typeof value === "string" ? value : undefined;
  };

  if (templateType === "task") {
    values.task_title = getDefault("title") || getDefault("task_title") || "";
    values.task_description = getDefault("description") || getDefault("task_description") || "";
    values.task_priority = getDefault("priority") || getDefault("task_priority") || "";
    values.task_status = getDefault("status") || getDefault("task_status") || "";
  } else if (templateType === "project") {
    values.project_name = getDefault("name") || getDefault("project_name") || "";
    values.project_description = getDefault("description") || getDefault("project_description") || "";
    const emoji = getDefault("emoji") || getDefault("project_emoji") || "";
    values.project_emoji = projectEmojiOptions.includes(emoji) ? emoji : "";
    values.project_status = getDefault("status") || getDefault("project_status") || "";
  } else if (templateType === "note") {
    values.note_title = getDefault("title") || getDefault("note_title") || "";
    values.note_content = getDefault("content") || getDefault("note_content") || "";
    values.note_color = getDefault("color") || getDefault("note_color") || "";
  } else if (templateType === "document") {
    values.document_name = getDefault("name") || getDefault("document_name") || "";
    values.document_description = getDefault("description") || getDefault("document_description") || "";
  } else if (templateType === "event") {
    values.event_title = getDefault("title") || getDefault("event_title") || "";
    values.event_description = getDefault("description") || getDefault("event_description") || "";
    values.event_category = getDefault("category") || getDefault("event_category") || "";
    const allDay = defaults.all_day ?? defaults.event_all_day;
    if (typeof allDay === "boolean") {
      values.event_all_day = allDay;
    }
  }

  if ((!draft.defaults || Object.keys(draft.defaults).length === 0) && draft.fields && draft.fields.length > 0) {
    for (const field of draft.fields) {
      const key = normalizeKey(field.label);
      const firstOption = field.options?.[0];

      if (templateType === "task") {
        if (key === "title" && !values.task_title) values.task_title = field.label;
        if (key === "description" && !values.task_description) values.task_description = "";
        if (key === "priority" && !values.task_priority) values.task_priority = firstOption || "";
        if (key === "status" && !values.task_status) values.task_status = firstOption || "";
      } else if (templateType === "project") {
        if ((key === "name" || key === "title") && !values.project_name) values.project_name = draft.title;
        if (key === "description" && !values.project_description) values.project_description = "";
        if (key === "status" && !values.project_status) values.project_status = firstOption || "";
      } else if (templateType === "note") {
        if (key === "title" && !values.note_title) values.note_title = draft.title;
        if ((key === "content" || key === "body") && !values.note_content) values.note_content = "";
      } else if (templateType === "document") {
        if ((key === "name" || key === "title") && !values.document_name) values.document_name = draft.title;
        if (key === "description" && !values.document_description) values.document_description = "";
      } else if (templateType === "event") {
        if ((key === "title" || key === "name") && !values.event_title) values.event_title = draft.title;
        if (key === "description" && !values.event_description) values.event_description = "";
        if (key === "category" && !values.event_category) values.event_category = firstOption || "";
      }
    }
  }

  return values;
}

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
  const { activeCompanyId } = useActiveCompany();
  const { createTemplate, updateTemplate } = useTemplateMutations();
  const isEditing = !!template;
  const [aiPrompt, setAiPrompt] = React.useState("");
  const [isGeneratingAi, setIsGeneratingAi] = React.useState(false);

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
  const selectedTaskProjectId = form.watch("task_project_id");
  const aiReadiness = useAiReadiness("template_copilot", open);

  // Fetch active projects for linking
  const { data: projects = [] } = useQuery({
    queryKey: ["active-projects", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, emoji")
        .eq("company_id", activeCompanyId)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompanyId && open,
  });

  // Fetch phases for selected project (tasks only)
  const { data: phases = [] } = useProjectPhases(selectedTaskProjectId);

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

  const handleGenerateTemplateWithAi = async () => {
    if (!activeCompanyId) {
      toast.error("Select an active company before using AI");
      return;
    }
    if (!aiPrompt.trim()) {
      toast.error("Enter a prompt for the template");
      return;
    }
    if (aiReadiness.data && !aiReadiness.data.available) {
      toast.error(aiReadiness.data.reason);
      return;
    }

    setIsGeneratingAi(true);
    try {
      const allowedDefaultsByType: Record<TemplateType, string[]> = {
        task: ["title", "description", "priority", "status"],
        project: ["name", "description", "emoji", "status"],
        note: ["title", "content", "color"],
        document: ["name", "description"],
        event: ["title", "description", "category", "all_day"],
      };

      const { data, error } = await supabase.functions.invoke("ai-gateway", {
        body: {
          companyId: activeCompanyId,
          taskType: "template_copilot",
          userPrompt: `${aiPrompt.trim()}\n\nReturn defaults using ONLY these keys: ${allowedDefaultsByType[selectedType].join(", ")}.`,
          context: {
            templateType: selectedType,
            allowedDefaults: allowedDefaultsByType[selectedType],
            allowedTaskPriorities: priorities,
            allowedTaskStatuses: taskStatuses,
            allowedProjectStatuses: projectStatuses,
            allowedProjectEmojis: projectEmojis,
            allowedNoteColors: noteColors,
            outputRequirements: {
              includeDefaultsObject: true,
              includeFieldsArray: true,
            },
          },
        },
      });

      if (error) throw error;

      const parsed = parseAiTemplateDraft((data as { outputJson?: unknown } | null)?.outputJson);
      const aiValues = applyAiDraftToFormValues(parsed, selectedType, projectEmojis);
      form.reset({
        ...form.getValues(),
        ...aiValues,
      });

      toast.success("AI template draft applied to form");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate template with AI");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Template Copilot</p>
                  <p className="text-xs text-muted-foreground">Generate defaults from a prompt and review before saving.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateTemplateWithAi}
                  disabled={isGeneratingAi || !aiPrompt.trim() || aiReadiness.isLoading || (aiReadiness.data ? !aiReadiness.data.available : false)}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  {isGeneratingAi ? "Generating..." : aiReadiness.isLoading ? "Checking..." : "Generate"}
                </Button>
              </div>

              {aiReadiness.data && (
                <Alert variant={aiReadiness.data.available ? "default" : "destructive"}>
                  <AlertTitle>{aiReadiness.data.available ? "AI Ready" : "AI Blocked"}</AlertTitle>
                  <AlertDescription>
                    {aiReadiness.data.reason}
                    {aiReadiness.data.dailyUsed !== null && aiReadiness.data.dailyBudget !== null && (
                      <span className="block mt-1">
                        Daily usage: {aiReadiness.data.dailyUsed.toLocaleString()} / {aiReadiness.data.dailyBudget.toLocaleString()} tokens
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={2}
                placeholder="Example: Create a project kickoff template with status, scope summary, and key milestones."
              />
            </div>

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
                  
                  {/* Optional project linkage */}
                  <FormField
                    control={form.control}
                    name="task_project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link to Project (optional)</FormLabel>
                        <Select 
                          onValueChange={(v) => {
                            field.onChange(v === "__none__" ? "" : v);
                            // Clear phase when project changes
                            if (v === "__none__" || v !== field.value) {
                              form.setValue("task_phase_id", "");
                            }
                          }} 
                          value={field.value || "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="No project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">No project</SelectItem>
                            {projects.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.emoji} {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Tasks created from this template will be linked to this project
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  {/* Optional phase assignment (only when project selected) */}
                  {selectedTaskProjectId && phases.length > 0 && (
                    <FormField
                      control={form.control}
                      name="task_phase_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign to Phase (optional)</FormLabel>
                          <Select 
                            onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} 
                            value={field.value || "__none__"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="No phase" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">No phase</SelectItem>
                              {phases.filter(p => p.status === "active").map((phase) => (
                                <SelectItem key={phase.id} value={phase.id}>
                                  {phase.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  )}
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
                  {/* Optional project linkage for notes */}
                  <FormField
                    control={form.control}
                    name="note_project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link to Project (optional)</FormLabel>
                        <Select 
                          onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} 
                          value={field.value || "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="No project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">No project</SelectItem>
                            {projects.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.emoji} {p.name}
                              </SelectItem>
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
                  {/* Optional project linkage for events */}
                  <FormField
                    control={form.control}
                    name="event_project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link to Project (optional)</FormLabel>
                        <Select 
                          onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} 
                          value={field.value || "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="No project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">No project</SelectItem>
                            {projects.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.emoji} {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Document Fields */}
              {selectedType === "document" && (
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="document_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Default document name" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="document_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Default description" rows={2} {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {/* Optional project linkage for documents */}
                  <FormField
                    control={form.control}
                    name="document_project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link to Project (optional)</FormLabel>
                        <Select 
                          onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} 
                          value={field.value || "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="No project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">No project</SelectItem>
                            {projects.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.emoji} {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
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
