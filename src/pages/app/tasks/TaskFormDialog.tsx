import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Paperclip, Pin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
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
import { RichTextField } from "@/components/ui/rich-text-field";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  RecurrenceSelector,
  RecurrenceConfig,
  configToRRule,
  rruleToConfig,
} from "@/components/tasks/RecurrenceSelector";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import { useTaskLists } from "@/hooks/useTaskLists";
import { TemplateSelector } from "@/components/templates/TemplateSelector";
import { applyTemplateToForm, Template } from "@/hooks/useTemplates";
import { LinkPicker } from "@/components/LinkPicker";
import { AssigneePicker } from "@/components/tasks/AssigneePicker";
import { useTaskAssignees } from "@/hooks/useCompanyMembers";
import { TaskTagInput } from "@/components/tasks/TaskTagInput";
import { SubtasksDialogSection, DraftSubtask } from "@/components/tasks/SubtasksDialogSection";
import { CrmClientPicker } from "@/components/crm/CrmClientPicker";
import { OwnerSelector } from "@/components/ownership/OwnerSelector";
import { useReassignOwner } from "@/hooks/useReassignOwner";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.string().default("to_do"),
  priority: z.string().default("medium"),
  due_date: z.date().optional().nullable(),
  project_id: z.string().optional().nullable(),
  phase_id: z.string().optional().nullable(),
  list_id: z.string().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: any;
  projectId?: string;
  crmClientId?: string; // Pre-fill CRM client link
  editMode?: "single" | "series"; // For recurring tasks
  templateToApply?: Template | null; // Template to apply on open
  onSuccess?: (taskId: string) => void;
}

