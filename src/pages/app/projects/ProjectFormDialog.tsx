import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { usePhaseTemplates } from "@/hooks/useProjectPhases";
import { TemplateSelector } from "@/components/templates/TemplateSelector";
import { applyTemplateToForm, Template } from "@/hooks/useTemplates";

const projectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.string().default("active"),
  emoji: z.string().default("📋"),
  color: z.string().default("#2563eb"),
  phase_template_id: z.string().optional().nullable(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Tables<"projects"> | null;
}

const emojis = ["📋", "🚀", "💡", "🎯", "📊", "🔧", "📝", "⭐", "🏆", "🎨"];
const statuses = [
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: ProjectFormDialogProps) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!project;

  // Fetch phase templates for new project creation
  const { data: phaseTemplates = [] } = usePhaseTemplates();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "active",
      emoji: "📋",
      color: "#2563eb",
      phase_template_id: null,
    },
  });

  React.useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description || "",
        status: project.status,
        emoji: project.emoji,
        color: project.color,
        phase_template_id: null,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        status: "active",
        emoji: "📋",
        color: "#2563eb",
        phase_template_id: null,
      });
    }
  }, [project, form]);

  const mutation = useMutation({
    mutationFn: async (values: ProjectFormValues) => {
      if (!activeCompanyId || !user) throw new Error("Missing context");

      if (isEditing && project) {
        const { error } = await supabase
          .from("projects")
          .update({
            name: values.name,
            description: values.description || null,
            status: values.status,
            emoji: values.emoji,
            color: values.color,
          })
          .eq("id", project.id);
        if (error) throw error;
      } else {
        // Create project
        const { data: newProject, error } = await supabase
          .from("projects")
          .insert({
            company_id: activeCompanyId,
            owner_user_id: user.id,
            name: values.name,
            description: values.description || null,
            status: values.status,
            emoji: values.emoji,
            color: values.color,
            created_by: user.id,
          })
          .select()
          .single();
        if (error) throw error;

        // If a phase template is selected, create phases from it
        if (values.phase_template_id && newProject) {
          const template = phaseTemplates.find((t) => t.id === values.phase_template_id);
          if (template && Array.isArray(template.phases) && template.phases.length > 0) {
            const phasesToInsert = template.phases.map((p: { name: string; sort_order: number }) => ({
              company_id: activeCompanyId,
              project_id: newProject.id,
              name: p.name,
              sort_order: p.sort_order,
              created_by: user.id,
            }));

            const { error: phaseError } = await supabase
              .from("project_phases")
              .insert(phasesToInsert);
            if (phaseError) {
              console.error("Failed to create phases:", phaseError);
              // Don't throw - project is already created
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-phases"] });
      toast.success(isEditing ? "Project updated" : "Project created");
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || "Something went wrong");
    },
  });

  const onSubmit = (values: ProjectFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Project" : "New Project"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Template Selector - only for new projects */}
            {!isEditing && (
              <TemplateSelector
                templateType="project"
                hasExistingData={!!form.watch("name") || !!form.watch("description")}
                onSelect={(template, overwrite) => {
                  const payload = template.payload as Record<string, any>;
                  const currentValues = form.getValues();
                  const newValues = applyTemplateToForm(currentValues, payload, overwrite);
                  form.reset(newValues);
                }}
              />
            )}

            <div className="flex gap-3">
              <FormField
                control={form.control}
                name="emoji"
                render={({ field }) => (
                  <FormItem className="w-20">
                    <FormLabel>Icon</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Project name" {...field} />
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
                      placeholder="What is this project about?"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            {/* Phase Template - only for new projects */}
            {!isEditing && phaseTemplates.length > 0 && (
              <FormField
                control={form.control}
                name="phase_template_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phase Template</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select template (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {phaseTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} ({template.phases.length} phases)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Pre-populate project with phases from a template
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                  : "Create Project"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
