import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import type { Json } from "@/integrations/supabase/types";

type SOPVisibility = Database["public"]["Enums"]["sop_visibility"];

const parseProcedureSteps = (steps: Json | null): ProcedureStep[] => {
  if (!steps || !Array.isArray(steps)) return [];
  return steps as unknown as ProcedureStep[];
};

export interface ProcedureStep {
  id: string;
  order: number;
  title: string;
  description: string;
}

export interface SOP {
  id: string;
  company_id: string;
  department_id: string;
  title: string;
  purpose: string | null;
  scope: string | null;
  owner_role: string | null;
  tools_systems: string[];
  procedure_steps: ProcedureStep[];
  exceptions_notes: string | null;
  related_sop_ids: string[];
  visibility: SOPVisibility;
  tags: string[];
  current_version: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  is_archived: boolean;
  status: string;
  review_reminder_sent_at: string | null;
  overdue_reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // AI Import fields
  created_from_ingestion_id: string | null;
  ai_generated: boolean | null;
  ai_confidence_overall: number | null;
  ai_confidence_by_field: Record<string, number> | null;
  // Joined
  department?: {
    id: string;
    name: string;
  } | null;
}

export interface SOPRevision {
  id: string;
  sop_id: string;
  version: number;
  title: string;
  purpose: string | null;
  scope: string | null;
  owner_role: string | null;
  tools_systems: string[] | null;
  procedure_steps: ProcedureStep[];
  exceptions_notes: string | null;
  related_sop_ids: string[] | null;
  change_summary: string | null;
  revised_by: string | null;
  revised_at: string;
}

export interface CreateSOPInput {
  department_id: string;
  title: string;
  purpose?: string;
  scope?: string;
  owner_role?: string;
  tools_systems?: string[];
  procedure_steps?: ProcedureStep[];
  exceptions_notes?: string;
  related_sop_ids?: string[];
  visibility?: SOPVisibility;
  tags?: string[];
  last_reviewed_at?: string;
  next_review_at?: string;
}

export interface UpdateSOPInput {
  title?: string;
  purpose?: string | null;
  scope?: string | null;
  owner_role?: string | null;
  tools_systems?: string[];
  procedure_steps?: ProcedureStep[];
  exceptions_notes?: string | null;
  related_sop_ids?: string[];
  visibility?: SOPVisibility;
  tags?: string[];
  last_reviewed_at?: string | null;
  next_review_at?: string | null;
  is_archived?: boolean;
  change_summary?: string; // For revision tracking
}

/** Fetch SOPs for a specific department */
export function useDepartmentSOPs(departmentId: string | undefined) {
  return useQuery({
    queryKey: ["sops", "department", departmentId],
    queryFn: async () => {
      if (!departmentId) return [];

      const { data, error } = await supabase
        .from("sops")
        .select("*")
        .eq("department_id", departmentId)
        .eq("is_archived", false)
        .order("title");

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        procedure_steps: parseProcedureSteps(row.procedure_steps),
        tools_systems: row.tools_systems || [],
        tags: row.tags || [],
        related_sop_ids: row.related_sop_ids || [],
      })) as SOP[];
    },
    enabled: !!departmentId,
  });
}

/** Fetch all SOPs accessible to user in the active company */
export function useAllSOPs() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["sops", "all", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("sops")
        .select(`
          *,
          department:departments(id, name)
        `)
        .eq("company_id", activeCompanyId)
        .eq("is_archived", false)
        .order("title");

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        procedure_steps: parseProcedureSteps(row.procedure_steps),
        tools_systems: row.tools_systems || [],
        tags: row.tags || [],
        related_sop_ids: row.related_sop_ids || [],
      })) as SOP[];
    },
    enabled: !!activeCompanyId,
  });
}

/** Fetch a single SOP by ID */
export function useSOP(sopId: string | undefined) {
  return useQuery({
    queryKey: ["sop", sopId],
    queryFn: async () => {
      if (!sopId) return null;

      const { data, error } = await supabase
        .from("sops")
        .select(`
          *,
          department:departments(id, name)
        `)
        .eq("id", sopId)
        .single();

      if (error) throw error;
      return {
        ...data,
        procedure_steps: parseProcedureSteps(data.procedure_steps),
        tools_systems: data.tools_systems || [],
        tags: data.tags || [],
        related_sop_ids: data.related_sop_ids || [],
      } as SOP;
    },
    enabled: !!sopId,
  });
}

/** Fetch revision history for an SOP */
export function useSOPRevisions(sopId: string | undefined) {
  return useQuery({
    queryKey: ["sop-revisions", sopId],
    queryFn: async () => {
      if (!sopId) return [];

      const { data, error } = await supabase
        .from("sop_revisions")
        .select("*")
        .eq("sop_id", sopId)
        .order("version", { ascending: false });

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        procedure_steps: parseProcedureSteps(row.procedure_steps),
      })) as SOPRevision[];
    },
    enabled: !!sopId,
  });
}

