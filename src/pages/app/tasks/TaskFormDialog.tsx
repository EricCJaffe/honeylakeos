import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  RecurrenceSelector,
  RecurrenceConfig,
  configToRRule,
  rruleToConfig,
} from "@/components/tasks/RecurrenceSelector";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import { TemplateSelector } from "@/components/templates/TemplateSelector";
import { applyTemplateToForm, Template } from "@/hooks/useTemplates";
import { LinkPicker } from "@/components/LinkPicker";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.string().default("to_do"),
  priority: z.string().default("medium"),
  due_date: z.date().optional().nullable(),
  project_id: z.string().optional().nullable(),
  phase_id: z.string().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: any;
  projectId?: string;
  editMode?: "single" | "series"; // For recurring tasks
  templateToApply?: Template | null; // Template to apply on open
}

const statuses = [
  { value: "to_do", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  projectId,
  editMode = "series",
  templateToApply,
}: TaskFormDialogProps) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!task;

  // Recurrence state
  const [recurrenceConfig, setRecurrenceConfig] = React.useState<RecurrenceConfig | null>(null);

  // Fetch projects for dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, emoji")
        .eq("company_id", activeCompanyId)
        .eq("is_template", false)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!activeCompanyId && open,
  });

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "to_do",
      priority: "medium",
      due_date: null,
      project_id: projectId || null,
      phase_id: null,
    },
  });

  // Get the selected project ID for phase lookup
  const selectedProjectId = form.watch("project_id");
  const effectiveProjectId = selectedProjectId || projectId;

  // Fetch phases for selected project
  const { data: phases = [] } = useProjectPhases(effectiveProjectId || undefined);

  React.useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        due_date: task.due_date ? new Date(task.due_date) : null,
        project_id: task.project_id || null,
        phase_id: task.phase_id || null,
      });
      // Load recurrence config if exists
      if (task.recurrence_rules) {
        setRecurrenceConfig(rruleToConfig(task.recurrence_rules, task.recurrence_timezone));
      } else {
        setRecurrenceConfig(null);
      }
    } else if (templateToApply) {
      // Apply template when creating new task from template
      const payload = templateToApply.payload as Record<string, any>;
      form.reset({
        title: payload.title || "",
        description: payload.description || "",
        status: payload.status || "to_do",
        priority: payload.priority || "medium",
        due_date: null,
        project_id: projectId || null,
        phase_id: null,
      });
      setRecurrenceConfig(null);
    } else {
      form.reset({
        title: "",
        description: "",
        status: "to_do",
        priority: "medium",
        due_date: null,
        project_id: projectId || null,
        phase_id: null,
      });
      setRecurrenceConfig(null);
    }
  }, [task, projectId, form, templateToApply]);

  const mutation = useMutation({
    mutationFn: async (values: TaskFormValues) => {
      if (!activeCompanyId || !user) throw new Error("Missing context");

      const rrule = configToRRule(recurrenceConfig, values.due_date || undefined);
      const isRecurring = !!rrule;

      const taskData = {
        title: values.title,
        description: values.description || null,
        status: values.status,
        priority: values.priority,
        due_date: values.due_date ? format(values.due_date, "yyyy-MM-dd") : null,
        project_id: values.project_id || null,
        phase_id: values.phase_id || null,
        recurrence_rules: rrule,
        recurrence_timezone: recurrenceConfig?.timezone || "America/New_York",
        is_recurring_template: isRecurring,
        recurrence_start_at: isRecurring && values.due_date 
          ? values.due_date.toISOString() 
          : null,
        recurrence_end_at: recurrenceConfig?.endDate 
          ? recurrenceConfig.endDate.toISOString() 
          : null,
        recurrence_count: recurrenceConfig?.endCount || null,
      };

      if (isEditing && task) {
        // If editing a single occurrence, create an override
        if (editMode === "single" && task.is_recurring_template) {
          const { error } = await supabase.rpc("create_task_occurrence_override", {
            p_series_task_id: task.id,
            p_occurrence_start_at: task.recurrence_start_at || new Date().toISOString(),
            p_title: values.title,
            p_description: values.description || null,
            p_due_date: values.due_date ? format(values.due_date, "yyyy-MM-dd") : null,
            p_priority: values.priority,
            p_status: values.status,
          });
          if (error) throw error;
        } else {
          // Update the entire series or regular task
          const { error } = await supabase
            .from("tasks")
            .update(taskData)
            .eq("id", task.id);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from("tasks").insert({
          ...taskData,
          company_id: activeCompanyId,
          created_by: user.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-occurrences"] });
      toast.success(isEditing ? "Task updated" : "Task created");
      onOpenChange(false);
      form.reset();
      setRecurrenceConfig(null);
    },
    onError: (error) => {
      toast.error(error.message || "Something went wrong");
    },
  });

  const onSubmit = (values: TaskFormValues) => {
    mutation.mutate(values);
  };

  const dueDate = form.watch("due_date");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing 
              ? editMode === "single" 
                ? "Edit This Occurrence" 
                : "Edit Task" 
              : "New Task"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Template Selector - only for new tasks */}
            {!isEditing && (
              <TemplateSelector
                templateType="task"
                hasExistingData={!!form.watch("title") || !!form.watch("description")}
                onSelect={(template, overwrite) => {
                  const payload = template.payload as Record<string, any>;
                  const currentValues = form.getValues();
                  const newValues = applyTemplateToForm(currentValues, payload, overwrite);
                  form.reset(newValues);
                }}
              />
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Task title" {...field} />
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
                    <Textarea
                      placeholder="Add more details..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!projectId && (
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <FormControl>
                      <LinkPicker
                        type="project"
                        value={field.value}
                        onChange={(val) => {
                          field.onChange(val);
                          // Reset phase when project changes
                          form.setValue("phase_id", null);
                        }}
                        placeholder="Link to project (optional)"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Phase selector - show when project is selected */}
            {effectiveProjectId && phases.length > 0 && (
              <FormField
                control={form.control}
                name="phase_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phase</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select phase (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {phases.filter(p => p.status === "active").map((phase) => (
                          <SelectItem key={phase.id} value={phase.id}>
                            {phase.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorities.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurrence - only show when creating new or editing series */}
            {editMode === "series" && (
              <div className="space-y-2">
                <FormLabel>Repeat</FormLabel>
                <RecurrenceSelector
                  value={recurrenceConfig}
                  onChange={setRecurrenceConfig}
                  startDate={dueDate || undefined}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
