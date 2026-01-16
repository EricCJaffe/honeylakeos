import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Layers, ListTodo } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useProjectTemplateDetails,
  useProjectTemplateMutations,
  ProjectTemplate,
} from "@/hooks/useProjectTemplates";

const formSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  start_date: z.date().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateFromTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ProjectTemplate | null;
  onSuccess?: (projectId: string) => void;
}

export function CreateFromTemplateDialog({
  open,
  onOpenChange,
  template,
  onSuccess,
}: CreateFromTemplateDialogProps) {
  const { data: details } = useProjectTemplateDetails(template?.id);
  const { createFromTemplate } = useProjectTemplateMutations();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      start_date: null,
    },
  });

  React.useEffect(() => {
    if (open && template) {
      form.reset({
        name: "",
        start_date: new Date(),
      });
    }
  }, [open, template, form]);

  const onSubmit = async (values: FormValues) => {
    if (!template) return;

    const result = await createFromTemplate.mutateAsync({
      templateId: template.id,
      projectName: values.name,
      startDate: values.start_date || undefined,
    });

    onOpenChange(false);
    if (onSuccess && result.project_id) {
      onSuccess(result.project_id);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{template.emoji}</span>
            Create Project from Template
          </DialogTitle>
          <DialogDescription>
            Using template: <strong>{template.name}</strong>
          </DialogDescription>
        </DialogHeader>

        {details && (
          <div className="flex items-center gap-3 py-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {details.phases.length} phases
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <ListTodo className="h-3 w-3" />
              {details.tasks.length} tasks
            </Badge>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My New Project" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
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
                  <FormDescription>
                    Task due dates will be calculated relative to this date.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createFromTemplate.isPending}>
                {createFromTemplate.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
