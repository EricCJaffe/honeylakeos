import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useProjectTemplateMutations } from "@/hooks/useProjectTemplates";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActiveCompany } from "@/hooks/useActiveCompany";

const formSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: string;
    name: string;
    description?: string | null;
    emoji?: string | null;
    color?: string | null;
  };
}

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  project,
}: SaveAsTemplateDialogProps) {
  const { activeCompanyId } = useActiveCompany();
  const { createTemplate } = useProjectTemplateMutations();
  const { data: phases = [] } = useProjectPhases(project.id);
  const [includeTasks, setIncludeTasks] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: `Template - ${project.name}`,
      description: project.description || "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!activeCompanyId) return;
    
    setIsSubmitting(true);
    try {
      // Fetch project tasks if including them
      let taskBlueprints: Array<{
        title: string;
        description: string | null;
        default_phase_name: string | null;
        priority: string | null;
        sort_order: number;
        relative_due_days: number | null;
        is_milestone: boolean;
      }> = [];

      if (includeTasks) {
        const { data: tasks, error: tasksError } = await supabase
          .from("tasks")
          .select("title, description, phase_id, priority, order_index")
          .eq("project_id", project.id)
          .order("order_index");

        if (tasksError) throw tasksError;

        // Map tasks to blueprints with phase names instead of IDs
        taskBlueprints = (tasks || []).map((task, index) => {
          const phase = phases.find((p) => p.id === task.phase_id);
          return {
            title: task.title,
            description: task.description || null,
            default_phase_name: phase?.name || null,
            priority: task.priority || "medium",
            sort_order: index,
            relative_due_days: null, // Don't copy actual dates, use relative if needed
            is_milestone: false,
          };
        });
      }

      // Create template with phases (always included)
      await createTemplate.mutateAsync({
        name: values.name,
        description: values.description,
        emoji: project.emoji || "📋",
        color: project.color || "#2563eb",
        phases: phases.map((p, index) => ({
          name: p.name,
          sort_order: index,
          color: null,
          description: null,
        })),
        tasks: taskBlueprints,
      });

      toast.success("Template created successfully");
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to create template");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Create a reusable template from this project's structure.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter template name" {...field} />
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
                      placeholder="What is this template for?"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 border rounded-lg p-4">
              <p className="text-sm font-medium">Include in template:</p>
              
              <div className="flex items-center space-x-2">
                <Checkbox id="phases" checked disabled />
                <Label htmlFor="phases" className="text-sm text-muted-foreground">
                  Phases ({phases.length}) - Always included
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tasks"
                  checked={includeTasks}
                  onCheckedChange={(checked) => setIncludeTasks(!!checked)}
                />
                <Label htmlFor="tasks" className="text-sm">
                  Tasks as blueprints (title, description, phase mapping)
                </Label>
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                Note: Comments, attachments, and activity history are not included
                in templates to keep them clean and reusable.
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Template
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
