import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export interface ProjectPhase {
  id: string;
  company_id: string;
  project_id: string;
  name: string;
  sort_order: number;
  status: string;
  created_at: string;
  created_by: string | null;
}

export interface PhaseTemplate {
  id: string;
  company_id: string;
  name: string;
  phases: { name: string; sort_order: number }[];
  created_at: string;
  created_by: string | null;
}

export function useProjectPhases(projectId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["project-phases", projectId],
    queryFn: async () => {
      if (!projectId || !activeCompanyId) return [];
      const { data, error } = await supabase
        .from("project_phases")
        .select("*")
        .eq("project_id", projectId)
        .eq("company_id", activeCompanyId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data || []) as ProjectPhase[];
    },
    enabled: !!projectId && !!activeCompanyId,
  });
}

export function usePhaseTemplates() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["phase-templates", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("project_phase_templates")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("name");

      if (error) throw error;
      return (data || []).map((t) => ({
        ...t,
        phases: Array.isArray(t.phases) ? t.phases : [],
      })) as PhaseTemplate[];
    },
    enabled: !!activeCompanyId,
  });
}

export function usePhaseMutations(projectId: string | undefined) {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createPhase = useMutation({
    mutationFn: async ({ name, sortOrder }: { name: string; sortOrder: number }) => {
      if (!projectId || !activeCompanyId || !user) throw new Error("Missing context");
      const { error } = await supabase.from("project_phases").insert({
        company_id: activeCompanyId,
        project_id: projectId,
        name,
        sort_order: sortOrder,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-phases", projectId] });
      toast.success("Phase created");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create phase");
    },
  });

  const updatePhase = useMutation({
    mutationFn: async ({ id, name, sortOrder, status }: { id: string; name?: string; sortOrder?: number; status?: string }) => {
      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (sortOrder !== undefined) updates.sort_order = sortOrder;
      if (status !== undefined) updates.status = status;

      const { error } = await supabase
        .from("project_phases")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-phases", projectId] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update phase");
    },
  });

  const deletePhase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_phases")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-phases", projectId] });
      toast.success("Phase deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete phase");
    },
  });

  const reorderPhases = useMutation({
    mutationFn: async (phases: { id: string; sort_order: number }[]) => {
      // Update each phase's sort_order
      const updates = phases.map((p) =>
        supabase
          .from("project_phases")
          .update({ sort_order: p.sort_order })
          .eq("id", p.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-phases", projectId] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reorder phases");
    },
  });

  const applyTemplate = useMutation({
    mutationFn: async (template: PhaseTemplate) => {
      if (!projectId || !activeCompanyId || !user) throw new Error("Missing context");

      const phasesToInsert = template.phases.map((p) => ({
        company_id: activeCompanyId,
        project_id: projectId,
        name: p.name,
        sort_order: p.sort_order,
        created_by: user.id,
      }));

      if (phasesToInsert.length > 0) {
        const { error } = await supabase.from("project_phases").insert(phasesToInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-phases", projectId] });
      toast.success("Template phases applied");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to apply template");
    },
  });

  return {
    createPhase,
    updatePhase,
    deletePhase,
    reorderPhases,
    applyTemplate,
  };
}

export function usePhaseTemplateMutations() {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createTemplate = useMutation({
    mutationFn: async ({ name, phases }: { name: string; phases: { name: string; sort_order: number }[] }) => {
      if (!activeCompanyId || !user) throw new Error("Missing context");
      const { error } = await supabase.from("project_phase_templates").insert({
        company_id: activeCompanyId,
        name,
        phases,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase-templates"] });
      toast.success("Template created");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create template");
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_phase_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phase-templates"] });
      toast.success("Template deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete template");
    },
  });

  return { createTemplate, deleteTemplate };
}
