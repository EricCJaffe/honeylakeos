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
import { useWfWorkflowStepMutations, type WfWorkflowStep } from "@/hooks/useWorkflows";

const stepTypes = [
  { value: "form_step", label: "Fill Form" },
  { value: "approval_step", label: "Approval" },
  { value: "task_step", label: "Create Task" },
  { value: "project_step", label: "Create Project" },
  { value: "calendar_step", label: "Schedule Event" },
  { value: "document_step", label: "Create Document" },
  { value: "note_step", label: "Create Note" },
  { value: "notify_step", label: "Send Notification" },
  { value: "assign_lms_step", label: "Assign Learning" },
  { value: "support_ticket_step", label: "Create Support Ticket" },
] as const;

const assigneeTypes = [
  { value: "workflow_initiator", label: "Workflow Initiator" },
  { value: "user", label: "Specific User" },
  { value: "employee", label: "Target Employee" },
  { value: "group", label: "Group Members" },
  { value: "company_admin", label: "Company Admin" },
] as const;

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  instructions: z.string().optional(),
  step_type: z.enum([
    "form_step",
    "approval_step",
    "task_step",
    "project_step",
    "calendar_step",
    "document_step",
    "note_step",
    "notify_step",
    "assign_lms_step",
    "support_ticket_step",
  ]),
  assignee_type: z.enum([
    "user",
    "employee",
    "group",
    "company_admin",
    "workflow_initiator",
  ]).optional(),
  due_days_offset: z.number().optional(),
  enabled: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface WorkflowStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  step?: WfWorkflowStep | null;
}

export function WorkflowStepDialog({
  open,
  onOpenChange,
  workflowId,
  step,
}: WorkflowStepDialogProps) {
  const { createStep, updateStep } = useWfWorkflowStepMutations(workflowId);
  const isEditing = !!step;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      instructions: "",
      step_type: "task_step",
      assignee_type: "workflow_initiator",
      due_days_offset: undefined,
      enabled: true,
    },
  });

  useEffect(() => {
    if (step) {
      form.reset({
        title: step.title,
        instructions: step.instructions ?? "",
        step_type: step.step_type as FormValues["step_type"],
        assignee_type: step.assignee_type as FormValues["assignee_type"],
        due_days_offset: step.due_days_offset ?? undefined,
        enabled: step.enabled,
      });
    } else {
      form.reset({
        title: "",
        instructions: "",
        step_type: "task_step",
        assignee_type: "workflow_initiator",
        due_days_offset: undefined,
        enabled: true,
      });
    }
  }, [step, form]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      title: values.title,
      instructions: values.instructions ?? null,
      step_type: values.step_type,
      assignee_type: values.assignee_type,
      due_days_offset: values.due_days_offset ?? null,
      enabled: values.enabled,
    };
    if (isEditing && step) {
      await updateStep.mutateAsync({ id: step.id, ...payload });
    } else {
      await createStep.mutateAsync(payload);
    }
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Step" : "Add Step"}</DialogTitle>
          <DialogDescription>
            Configure this workflow step.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Complete IT Setup" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="step_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Step Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select step type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stepTypes.map((type) => (
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

            <FormField
              control={form.control}
              name="assignee_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignee</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assigneeTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Who should complete this step.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide detailed instructions for this step..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="due_days_offset"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Days Offset</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="3"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Days from workflow start until this step is due.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Enabled</FormLabel>
                    <FormDescription>Include this step in the workflow.</FormDescription>
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
                disabled={createStep.isPending || updateStep.isPending}
              >
                {createStep.isPending || updateStep.isPending
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Add Step"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
