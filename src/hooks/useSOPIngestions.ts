import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export type IngestionSourceType = 'upload' | 'paste' | 'interview';
export type IngestionStatus = 'processing' | 'needs_review' | 'draft_created' | 'in_approval' | 'published' | 'rejected';

export interface AIOutputSOP {
  title: string;
  purpose?: string;
  scope?: string;
  owner_role?: string;
  tools_systems?: string[];
  procedure_steps?: Array<{
    id: string;
    order: number;
    title: string;
    description: string;
  }>;
  exceptions_notes?: string;
  tags?: string[];
  confidence?: {
    overall: number;
    by_field: Record<string, number>;
  };
}

export interface SOPIngestion {
  id: string;
  company_id: string;
  department_id: string;
  source_type: IngestionSourceType;
  source_text: string | null;
  source_file_path: string | null;
  source_file_name: string | null;
  source_file_size: number | null;
  ai_output_json: AIOutputSOP | null;
  status: IngestionStatus;
  rejection_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  // Joined
  department?: {
    id: string;
    name: string;
  } | null;
}

export interface SOPIngestionAuditLog {
  id: string;
  ingestion_id: string;
  action: string;
  actor_user_id: string;
  old_status: string | null;
  new_status: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface CreateIngestionInput {
  department_id: string;
  source_type: IngestionSourceType;
  source_text?: string;
  source_file_path?: string;
  source_file_name?: string;
  source_file_size?: number;
}

/** Fetch ingestions for a department */
export function useDepartmentIngestions(departmentId: string | undefined) {
  return useQuery({
    queryKey: ["sop-ingestions", "department", departmentId],
    queryFn: async () => {
      if (!departmentId) return [];

      const { data, error } = await supabase
        .from("sop_ingestions")
        .select(`
          *,
          department:departments(id, name)
        `)
        .eq("department_id", departmentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        ai_output_json: row.ai_output_json as unknown as AIOutputSOP | null,
      })) as SOPIngestion[];
    },
    enabled: !!departmentId,
  });
}

/** Fetch all ingestions for the active company */
export function useAllIngestions() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ["sop-ingestions", "all", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("sop_ingestions")
        .select(`
          *,
          department:departments(id, name)
        `)
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        ai_output_json: row.ai_output_json as unknown as AIOutputSOP | null,
      })) as SOPIngestion[];
    },
    enabled: !!activeCompanyId,
  });
}

/** Fetch a single ingestion by ID */
export function useSOPIngestion(ingestionId: string | undefined) {
  return useQuery({
    queryKey: ["sop-ingestion", ingestionId],
    queryFn: async () => {
      if (!ingestionId) return null;

      const { data, error } = await supabase
        .from("sop_ingestions")
        .select(`
          *,
          department:departments(id, name)
        `)
        .eq("id", ingestionId)
        .single();

      if (error) throw error;
      return {
        ...data,
        ai_output_json: data.ai_output_json as unknown as AIOutputSOP | null,
      } as SOPIngestion;
    },
    enabled: !!ingestionId,
  });
}

/** Fetch audit logs for an ingestion */
export function useIngestionAuditLogs(ingestionId: string | undefined) {
  return useQuery({
    queryKey: ["sop-ingestion-audit-logs", ingestionId],
    queryFn: async () => {
      if (!ingestionId) return [];

      const { data, error } = await supabase
        .from("sop_ingestion_audit_logs")
        .select("*")
        .eq("ingestion_id", ingestionId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        details: row.details as Record<string, unknown> | null,
      })) as SOPIngestionAuditLog[];
    },
    enabled: !!ingestionId,
  });
}

export function useSOPIngestionMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  /** Create a new ingestion */
  const createIngestion = useMutation({
    mutationFn: async (input: CreateIngestionInput) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("sop_ingestions")
        .insert({
          company_id: activeCompanyId,
          department_id: input.department_id,
          source_type: input.source_type,
          source_text: input.source_text || null,
          source_file_path: input.source_file_path || null,
          source_file_name: input.source_file_name || null,
          source_file_size: input.source_file_size || null,
          created_by: user.user.id,
          status: 'processing',
        })
        .select()
        .single();

      if (error) throw error;

      // Log creation
      await supabase.from("sop_ingestion_audit_logs").insert({
        ingestion_id: data.id,
        action: 'created',
        actor_user_id: user.user.id,
        new_status: 'processing',
        details: { source_type: input.source_type },
      });

      return {
        ...data,
        ai_output_json: data.ai_output_json as unknown as AIOutputSOP | null,
      } as SOPIngestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sop-ingestions"] });
      toast.success("AI Import started");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  /** Update ingestion status */
  const updateIngestionStatus = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      rejection_reason,
      ai_output_json 
    }: { 
      id: string; 
      status: IngestionStatus; 
      rejection_reason?: string;
      ai_output_json?: AIOutputSOP;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Get current status for audit log
      const { data: current } = await supabase
        .from("sop_ingestions")
        .select("status")
        .eq("id", id)
        .single();

      const updatePayload: Record<string, unknown> = { 
        status,
        updated_at: new Date().toISOString(),
      };

      if (rejection_reason !== undefined) {
        updatePayload.rejection_reason = rejection_reason;
      }

      if (ai_output_json !== undefined) {
        updatePayload.ai_output_json = ai_output_json as unknown as Json;
        updatePayload.processed_at = new Date().toISOString();
      }

      if (status === 'needs_review' || status === 'draft_created') {
        updatePayload.reviewed_at = new Date().toISOString();
        updatePayload.reviewed_by = user.user.id;
      }

      const { data, error } = await supabase
        .from("sop_ingestions")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Log status change
      await supabase.from("sop_ingestion_audit_logs").insert({
        ingestion_id: id,
        action: 'status_changed',
        actor_user_id: user.user.id,
        old_status: current?.status || null,
        new_status: status,
        details: rejection_reason ? { rejection_reason } : null,
      });

      return {
        ...data,
        ai_output_json: data.ai_output_json as unknown as AIOutputSOP | null,
      } as SOPIngestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sop-ingestions"] });
      queryClient.invalidateQueries({ queryKey: ["sop-ingestion"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  /** Delete an ingestion */
  const deleteIngestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sop_ingestions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sop-ingestions"] });
      toast.success("Ingestion deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    createIngestion,
    updateIngestionStatus,
    deleteIngestion,
  };
}

/** Check if user can view source data (creator, dept manager, or company admin) */
export function useCanViewIngestionSource(ingestion: SOPIngestion | null) {
  return useQuery({
    queryKey: ["can-view-ingestion-source", ingestion?.id],
    queryFn: async () => {
      if (!ingestion) return false;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      // Creator can always view
      if (ingestion.created_by === user.user.id) return true;

      // Check if department manager
      const { data: deptMember } = await supabase
        .from("department_members")
        .select("role")
        .eq("department_id", ingestion.department_id)
        .eq("user_id", user.user.id)
        .single();

      if (deptMember?.role === 'manager') return true;

      // Check if company admin
      const { data: membership } = await supabase
        .from("memberships")
        .select("role")
        .eq("company_id", ingestion.company_id)
        .eq("user_id", user.user.id)
        .single();

      return membership?.role === 'company_admin';
    },
    enabled: !!ingestion,
  });
}