const statuses = [
  { value: "to_do", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "archived", label: "Archived" },
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
  crmClientId,
  editMode = "series",
  templateToApply,
  onSuccess,
}: TaskFormDialogProps) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { isCompanyAdmin } = useMembership();
  const queryClient = useQueryClient();
  const isEditing = !!task;

  // CRM client link state
  const [linkedCrmClientId, setLinkedCrmClientId] = React.useState<string | null>(crmClientId || null);

  // Recurrence state
  const [recurrenceConfig, setRecurrenceConfig] = React.useState<RecurrenceConfig | null>(null);

  // Pin state
  const [isPinned, setIsPinned] = React.useState(false);

  // Owner state (for reassignment)
  const [pendingOwnerId, setPendingOwnerId] = React.useState<string | null>(null);
  
  // Check if user can reassign owner (admin or current owner)
  const canReassign = isEditing && task && (isCompanyAdmin || task.owner_user_id === user?.id || task.created_by === user?.id);
  
  const reassignOwner = useReassignOwner();

  // Assignees state
  const [assignees, setAssignees] = React.useState<string[]>([]);
  const { data: existingAssignees = [] } = useTaskAssignees(task?.id);

  // Tags state
  const [tags, setTags] = React.useState<string[]>([]);

  // Draft subtasks state (for new tasks only - persisted after task creation)
  const [draftSubtasks, setDraftSubtasks] = React.useState<DraftSubtask[]>([]);

  // Set initial assignees, tags, and reset subtasks when editing or dialog opens
  React.useEffect(() => {
    if (task && existingAssignees.length > 0) {
      setAssignees(existingAssignees);
    } else if (!task && user) {
      // Default to current user when creating
      setAssignees([user.id]);
    }
    // Set tags from task
    if (task?.tags) {
      const taskTags = Array.isArray(task.tags) ? task.tags : [];
      setTags(taskTags.filter((t: unknown): t is string => typeof t === "string"));
    } else {
      setTags([]);
    }
    // Set pin state from task
    setIsPinned(task?.is_pinned ?? false);
    // Set owner state
    setPendingOwnerId(task?.owner_user_id || task?.created_by || null);
    // Reset draft subtasks when opening for new task
    if (!task) {
      setDraftSubtasks([]);
    }
  }, [task, existingAssignees, user]);

  // Fetch task lists
  const { taskLists, personalLists, companyLists } = useTaskLists();

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
      list_id: null,
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
        list_id: task.list_id || null,
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
        list_id: null,
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
        list_id: null,
      });
      setRecurrenceConfig(null);
    }
  }, [task, projectId, form, templateToApply]);

  const mutation = useMutation({
    mutationFn: async (values: TaskFormValues) => {
      if (!activeCompanyId || !user) throw new Error("Missing context");

      const rrule = configToRRule(recurrenceConfig, values.due_date || undefined);
      const isRecurring = !!rrule;

      // Determine pinned_at based on is_pinned state
      const wasPinned = task?.is_pinned ?? false;
      let pinned_at: string | null = task?.pinned_at ?? null;
      if (isPinned && !wasPinned) {
        // Newly pinned
        pinned_at = new Date().toISOString();
      } else if (!isPinned) {
        // Unpinned
        pinned_at = null;
      }

      const taskData = {
        title: values.title,
        description: values.description || null,
        status: values.status,
        priority: values.priority,
        due_date: values.due_date ? format(values.due_date, "yyyy-MM-dd") : null,
        project_id: values.project_id || null,
        phase_id: values.phase_id || null,
        list_id: values.list_id || null,
        tags: tags,
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
        is_pinned: isPinned,
        pinned_at: pinned_at,
      };

      let taskId = task?.id;

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

        // Update assignees for existing task
        // First, remove existing assignees
        await supabase.from("task_assignees").delete().eq("task_id", task.id);
        
        // Then add new assignees
        if (assignees.length > 0) {
          const { error: assignError } = await supabase.from("task_assignees").insert(
            assignees.map((userId) => ({
              task_id: task.id,
              user_id: userId,
            }))
          );
          if (assignError) throw assignError;
        }
      } else {
        // Create new task
        const { data: newTask, error } = await supabase
          .from("tasks")
          .insert({
            ...taskData,
            company_id: activeCompanyId,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (error) throw error;
        taskId = newTask.id;

        // Add assignees for new task
        if (assignees.length > 0 && taskId) {
          const { error: assignError } = await supabase.from("task_assignees").insert(
            assignees.map((userId) => ({
              task_id: taskId,
              user_id: userId,
            }))
          );
          if (assignError) throw assignError;
        }

        // Batch create draft subtasks for new task
        if (draftSubtasks.length > 0 && taskId) {
          const subtasksToInsert = draftSubtasks.map((subtask, index) => ({
            company_id: activeCompanyId,
            parent_task_id: taskId,
            title: subtask.title,
            due_date: subtask.dueDate || null,
            status: subtask.status,
            sort_order: index,
            created_by: user.id,
          }));

          const { error: subtaskError } = await supabase
            .from("task_subtasks")
            .insert(subtasksToInsert);

          if (subtaskError) {
            console.error("Failed to create subtasks:", subtaskError);
            // Don't throw - task was created successfully, subtasks are non-critical
          }
        }
      }

      // Create CRM client link if specified (for new tasks only)
      if (!isEditing && linkedCrmClientId && taskId) {
        try {
          await supabase.rpc("create_entity_link", {
            p_company_id: activeCompanyId,
            p_from_type: "crm_client",
            p_from_id: linkedCrmClientId,
            p_to_type: "task",
            p_to_id: taskId,
            p_link_type: "related",
          });
        } catch (linkError) {
          console.error("Failed to link task to client:", linkError);
          // Don't throw - task was created successfully
        }
      }

      return taskId;
    },
    onSuccess: async (taskId: string) => {
      // Handle owner reassignment if changed (for editing only)
      if (isEditing && task && pendingOwnerId && pendingOwnerId !== (task.owner_user_id || task.created_by)) {
        await reassignOwner.mutateAsync({
          entityType: "task",
          entityId: task.id,
          newOwnerId: pendingOwnerId,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["task-assignees"] });
      queryClient.invalidateQueries({ queryKey: ["task-subtasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-subtask-counts"] });
      queryClient.invalidateQueries({ queryKey: ["entity-links"] });
      queryClient.invalidateQueries({ queryKey: ["crm-hub-links"] });
      queryClient.invalidateQueries({ queryKey: ["crm-hub-tasks"] });
      toast.success(isEditing ? "Task updated" : "Task created");
      onOpenChange(false);
      form.reset();
      setRecurrenceConfig(null);
      setAssignees([]);
      setTags([]);
      setDraftSubtasks([]);
      setLinkedCrmClientId(null);
      setIsPinned(false);
      setPendingOwnerId(null);
      if (taskId) {
        onSuccess?.(taskId);
      }
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="space-y-4 py-2">
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
                    <Input 
                      placeholder="Task title" 
                      autoFocus
                      {...field} 
                    />
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
                  <FormControl>
                    <RichTextField
                      label="Description"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Add more details..."
                      minHeight="100px"
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

            {/* List selector */}
            {taskLists.length > 0 && (
              <FormField
                control={form.control}
                name="list_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>List</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select list (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {personalLists && personalLists.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Personal</div>
                            {personalLists.map((list) => (
                              <SelectItem key={list.id} value={list.id}>
                                <div className="flex items-center gap-2">
                                  {list.color && (
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                                  )}
                                  {list.name}
                                </div>
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {companyLists && companyLists.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Company</div>
                            {companyLists.map((list) => (
                              <SelectItem key={list.id} value={list.id}>
                                <div className="flex items-center gap-2">
                                  {list.color && (
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                                  )}
                                  {list.name}
                                </div>
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Assignee picker */}
            <div className="space-y-2">
              <FormLabel>Assignee</FormLabel>
              <AssigneePicker
                value={assignees}
                onChange={setAssignees}
                placeholder="Assign to..."
                defaultToCurrentUser={!isEditing}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <FormLabel>Tags</FormLabel>
              <TaskTagInput
                value={tags}
                onChange={setTags}
                placeholder="Add tags (press Enter)"
              />
            </div>

            {/* CRM Client Link */}
            <div className="space-y-2">
              <FormLabel>Client</FormLabel>
              <CrmClientPicker
                value={linkedCrmClientId}
                onChange={setLinkedCrmClientId}
                placeholder="Link to client (optional)"
              />
            </div>

            {/* Subtasks section */}
            <SubtasksDialogSection
              taskId={isEditing ? task?.id : undefined}
              draftSubtasks={isEditing ? undefined : draftSubtasks}
              onDraftSubtasksChange={isEditing ? undefined : setDraftSubtasks}
            />

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

            {/* Pin toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Pin className={cn("h-4 w-4", isPinned && "text-primary fill-primary")} />
                <div className="space-y-0.5">
                  <span className="text-sm font-medium">Pin to top</span>
                  <p className="text-xs text-muted-foreground">Keep this task at the top of lists</p>
                </div>
              </div>
              <Switch
                checked={isPinned}
                onCheckedChange={setIsPinned}
              />
            </div>

            {/* Owner selector - only for editing, and only if user can reassign */}
            {canReassign && activeCompanyId && (
              <OwnerSelector
                companyId={activeCompanyId}
                value={pendingOwnerId}
                onChange={setPendingOwnerId}
                label="Owner"
                helperText="Changing owner transfers management of this task (separate from assignees)."
              />
            )}

            {!isEditing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                <Paperclip className="h-4 w-4 flex-shrink-0" />
                <span>You can add file attachments after creating the task.</span>
              </div>
            )}
            </DialogBody>

            <DialogFooter className="border-t border-border -mx-4 px-4 sm:-mx-6 sm:px-6">
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
