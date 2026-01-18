import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, AlertTriangle } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  name: z.string().min(1, "Project name is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface DuplicateOptions {
  phases: boolean;
  tasks: boolean;
  taskPhases: boolean;
  notes: boolean;
  documents: boolean;
  members: boolean;
}

interface DuplicateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: string;
    name: string;
    description?: string | null;
    emoji?: string | null;
    color?: string | null;
    status?: string | null;
  };
}

export function DuplicateProjectDialog({
  open,
  onOpenChange,
  project,
}: DuplicateProjectDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skippedItems, setSkippedItems] = useState<string[]>([]);
  
  const [options, setOptions] = useState<DuplicateOptions>({
    phases: true,
    tasks: true,
    taskPhases: true,
    notes: true,
    documents: true,
    members: true,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: `Copy of ${project.name}`,
    },
  });

  const toggleOption = (key: keyof DuplicateOptions) => {
    setOptions((prev) => {
      const newOptions = { ...prev, [key]: !prev[key] };
      // If disabling tasks, also disable task phases
      if (key === "tasks" && !newOptions.tasks) {
        newOptions.taskPhases = false;
      }
      // If disabling phases, also disable task phases
      if (key === "phases" && !newOptions.phases) {
        newOptions.taskPhases = false;
      }
      return newOptions;
    });
  };

  const onSubmit = async (values: FormValues) => {
    if (!activeCompanyId || !user) return;
    
    setIsSubmitting(true);
    setSkippedItems([]);
    const skipped: string[] = [];

    try {
      // 1. Create the new project
      const { data: newProject, error: projectError } = await supabase
        .from("projects")
        .insert({
          company_id: activeCompanyId,
          name: values.name,
          description: project.description,
          emoji: project.emoji || "📁",
          color: project.color,
          status: "active", // Always start as active
          owner_user_id: user.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      const newProjectId = newProject.id;
      const phaseIdMap = new Map<string, string>(); // old phase id -> new phase id

      // 2. Duplicate phases if selected
      if (options.phases) {
        const { data: sourcePhases, error: phasesError } = await supabase
          .from("project_phases")
          .select("*")
          .eq("project_id", project.id)
          .order("sort_order");

        if (phasesError) throw phasesError;

        for (const phase of sourcePhases || []) {
          const { data: newPhase, error: newPhaseError } = await supabase
            .from("project_phases")
            .insert({
              company_id: activeCompanyId,
              project_id: newProjectId,
              name: phase.name,
              sort_order: phase.sort_order,
              status: "pending",
              created_by: user.id,
            })
            .select()
            .single();

          if (newPhaseError) {
            skipped.push(`Phase: ${phase.name}`);
          } else {
            phaseIdMap.set(phase.id, newPhase.id);
          }
        }
      }

      // 3. Duplicate tasks if selected
      if (options.tasks) {
        const { data: sourceTasks, error: tasksError } = await supabase
          .from("tasks")
          .select("*")
          .eq("project_id", project.id)
          .order("order_index");

        if (tasksError) throw tasksError;

        for (const task of sourceTasks || []) {
          // Map phase ID if phases were duplicated and task phase mapping is enabled
          let newPhaseId = null;
          if (options.phases && options.taskPhases && task.phase_id) {
            newPhaseId = phaseIdMap.get(task.phase_id) || null;
          }

          const { error: newTaskError } = await supabase
            .from("tasks")
            .insert({
              company_id: activeCompanyId,
              project_id: newProjectId,
              title: task.title,
              description: task.description,
              status: "todo", // Reset status to todo
              priority: task.priority,
              phase_id: newPhaseId,
              order_index: task.order_index,
              created_by: user.id,
              // Don't copy due_date by default - dates are not copied
            });

          if (newTaskError) {
            skipped.push(`Task: ${task.title}`);
          }
        }
      }

      // 4. Duplicate notes if selected
      if (options.notes) {
        const { data: sourceNotes, error: notesError } = await supabase
          .from("notes")
          .select("*")
          .eq("project_id", project.id);

        if (notesError) throw notesError;

        for (const note of sourceNotes || []) {
          const { error: newNoteError } = await supabase
            .from("notes")
            .insert({
              company_id: activeCompanyId,
              project_id: newProjectId,
              title: `${note.title}`,
              content: note.content,
              color: note.color,
              is_pinned: false, // Reset pinned status
              created_by: user.id,
            });

          if (newNoteError) {
            skipped.push(`Note: ${note.title}`);
          }
        }
      }

      // 5. Duplicate documents metadata if selected (not the actual files)
      if (options.documents) {
        const { data: sourceDocs, error: docsError } = await supabase
          .from("documents")
          .select("*")
          .eq("project_id", project.id);

        if (docsError) throw docsError;

        for (const doc of sourceDocs || []) {
          const { error: newDocError } = await supabase
            .from("documents")
            .insert({
              company_id: activeCompanyId,
              project_id: newProjectId,
              name: doc.name,
              description: doc.description,
              file_path: doc.file_path, // Same file reference
              file_size: doc.file_size,
              mime_type: doc.mime_type,
              access_level: doc.access_level,
              created_by: user.id,
            });

          if (newDocError) {
            skipped.push(`Document: ${doc.name}`);
          }
        }
      }

      // 6. Duplicate project members if selected
      if (options.members) {
        const { data: sourceMembers, error: membersError } = await supabase
          .from("project_members")
          .select("*")
          .eq("project_id", project.id);

        if (membersError) throw membersError;

        for (const member of sourceMembers || []) {
          // Skip the current user as they're already the owner
          if (member.user_id === user.id) continue;

          const { error: newMemberError } = await supabase
            .from("project_members")
            .insert({
              project_id: newProjectId,
              user_id: member.user_id,
              role: member.role,
            });

          if (newMemberError) {
            skipped.push(`Member: ${member.user_id}`);
          }
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-phases"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });

      if (skipped.length > 0) {
        setSkippedItems(skipped);
        toast.warning(
          `Project duplicated with ${skipped.length} items skipped due to permissions.`
        );
      } else {
        toast.success("Project duplicated successfully");
        onOpenChange(false);
        navigate(`/app/projects/${newProjectId}`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to duplicate project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSkippedItems([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicate Project</DialogTitle>
          <DialogDescription>
            Create a copy of this project with selected items.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter project name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 border rounded-lg p-4">
              <p className="text-sm font-medium">Include in copy:</p>
              
              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="phases"
                    checked={options.phases}
                    onCheckedChange={() => toggleOption("phases")}
                  />
                  <Label htmlFor="phases" className="text-sm">Phases</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tasks"
                    checked={options.tasks}
                    onCheckedChange={() => toggleOption("tasks")}
                  />
                  <Label htmlFor="tasks" className="text-sm">Tasks (reset to "todo" status)</Label>
                </div>

                <div className="flex items-center space-x-2 pl-6">
                  <Checkbox
                    id="taskPhases"
                    checked={options.taskPhases}
                    onCheckedChange={() => toggleOption("taskPhases")}
                    disabled={!options.tasks || !options.phases}
                  />
                  <Label 
                    htmlFor="taskPhases" 
                    className={`text-sm ${(!options.tasks || !options.phases) ? "text-muted-foreground" : ""}`}
                  >
                    Preserve task-phase assignments
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notes"
                    checked={options.notes}
                    onCheckedChange={() => toggleOption("notes")}
                  />
                  <Label htmlFor="notes" className="text-sm">Notes</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="documents"
                    checked={options.documents}
                    onCheckedChange={() => toggleOption("documents")}
                  />
                  <Label htmlFor="documents" className="text-sm">Documents</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="members"
                    checked={options.members}
                    onCheckedChange={() => toggleOption("members")}
                  />
                  <Label htmlFor="members" className="text-sm">Team members</Label>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                Dates are cleared. Audit logs and activity history are not copied.
              </p>
            </div>

            {skippedItems.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">Some items were not duplicated:</p>
                  <ul className="text-xs list-disc list-inside max-h-24 overflow-y-auto">
                    {skippedItems.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Duplicate Project
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
