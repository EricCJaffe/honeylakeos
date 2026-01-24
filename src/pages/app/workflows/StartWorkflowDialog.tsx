import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Play, Users } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWfRunMutations } from "@/hooks/useWorkflows";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuditLog } from "@/hooks/useAuditLog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const formSchema = z.object({
  targetEmployeeId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface StartWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  workflowTitle: string;
  onSuccess?: () => void;
}

export function StartWorkflowDialog({
  open,
  onOpenChange,
  workflowId,
  workflowTitle,
  onSuccess,
}: StartWorkflowDialogProps) {
  const { activeCompanyId } = useActiveCompany();
  const { startWorkflow } = useWfRunMutations();
  const { log } = useAuditLog();

  // Fetch employees for target selection
  const { data: employees } = useQuery({
    queryKey: ["employees", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, email")
        .eq("company_id", activeCompanyId)
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: open && !!activeCompanyId,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetEmployeeId: undefined,
    },
  });

  const onSubmit = async (values: FormValues) => {
    const result = await startWorkflow.mutateAsync({
      workflowId,
      targetEmployeeId: values.targetEmployeeId || undefined,
    });

    await log("workflow.run_started", "workflow_run", result.id, {
      workflow_id: workflowId,
      target_employee_id: values.targetEmployeeId,
    });

    form.reset();
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Start Workflow
          </DialogTitle>
          <DialogDescription>
            Start a new run of <strong>{workflowTitle}</strong>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {employees && employees.length > 0 && (
              <FormField
                control={form.control}
                name="targetEmployeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Employee (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an employee..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.full_name}
                            {emp.email && (
                              <span className="text-muted-foreground ml-2">
                                ({emp.email})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select an employee if this workflow is for onboarding/offboarding.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Starting this workflow will create a new run and assign steps to the
                designated users. They will see tasks in their "My Work" inbox.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={startWorkflow.isPending}>
                {startWorkflow.isPending ? "Starting..." : "Start Workflow"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
