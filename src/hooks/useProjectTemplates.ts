import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export interface ProjectTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  emoji: string;
  color: string;
  status: string;
  created_by: string | null;
  created_at: string;
}

export interface ProjectTemplatePhase {
  id: string;
  template_id: string;
  name: string;
  sort_order: number;
  color: string | null;
  description: string | null;
}

export interface ProjectTemplateTask {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  default_phase_name: string | null;
  priority: string | null;
  sort_order: number;
  relative_due_days: number | null;
  is_milestone: boolean;
}

export interface ProjectTemplateWithDetails extends ProjectTemplate {
  phases: ProjectTemplatePhase[];
  tasks: ProjectTemplateTask[];
}

export function useProjectTemplates() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["project-templates", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("project_templates")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      return data as ProjectTemplate[];
    },
    enabled: !!activeCompanyId,
  });
}

export function useProjectTemplateDetails(templateId: string | undefined) {
  return useQuery({
    queryKey: ["project-template-details", templateId],
    queryFn: async () => {
      if (!templateId) return null;
      
      // Fetch template
      const { data: template, error: templateError } = await supabase
        .from("project_templates")
        .select("*")
        .eq("id", templateId)
        .single();
      
      if (templateError) throw templateError;
      
      // Fetch phases
      const { data: phases, error: phasesError } = await supabase
        .from("project_template_phases")
        .select("*")
        .eq("template_id", templateId)
        .order("sort_order");
      
      if (phasesError) throw phasesError;
      
      // Fetch tasks
      const { data: tasks, error: tasksError } = await supabase
        .from("project_template_tasks")
        .select("*")
        .eq("template_id", templateId)
        .order("sort_order");
      
      if (tasksError) throw tasksError;
      
      return {
        ...template,
        phases: phases || [],
        tasks: tasks || [],
      } as ProjectTemplateWithDetails;
    },
    enabled: !!templateId,
  });
}

export function useProjectTemplateMutations() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createTemplate = useMutation({
    mutationFn: async ({
      name,
      description,
      emoji,
      color,
      phases,
      tasks,
    }: {
      name: string;
      description?: string;
      emoji?: string;
      color?: string;
      phases: Omit<ProjectTemplatePhase, "id" | "template_id">[];
      tasks: Omit<ProjectTemplateTask, "id" | "template_id">[];
    }) => {
      if (!activeCompanyId || !user) throw new Error("Missing context");

      // Create template
      const { data: template, error: templateError } = await supabase
        .from("project_templates")
        .insert({
          company_id: activeCompanyId,
          name,
          description: description || null,
          emoji: emoji || "📋",
          color: color || "#2563eb",
          created_by: user.id,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Insert phases
      if (phases.length > 0) {
        const phasesToInsert = phases.map((p) => ({
          template_id: template.id,
          name: p.name,
          sort_order: p.sort_order,
          color: p.color || null,
          description: p.description || null,
        }));
        
        const { error: phasesError } = await supabase
          .from("project_template_phases")
          .insert(phasesToInsert);
        
        if (phasesError) throw phasesError;
      }

      // Insert tasks
      if (tasks.length > 0) {
        const tasksToInsert = tasks.map((t) => ({
          template_id: template.id,
          title: t.title,
          description: t.description || null,
          default_phase_name: t.default_phase_name || null,
          priority: t.priority || "medium",
          sort_order: t.sort_order,
          relative_due_days: t.relative_due_days || null,
          is_milestone: t.is_milestone || false,
        }));
        
        const { error: tasksError } = await supabase
          .from("project_template_tasks")
          .insert(tasksToInsert);
        
        if (tasksError) throw tasksError;
      }

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-templates"] });
      toast.success("Template created");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create template");
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      emoji,
      color,
      phases,
      tasks,
    }: {
      id: string;
      name?: string;
      description?: string;
      emoji?: string;
      color?: string;
      phases?: Omit<ProjectTemplatePhase, "id" | "template_id">[];
      tasks?: Omit<ProjectTemplateTask, "id" | "template_id">[];
    }) => {
      // Update template basics
      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (emoji !== undefined) updates.emoji = emoji;
      if (color !== undefined) updates.color = color;

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from("project_templates")
          .update(updates)
          .eq("id", id);
        if (error) throw error;
      }

      // Replace phases if provided
      if (phases !== undefined) {
        // Delete existing phases
        await supabase
          .from("project_template_phases")
          .delete()
          .eq("template_id", id);

        // Insert new phases
        if (phases.length > 0) {
          const phasesToInsert = phases.map((p) => ({
            template_id: id,
            name: p.name,
            sort_order: p.sort_order,
            color: p.color || null,
            description: p.description || null,
          }));
          
          const { error } = await supabase
            .from("project_template_phases")
            .insert(phasesToInsert);
          
          if (error) throw error;
        }
      }

      // Replace tasks if provided
      if (tasks !== undefined) {
        // Delete existing tasks
        await supabase
          .from("project_template_tasks")
          .delete()
          .eq("template_id", id);

        // Insert new tasks
        if (tasks.length > 0) {
          const tasksToInsert = tasks.map((t) => ({
            template_id: id,
            title: t.title,
            description: t.description || null,
            default_phase_name: t.default_phase_name || null,
            priority: t.priority || "medium",
            sort_order: t.sort_order,
            relative_due_days: t.relative_due_days || null,
            is_milestone: t.is_milestone || false,
          }));
          
          const { error } = await supabase
            .from("project_template_tasks")
            .insert(tasksToInsert);
          
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-templates"] });
      queryClient.invalidateQueries({ queryKey: ["project-template-details"] });
      toast.success("Template updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update template");
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-templates"] });
      toast.success("Template deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete template");
    },
  });

  const createFromTemplate = useMutation({
    mutationFn: async ({
      templateId,
      projectName,
      startDate,
    }: {
      templateId: string;
      projectName: string;
      startDate?: Date;
    }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data, error } = await supabase.rpc("create_project_from_template", {
        p_template_id: templateId,
        p_company_id: activeCompanyId,
        p_name: projectName,
        p_start_date: startDate ? startDate.toISOString().split("T")[0] : null,
      });

      if (error) throw error;
      return data as { project_id: string; phases_created: number; tasks_created: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-phases"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      toast.success(
        `Project created with ${data.phases_created} phases and ${data.tasks_created} tasks`
      );
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create project from template");
    },
  });

  return {
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createFromTemplate,
  };
}
