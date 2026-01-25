import * as React from "react";
import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, GripVertical } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useProjectTemplateDetails,
  useProjectTemplateMutations,
  ProjectTemplate,
} from "@/hooks/useProjectTemplates";

const phaseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sort_order: z.number(),
  color: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  default_phase_name: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
  sort_order: z.number(),
  relative_due_days: z.number().nullable().optional(),
  is_milestone: z.boolean().default(false),
});

const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  emoji: z.string().default("📋"),
  color: z.string().default("#2563eb"),
  phases: z.array(phaseSchema),
  tasks: z.array(taskSchema),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

interface ProjectTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ProjectTemplate | null;
}

const emojis = ["📋", "🚀", "💡", "🎯", "📊", "🔧", "📝", "⭐", "🏆", "🎨"];
const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function ProjectTemplateFormDialog({
  open,
  onOpenChange,
  template,
}: ProjectTemplateFormDialogProps) {
  const isEditing = !!template;
  const { data: details, isLoading } = useProjectTemplateDetails(
    isEditing ? template?.id : undefined
  );
  const { createTemplate, updateTemplate } = useProjectTemplateMutations();
  const [activeTab, setActiveTab] = useState("basic");

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      emoji: "📋",
      color: "#2563eb",
      phases: [],
      tasks: [],
    },
  });

  const {
    fields: phaseFields,
    append: appendPhase,
    remove: removePhase,
    move: movePhase,
  } = useFieldArray({
    control: form.control,
    name: "phases",
  });

  const {
    fields: taskFields,
    append: appendTask,
    remove: removeTask,
  } = useFieldArray({
    control: form.control,
    name: "tasks",
  });

  useEffect(() => {
    if (isEditing && details) {
      form.reset({
        name: details.name,
        description: details.description || "",
        emoji: details.emoji,
        color: details.color,
        phases: details.phases.map((p) => ({
          name: p.name,
          sort_order: p.sort_order,
          color: p.color,
          description: p.description,
        })),
        tasks: details.tasks.map((t) => ({
          title: t.title,
          description: t.description,
          default_phase_name: t.default_phase_name,
          priority: t.priority,
          sort_order: t.sort_order,
          relative_due_days: t.relative_due_days,
          is_milestone: t.is_milestone,
        })),
      });
    } else if (!isEditing) {
      form.reset({
        name: "",
        description: "",
        emoji: "📋",
        color: "#2563eb",
        phases: [],
        tasks: [],
      });
    }
  }, [details, isEditing, form]);

  const onSubmit = async (values: TemplateFormValues) => {
    // Ensure sort_order is set correctly and required fields are present
    const phases = values.phases.map((p, i) => ({
      name: p.name,
      sort_order: i,
      color: p.color || null,
      description: p.description || null,
    }));
    const tasks = values.tasks.map((t, i) => ({
      title: t.title,
      description: t.description || null,
      default_phase_name: t.default_phase_name || null,
      priority: t.priority || "medium",
      sort_order: i,
      relative_due_days: t.relative_due_days ?? null,
      is_milestone: t.is_milestone || false,
    }));

    if (isEditing && template) {
      await updateTemplate.mutateAsync({
        id: template.id,
        name: values.name,
        description: values.description,
        emoji: values.emoji,
        color: values.color,
        phases,
        tasks,
      });
    } else {
      await createTemplate.mutateAsync({
        name: values.name,
        description: values.description,
        emoji: values.emoji,
        color: values.color,
        phases,
        tasks,
      });
    }
    onOpenChange(false);
  };

  const phaseNames = form.watch("phases").map((p) => p.name);

  const addPhase = () => {
    appendPhase({
      name: `Phase ${phaseFields.length + 1}`,
      sort_order: phaseFields.length,
      color: null,
      description: null,
    });
  };

  const addTask = () => {
    appendTask({
      title: "",
      description: null,
      default_phase_name: null,
      priority: "medium",
      sort_order: taskFields.length,
      relative_due_days: null,
      is_milestone: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Project Template" : "New Project Template"}
          </DialogTitle>
        </DialogHeader>

        {isEditing && isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="phases">
                    Phases ({phaseFields.length})
                  </TabsTrigger>
                  <TabsTrigger value="tasks">
                    Tasks ({taskFields.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="flex gap-3">
                    <FormField
                      control={form.control}
                      name="emoji"
                      render={({ field }) => (
                        <FormItem className="w-20">
                          <FormLabel>Icon</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {emojis.map((emoji) => (
                                <SelectItem key={emoji} value={emoji}>
                                  {emoji}
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
                        <FormItem className="flex-1">
                          <FormLabel>Template Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Product Launch" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="What is this template for?"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="phases" className="space-y-4 mt-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Define the phases for projects created from this template.
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={addPhase}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Phase
                    </Button>
                  </div>

                  {phaseFields.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No phases defined. Click "Add Phase" to get started.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {phaseFields.map((field, index) => (
                        <div
                          key={field.id}
                          className="flex items-center gap-2 p-3 border rounded-lg bg-card"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          <Badge variant="secondary" className="w-6 justify-center">
                            {index + 1}
                          </Badge>
                          <FormField
                            control={form.control}
                            name={`phases.${index}.name`}
                            render={({ field }) => (
                              <FormItem className="flex-1 mb-0">
                                <FormControl>
                                  <Input placeholder="Phase name" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePhase(index)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="tasks" className="space-y-4 mt-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Define default tasks that will be created with new projects.
                    </p>
                    <Button type="button" variant="outline" size="sm" onClick={addTask}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Task
                    </Button>
                  </div>

                  {taskFields.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No tasks defined. Click "Add Task" to get started.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {taskFields.map((field, index) => (
                        <Card key={field.id}>
                          <CardContent className="pt-4 pb-3">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 space-y-3">
                                <FormField
                                  control={form.control}
                                  name={`tasks.${index}.title`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input placeholder="Task title" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <div className="grid grid-cols-3 gap-2">
                                  <FormField
                                    control={form.control}
                                    name={`tasks.${index}.default_phase_name`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Phase</FormLabel>
                                        <Select
                                          onValueChange={field.onChange}
                                          value={field.value || undefined}
                                        >
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="None" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {phaseNames.map((name) => (
                                              <SelectItem key={name} value={name}>
                                                {name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`tasks.${index}.priority`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Priority</FormLabel>
                                        <Select
                                          onValueChange={field.onChange}
                                          value={field.value || "medium"}
                                        >
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {priorities.map((p) => (
                                              <SelectItem key={p.value} value={p.value}>
                                                {p.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`tasks.${index}.relative_due_days`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Due (days)</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            placeholder="e.g., 7"
                                            {...field}
                                            value={field.value ?? ""}
                                            onChange={(e) =>
                                              field.onChange(
                                                e.target.value
                                                  ? parseInt(e.target.value)
                                                  : null
                                              )
                                            }
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeTask(index)}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
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
        )}
      </DialogContent>
    </Dialog>
  );
}
