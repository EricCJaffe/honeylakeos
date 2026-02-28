import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { toast } from "sonner";

// Types
export type FrameworkOwnerType = "system" | "company" | string;
export type FrameworkStatus = "draft" | "published" | "archived";
export type FrameworkFrequencyType = "weekly" | "monthly" | "quarterly" | "annual" | "custom";
export type FrameworkMetricType = "percentage" | "count" | "trend" | "boolean";
export type FrameworkDashboardAudience = "company_admin" | "leadership" | "member" | string;

export interface Framework {
  id: string;
  company_id: string | null;
  owner_type: FrameworkOwnerType;
  owner_company_id: string | null;
  name: string;
  description: string | null;
  version_label: string | null;
  status: FrameworkStatus;
  is_system_template: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface FrameworkConcept {
  id: string;
  framework_id: string;
  key: string;
  display_name_singular: string;
  display_name_plural: string;
  description: string | null;
  sort_order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface FrameworkCadence {
  id: string;
  framework_id: string;
  key: string;
  display_name: string;
  frequency_type: FrameworkFrequencyType;
  interval_n: number | null;
  target_day_of_week: number | null;
  target_day_of_month: number | null;
  duration_minutes: number | null;
  default_owner_role_hint: string | null;
  sort_order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface FrameworkTemplate {
  id: string;
  framework_id: string;
  template_type: string;
  template_id: string | null;
  applies_to_concept_key: string | null;
  cadence_key: string | null;
  sort_order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface FrameworkDashboard {
  id: string;
  framework_id: string;
  key: string;
  display_name: string;
  audience: FrameworkDashboardAudience;
  sort_order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface FrameworkDashboardSection {
  id: string;
  dashboard_id: string;
  section_key: string;
  display_name: string;
  data_source_type: string;
  config: Record<string, unknown>;
  sort_order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface FrameworkHealthMetric {
  id: string;
  framework_id: string;
  key: string;
  display_name: string;
  description: string | null;
  metric_type: FrameworkMetricType;
  data_source_type: string;
  calculation_key: string;
  thresholds: { green?: number | null; yellow?: number | null; red?: number | null };
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CompanyFramework {
  company_id: string;
  active_framework_id: string;
  adopted_at: string;
  adopted_by: string | null;
}

// Hook for listing frameworks (system templates + company-owned)
export function useFrameworks() {
  const { activeCompanyId: companyId } = useActiveCompany();

  return useQuery({
    queryKey: ["frameworks", companyId],
    queryFn: async () => {
      // Fetch system templates
      const { data: systemTemplates, error: systemError } = await supabase
        .from("frameworks")
        .select("*")
        .eq("is_system_template", true)
        .eq("status", "published");

      if (systemError) throw systemError;

      // Fetch company frameworks if we have a company
      let companyFrameworks: Framework[] = [];
      if (companyId) {
        const { data, error } = await supabase
          .from("frameworks")
          .select("*")
          .eq("company_id", companyId)
          .is("archived_at", null);

        if (error) throw error;
        companyFrameworks = (data || []) as Framework[];
      }

      return {
        systemTemplates: (systemTemplates || []) as Framework[],
        companyFrameworks,
      };
    },
    enabled: true,
  });
}

// Hook for getting a single framework with all components
export function useFramework(frameworkId: string | null) {
  return useQuery({
    queryKey: ["framework", frameworkId],
    queryFn: async () => {
      if (!frameworkId) return null;

      const { data: framework, error: frameworkError } = await supabase
        .from("frameworks")
        .select("*")
        .eq("id", frameworkId)
        .single();

      if (frameworkError) throw frameworkError;

      // Fetch all components in parallel
      const [concepts, cadences, templates, dashboards, metrics] = await Promise.all([
        supabase
          .from("framework_concepts")
          .select("*")
          .eq("framework_id", frameworkId)
          .order("sort_order"),
        supabase
          .from("framework_cadences")
          .select("*")
          .eq("framework_id", frameworkId)
          .order("sort_order"),
        supabase
          .from("framework_templates")
          .select("*")
          .eq("framework_id", frameworkId)
          .order("sort_order"),
        supabase
          .from("framework_dashboards")
          .select("*")
          .eq("framework_id", frameworkId)
          .order("sort_order"),
        supabase
          .from("framework_health_metrics")
          .select("*")
          .eq("framework_id", frameworkId)
          .order("sort_order"),
      ]);

      // Fetch dashboard sections for each dashboard
      const dashboardIds = (dashboards.data || []).map((d) => d.id);
      let sections: FrameworkDashboardSection[] = [];
      if (dashboardIds.length > 0) {
        const { data: sectionsData } = await supabase
          .from("framework_dashboard_sections")
          .select("*")
          .in("dashboard_id", dashboardIds)
          .order("sort_order");
        sections = (sectionsData || []) as FrameworkDashboardSection[];
      }

      return {
        framework: framework as Framework,
        concepts: (concepts.data || []) as FrameworkConcept[],
        cadences: (cadences.data || []) as FrameworkCadence[],
        templates: (templates.data || []) as FrameworkTemplate[],
        dashboards: (dashboards.data || []) as FrameworkDashboard[],
        dashboardSections: sections,
        metrics: (metrics.data || []) as FrameworkHealthMetric[],
      };
    },
    enabled: !!frameworkId,
  });
}

// Hook for company's active framework
export function useCompanyActiveFramework() {
  const { activeCompanyId: companyId } = useActiveCompany();

  return useQuery({
    queryKey: ["company-active-framework", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from("company_frameworks")
        .select(`
          *,
          framework:frameworks(*)
        `)
        .eq("company_id", companyId)
        .maybeSingle();

      if (error) throw error;
      return data as (CompanyFramework & { framework: Framework }) | null;
    },
    enabled: !!companyId,
  });
}

// Framework mutations
export function useFrameworkMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId: companyId } = useActiveCompany();

  const cloneFramework = useMutation({
    mutationFn: async ({
      sourceFrameworkId,
      newName,
      newDescription,
    }: {
      sourceFrameworkId: string;
      newName: string;
      newDescription?: string;
    }) => {
      if (!companyId) throw new Error("No company selected");

      const { data, error } = await supabase.rpc("clone_framework", {
        p_source_framework_id: sourceFrameworkId,
        p_target_company_id: companyId,
        p_new_name: newName,
        p_new_description: newDescription || null,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["frameworks"] });
      toast.success("Framework cloned successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to clone framework: ${error.message}`);
    },
  });

  const adoptFramework = useMutation({
    mutationFn: async (frameworkId: string) => {
      if (!companyId) throw new Error("No company selected");

      const { data, error } = await supabase
        .from("company_frameworks")
        .upsert({
          company_id: companyId,
          active_framework_id: frameworkId,
          adopted_at: new Date().toISOString(),
          adopted_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-active-framework"] });
      toast.success("Framework adopted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to adopt framework: ${error.message}`);
    },
  });

  const updateFramework = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<Framework, "id" | "created_at" | "updated_at">>;
    }) => {
      const { data, error } = await supabase
        .from("frameworks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Framework;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["framework", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["frameworks"] });
      toast.success("Framework updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update framework: ${error.message}`);
    },
  });

  const deleteFramework = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("frameworks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["frameworks"] });
      toast.success("Framework deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete framework: ${error.message}`);
    },
  });

  return {
    cloneFramework,
    adoptFramework,
    updateFramework,
    deleteFramework,
  };
}

// Concept mutations
export function useConceptMutations() {
  const queryClient = useQueryClient();

  const createConcept = useMutation({
    mutationFn: async (concept: Omit<FrameworkConcept, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("framework_concepts")
        .insert(concept)
        .select()
        .single();

      if (error) throw error;
      return data as FrameworkConcept;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["framework", variables.framework_id] });
      toast.success("Concept created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create concept: ${error.message}`);
    },
  });

  const updateConcept = useMutation({
    mutationFn: async ({
      id,
      frameworkId,
      updates,
    }: {
      id: string;
      frameworkId: string;
      updates: Partial<Omit<FrameworkConcept, "id" | "created_at" | "updated_at">>;
    }) => {
      const { data, error } = await supabase
        .from("framework_concepts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as FrameworkConcept;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["framework", variables.frameworkId] });
      toast.success("Concept updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update concept: ${error.message}`);
    },
  });

  const deleteConcept = useMutation({
    mutationFn: async ({ id, frameworkId }: { id: string; frameworkId: string }) => {
      const { error } = await supabase.from("framework_concepts").delete().eq("id", id);
      if (error) throw error;
      return frameworkId;
    },
    onSuccess: (frameworkId) => {
      queryClient.invalidateQueries({ queryKey: ["framework", frameworkId] });
      toast.success("Concept deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete concept: ${error.message}`);
    },
  });

  return { createConcept, updateConcept, deleteConcept };
}

// Cadence mutations
export function useCadenceMutations() {
  const queryClient = useQueryClient();

  const createCadence = useMutation({
    mutationFn: async (cadence: Omit<FrameworkCadence, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("framework_cadences")
        .insert(cadence)
        .select()
        .single();

      if (error) throw error;
      return data as FrameworkCadence;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["framework", variables.framework_id] });
      toast.success("Cadence created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create cadence: ${error.message}`);
    },
  });

  const updateCadence = useMutation({
    mutationFn: async ({
      id,
      frameworkId,
      updates,
    }: {
      id: string;
      frameworkId: string;
      updates: Partial<Omit<FrameworkCadence, "id" | "created_at" | "updated_at">>;
    }) => {
      const { data, error } = await supabase
        .from("framework_cadences")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as FrameworkCadence;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["framework", variables.frameworkId] });
      toast.success("Cadence updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update cadence: ${error.message}`);
    },
  });

  const deleteCadence = useMutation({
    mutationFn: async ({ id, frameworkId }: { id: string; frameworkId: string }) => {
      const { error } = await supabase.from("framework_cadences").delete().eq("id", id);
      if (error) throw error;
      return frameworkId;
    },
    onSuccess: (frameworkId) => {
      queryClient.invalidateQueries({ queryKey: ["framework", frameworkId] });
      toast.success("Cadence deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete cadence: ${error.message}`);
    },
  });

  return { createCadence, updateCadence, deleteCadence };
}

// Dashboard mutations
export function useDashboardMutations() {
  const queryClient = useQueryClient();

  const createDashboard = useMutation({
    mutationFn: async (dashboard: Omit<FrameworkDashboard, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("framework_dashboards")
        .insert(dashboard)
        .select()
        .single();

      if (error) throw error;
      return data as FrameworkDashboard;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["framework", variables.framework_id] });
      toast.success("Dashboard created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create dashboard: ${error.message}`);
    },
  });

  const updateDashboard = useMutation({
    mutationFn: async ({
      id,
      frameworkId,
      updates,
    }: {
      id: string;
      frameworkId: string;
      updates: Partial<Omit<FrameworkDashboard, "id" | "created_at" | "updated_at">>;
    }) => {
      const { data, error } = await supabase
        .from("framework_dashboards")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as FrameworkDashboard;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["framework", variables.frameworkId] });
      toast.success("Dashboard updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update dashboard: ${error.message}`);
    },
  });

  const deleteDashboard = useMutation({
    mutationFn: async ({ id, frameworkId }: { id: string; frameworkId: string }) => {
      const { error } = await supabase.from("framework_dashboards").delete().eq("id", id);
      if (error) throw error;
      return frameworkId;
    },
    onSuccess: (frameworkId) => {
      queryClient.invalidateQueries({ queryKey: ["framework", frameworkId] });
      toast.success("Dashboard deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete dashboard: ${error.message}`);
    },
  });

  return { createDashboard, updateDashboard, deleteDashboard };
}

// Health metric mutations
export function useHealthMetricMutations() {
  const queryClient = useQueryClient();

  const createMetric = useMutation({
    mutationFn: async (metric: Omit<FrameworkHealthMetric, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("framework_health_metrics")
        .insert(metric)
        .select()
        .single();

      if (error) throw error;
      return data as FrameworkHealthMetric;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["framework", variables.framework_id] });
      toast.success("Health metric created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create metric: ${error.message}`);
    },
  });

  const updateMetric = useMutation({
    mutationFn: async ({
      id,
      frameworkId,
      updates,
    }: {
      id: string;
      frameworkId: string;
      updates: Partial<Omit<FrameworkHealthMetric, "id" | "created_at" | "updated_at">>;
    }) => {
      const { data, error } = await supabase
        .from("framework_health_metrics")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as FrameworkHealthMetric;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["framework", variables.frameworkId] });
      toast.success("Health metric updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update metric: ${error.message}`);
    },
  });

  const deleteMetric = useMutation({
    mutationFn: async ({ id, frameworkId }: { id: string; frameworkId: string }) => {
      const { error } = await supabase.from("framework_health_metrics").delete().eq("id", id);
      if (error) throw error;
      return frameworkId;
    },
    onSuccess: (frameworkId) => {
      queryClient.invalidateQueries({ queryKey: ["framework", frameworkId] });
      toast.success("Health metric deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete metric: ${error.message}`);
    },
  });

  return { createMetric, updateMetric, deleteMetric };
}
