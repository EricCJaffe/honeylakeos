import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/membership";
import { useAuth } from "@/lib/auth";
import { useAuditLog } from "@/hooks/useAuditLog";
import { toast } from "sonner";

export type CoachRelationshipType = "coach" | "advisor";
export type CoachRelationshipStatus = "active" | "suspended" | "terminated";

export interface CoachOrganization {
  id: string;
  coach_company_id: string;
  client_company_id: string;
  relationship_type: CoachRelationshipType;
  status: CoachRelationshipStatus;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  // Joined data
  client_company?: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  coach_company?: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

export interface CoachClientMetrics {
  tasks_overdue: number;
  tasks_due_soon: number;
  projects_active: number;
  projects_completed_30d: number;
  last_activity_at: string | null;
  error?: string;
}

// Check if current user is in a coach company (has any active coach relationships)
export function useIsCoachCompany() {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["is-coach-company", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return false;

      const { count, error } = await supabase
        .from("coach_organizations")
        .select("id", { count: "exact", head: true })
        .eq("coach_company_id", activeCompanyId)
        .eq("status", "active");

      if (error) throw error;
      return (count || 0) > 0;
    },
    enabled: !!activeCompanyId,
  });
}

// Get all client organizations for the current coach company
export function useCoachClients() {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["coach-clients", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("coach_organizations")
        .select(`
          *,
          client_company:companies!coach_organizations_client_company_id_fkey(id, name, logo_url)
        `)
        .eq("coach_company_id", activeCompanyId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as CoachOrganization[];
    },
    enabled: !!activeCompanyId,
  });
}

// Get all coach organizations linked to the current client company
export function useClientCoaches() {
  const { activeCompanyId } = useMembership();

  return useQuery({
    queryKey: ["client-coaches", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("coach_organizations")
        .select(`
          *,
          coach_company:companies!coach_organizations_coach_company_id_fkey(id, name, logo_url)
        `)
        .eq("client_company_id", activeCompanyId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as CoachOrganization[];
    },
    enabled: !!activeCompanyId,
  });
}

// Get metrics for a specific client company (coach access only)
export function useCoachClientMetrics(clientCompanyId: string | undefined) {
  return useQuery({
    queryKey: ["coach-client-metrics", clientCompanyId],
    queryFn: async (): Promise<CoachClientMetrics | null> => {
      if (!clientCompanyId) return null;

      const { data, error } = await supabase.rpc("get_coach_client_metrics", {
        _client_company_id: clientCompanyId,
      });

      if (error) throw error;
      
      // Cast through unknown since the RPC returns jsonb
      return data as unknown as CoachClientMetrics;
    },
    enabled: !!clientCompanyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create a new coach-client relationship
export function useCreateCoachRelationship() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useMembership();
  const { user } = useAuth();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      coachCompanyId,
      relationshipType = "coach",
    }: {
      coachCompanyId: string;
      relationshipType?: CoachRelationshipType;
    }) => {
      if (!activeCompanyId || !user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("coach_organizations")
        .insert({
          coach_company_id: coachCompanyId,
          client_company_id: activeCompanyId,
          relationship_type: relationshipType,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["client-coaches", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["coach-clients"] });
      log("coach_org.link_created" as any, "coach_organization" as any, data.id, {
        coach_company_id: data.coach_company_id,
        relationship_type: data.relationship_type,
      });
      toast.success("Coach organization linked successfully");
    },
    onError: (error) => {
      toast.error("Failed to link coach organization", { description: error.message });
    },
  });
}

// Update coach relationship status
export function useUpdateCoachRelationship() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useMembership();
  const { log } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: CoachRelationshipStatus;
    }) => {
      const { data, error } = await supabase
        .from("coach_organizations")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["client-coaches", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["coach-clients"] });
      
      const action = data.status === "terminated" ? "coach_org.link_removed" : "coach_org.status_updated";
      log(action as any, "coach_organization" as any, data.id, { status: data.status });
      
      toast.success(`Coach relationship ${data.status === "terminated" ? "removed" : "updated"}`);
    },
    onError: (error) => {
      toast.error("Failed to update coach relationship", { description: error.message });
    },
  });
}

// Get reports shared with coaches for a client company
export function useCoachSharedReports(clientCompanyId: string | undefined) {
  return useQuery({
    queryKey: ["coach-shared-reports", clientCompanyId],
    queryFn: async () => {
      if (!clientCompanyId) return [];

      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("company_id", clientCompanyId)
        .eq("visibility", "coach_shared")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!clientCompanyId,
  });
}