/** Search and filter SOPs */
export function useSearchSOPs(
  departmentId: string | undefined,
  searchQuery: string,
  filterTags: string[] = []
) {
  return useQuery({
    queryKey: ["sops", "search", departmentId, searchQuery, filterTags],
    queryFn: async () => {
      if (!departmentId) return [];

      let query = supabase
        .from("sops")
        .select("*")
        .eq("department_id", departmentId)
        .eq("is_archived", false);

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,purpose.ilike.%${searchQuery}%,scope.ilike.%${searchQuery}%`);
      }

      if (filterTags.length > 0) {
        query = query.overlaps("tags", filterTags);
      }

      const { data, error } = await query.order("title");

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        procedure_steps: parseProcedureSteps(row.procedure_steps),
        tools_systems: row.tools_systems || [],
        tags: row.tags || [],
        related_sop_ids: row.related_sop_ids || [],
      })) as SOP[];
    },
    enabled: !!departmentId,
  });
}

export function useSOPMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const createSOP = useMutation({
    mutationFn: async (input: CreateSOPInput) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("sops")
        .insert({
          company_id: activeCompanyId,
          department_id: input.department_id,
          title: input.title,
          purpose: input.purpose || null,
          scope: input.scope || null,
          owner_role: input.owner_role || null,
          tools_systems: input.tools_systems || [],
          procedure_steps: (input.procedure_steps || []) as unknown as Json,
          exceptions_notes: input.exceptions_notes || null,
          related_sop_ids: input.related_sop_ids || [],
          visibility: input.visibility || "department_only",
          tags: input.tags || [],
          last_reviewed_at: input.last_reviewed_at || null,
          next_review_at: input.next_review_at || null,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial revision
      await supabase.from("sop_revisions").insert({
        sop_id: data.id,
        version: 1,
        title: data.title,
        purpose: data.purpose,
        scope: data.scope,
        owner_role: data.owner_role,
        tools_systems: data.tools_systems,
        procedure_steps: data.procedure_steps,
        exceptions_notes: data.exceptions_notes,
        related_sop_ids: data.related_sop_ids,
        change_summary: "Initial creation",
        revised_by: user.user.id,
      });

      return {
        ...data,
        procedure_steps: parseProcedureSteps(data.procedure_steps),
        tools_systems: data.tools_systems || [],
        tags: data.tags || [],
        related_sop_ids: data.related_sop_ids || [],
      } as SOP;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sops"] });
      toast.success("SOP created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateSOP = useMutation({
    mutationFn: async ({ id, change_summary, ...input }: UpdateSOPInput & { id: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Get current SOP to determine new version
      const { data: currentSOP } = await supabase
        .from("sops")
        .select("*")
        .eq("id", id)
        .single();

      if (!currentSOP) throw new Error("SOP not found");

      const newVersion = currentSOP.current_version + 1;

      // Prepare update payload with proper type casting for procedure_steps
      const updatePayload: Record<string, unknown> = {
        ...input,
        current_version: newVersion,
      };
      if (input.procedure_steps) {
        updatePayload.procedure_steps = input.procedure_steps as unknown as Json;
      }

      // Update the SOP
      const { data, error } = await supabase
        .from("sops")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Create revision record
      await supabase.from("sop_revisions").insert({
        sop_id: id,
        version: newVersion,
        title: data.title,
        purpose: data.purpose,
        scope: data.scope,
        owner_role: data.owner_role,
        tools_systems: data.tools_systems,
        procedure_steps: data.procedure_steps,
        exceptions_notes: data.exceptions_notes,
        related_sop_ids: data.related_sop_ids,
        change_summary: change_summary || "Updated",
        revised_by: user.user.id,
      });

      return {
        ...data,
        procedure_steps: parseProcedureSteps(data.procedure_steps),
        tools_systems: data.tools_systems || [],
        tags: data.tags || [],
        related_sop_ids: data.related_sop_ids || [],
      } as SOP;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sops"] });
      queryClient.invalidateQueries({ queryKey: ["sop"] });
      queryClient.invalidateQueries({ queryKey: ["sop-revisions"] });
      toast.success("SOP updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteSOP = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sops")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sops"] });
      toast.success("SOP deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const archiveSOP = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("sops")
        .update({ is_archived: true })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        procedure_steps: parseProcedureSteps(data.procedure_steps),
        tools_systems: data.tools_systems || [],
        tags: data.tags || [],
        related_sop_ids: data.related_sop_ids || [],
      } as SOP;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sops"] });
      toast.success("SOP archived");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    createSOP,
    updateSOP,
    deleteSOP,
    archiveSOP,
  };
}
