import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { useAuditLog } from "./useAuditLog";
import { useModuleAccess } from "./useModuleAccess";
import { useCrmPermissions, PermissionError, getPermissionDeniedMessage } from "./useModulePermissions";
import { parseFriendlyError } from "./useFriendlyError";
import { LIST_LIMITS } from "@/lib/readModels";
import { toast } from "sonner";

export type CrmClientType = "b2c" | "b2b" | "mixed";
export type CrmLifecycleStatus = "prospect" | "client";

export interface CrmClient {
  id: string;
  company_id: string;
  type: CrmClientType;
  lifecycle_status: CrmLifecycleStatus;
  person_full_name: string | null;
  person_email: string | null;
  person_phone: string | null;
  org_name: string | null;
  org_email: string | null;
  org_phone: string | null;
  org_website: string | null;
  notes: string | null;
  is_active: boolean;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmClientFilters {
  lifecycleStatus?: CrmLifecycleStatus | "all";
  type?: CrmClientType | "all";
  showArchived?: boolean;
  search?: string;
}

export interface CreateCrmClientInput {
  type: CrmClientType;
  lifecycle_status: CrmLifecycleStatus;
  person_full_name?: string | null;
  person_email?: string | null;
  person_phone?: string | null;
  org_name?: string | null;
  org_email?: string | null;
  org_phone?: string | null;
  org_website?: string | null;
  notes?: string | null;
}

export interface UpdateCrmClientInput extends Partial<CreateCrmClientInput> {
  id: string;
  is_active?: boolean;
}

export interface CrmListMeta {
  truncated: boolean;
  limit: number;
}

export function useCrmClients(filters: CrmClientFilters = {}) {
  const { activeCompanyId } = useActiveCompany();
  const { isModuleEnabled } = useModuleAccess("crm");
  const permissions = useCrmPermissions();
  const queryClient = useQueryClient();
  const { log } = useAuditLog();
  const crmEnabled = isModuleEnabled;

  // Fetch CRM clients with limit
  const {
    data: queryResult,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["crm-clients", activeCompanyId, filters],
    queryFn: async () => {
      if (!activeCompanyId || !crmEnabled) return { clients: [], meta: { truncated: false, limit: 0 } };

      let query = supabase
        .from("crm_clients")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("updated_at", { ascending: false })
        .limit(LIST_LIMITS.CRM_CLIENTS);

      // Filter by lifecycle status
      if (filters.lifecycleStatus && filters.lifecycleStatus !== "all") {
        query = query.eq("lifecycle_status", filters.lifecycleStatus);
      }

      // Filter by type
      if (filters.type && filters.type !== "all") {
        query = query.eq("type", filters.type);
      }

      // Filter archived
      if (filters.showArchived) {
        query = query.not("archived_at", "is", null);
      } else {
        query = query.is("archived_at", null);
      }

      // Search
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(
          `person_full_name.ilike.${searchTerm},person_email.ilike.${searchTerm},org_name.ilike.${searchTerm},org_email.ilike.${searchTerm}`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const clients = data as CrmClient[];
      const meta: CrmListMeta = {
        truncated: clients.length >= LIST_LIMITS.CRM_CLIENTS,
        limit: LIST_LIMITS.CRM_CLIENTS,
      };
      
      return { clients, meta };
    },
    enabled: !!activeCompanyId && crmEnabled,
  });

  const clients = queryResult?.clients ?? [];
  const listMeta = queryResult?.meta ?? { truncated: false, limit: 0 };

  // Create CRM client
  const createClient = useMutation({
    mutationFn: async (input: CreateCrmClientInput) => {
      if (!activeCompanyId) throw new Error("No active company");
      if (!crmEnabled) throw new Error("CRM module is disabled");
      
      // Permission check
      permissions.assertCapability("canCreate", "create CRM record");

      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;

      const { data, error } = await supabase
        .from("crm_clients")
        .insert({
          company_id: activeCompanyId,
          created_by: userId,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      
      const client = data as CrmClient;

      // Auto-create/link primary contact if person details provided
      if (input.person_full_name) {
        try {
          // Find or create contact by email
          let contactId: string | null = null;

          if (input.person_email) {
            const { data: existingContact } = await supabase
              .from("external_contacts")
              .select("id")
              .eq("company_id", activeCompanyId)
              .eq("email", input.person_email)
              .maybeSingle();

            if (existingContact) {
              contactId = existingContact.id;
            }
          }

          if (!contactId) {
            // Create new contact
            const { data: newContact, error: contactError } = await supabase
              .from("external_contacts")
              .insert({
                company_id: activeCompanyId,
                full_name: input.person_full_name,
                email: input.person_email || null,
                phone: input.person_phone || null,
                organization_name: input.org_name || null,
                created_by: userId,
                tags: [],
              })
              .select("id")
              .single();

            if (!contactError && newContact) {
              contactId = newContact.id;
            }
          }

          // Link contact to client as primary
          if (contactId) {
            await supabase.from("entity_contacts").insert({
              company_id: activeCompanyId,
              entity_type: "client",
              entity_id: client.id,
              contact_id: contactId,
              role_title: "Primary",
              is_primary: true,
              created_by: userId,
            });
          }
        } catch (linkError) {
          // Don't fail client creation if contact linking fails
          console.error("Failed to auto-link primary contact:", linkError);
        }
      }

      return client;
    },
    onSuccess: async (data) => {
      await log("crm.client_created", "crm_client", data.id, {
        type: data.type,
        lifecycle_status: data.lifecycle_status,
        person_full_name: data.person_full_name,
        org_name: data.org_name,
      });
      queryClient.invalidateQueries({ queryKey: ["crm-clients"] });
      queryClient.invalidateQueries({ queryKey: ["entity-contacts"] });
      toast.success("Record created successfully");
    },
    onError: (error) => {
      console.error("Failed to create CRM client:", error);
      const parsed = parseFriendlyError(error, {
        contextMessages: { "23505": "A similar record already exists." },
      });
      toast.error(parsed.message);
    },
  });

  // Update CRM client
  const updateClient = useMutation({
    mutationFn: async ({ id, ...input }: UpdateCrmClientInput) => {
      if (!crmEnabled) throw new Error("CRM module is disabled");
      
      // Permission check
      permissions.assertCapability("canEdit", "update CRM record");

      const { data, error } = await supabase
        .from("crm_clients")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CrmClient;
    },
    onSuccess: async (data) => {
      await log("crm.client_updated", "crm_client", data.id, {
        type: data.type,
        lifecycle_status: data.lifecycle_status,
        person_full_name: data.person_full_name,
        org_name: data.org_name,
      });
      queryClient.invalidateQueries({ queryKey: ["crm-clients"] });
      queryClient.invalidateQueries({ queryKey: ["crm-client", data.id] });
      toast.success("Record updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update CRM client:", error);
      const parsed = parseFriendlyError(error);
      toast.error(parsed.message);
    },
  });

  // Archive CRM client
  const archiveClient = useMutation({
    mutationFn: async (id: string) => {
      if (!crmEnabled) throw new Error("CRM module is disabled");
      
      // Permission check
      permissions.assertCapability("canArchive", "archive CRM record");

      const { data, error } = await supabase
        .from("crm_clients")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CrmClient;
    },
    onSuccess: async (data) => {
      await log("crm.client_archived", "crm_client", data.id, {
        type: data.type,
        lifecycle_status: data.lifecycle_status,
      });
      queryClient.invalidateQueries({ queryKey: ["crm-clients"] });
      toast.success("Record archived");
    },
    onError: (error) => {
      console.error("Failed to archive CRM client:", error);
      const parsed = parseFriendlyError(error);
      toast.error(parsed.message);
    },
  });

  // Unarchive CRM client
  const unarchiveClient = useMutation({
    mutationFn: async (id: string) => {
      if (!crmEnabled) throw new Error("CRM module is disabled");
      
      // Permission check
      permissions.assertCapability("canArchive", "restore CRM record");

      const { data, error } = await supabase
        .from("crm_clients")
        .update({ archived_at: null })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CrmClient;
    },
    onSuccess: async (data) => {
      await log("crm.client_unarchived", "crm_client", data.id, {
        type: data.type,
        lifecycle_status: data.lifecycle_status,
      });
      queryClient.invalidateQueries({ queryKey: ["crm-clients"] });
      toast.success("Record restored");
    },
    onError: (error) => {
      console.error("Failed to restore CRM client:", error);
      const parsed = parseFriendlyError(error);
      toast.error(parsed.message);
    },
  });

  // Delete CRM client (prefer archive)
  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      if (!crmEnabled) throw new Error("CRM module is disabled");
      
      // Permission check
      permissions.assertCapability("canDelete", "delete CRM record");

      // First delete any entity links
      await supabase
        .from("entity_links")
        .delete()
        .or(`from_id.eq.${id},to_id.eq.${id}`);

      const { error } = await supabase
        .from("crm_clients")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: async (id) => {
      await log("crm.client_deleted", "crm_client", id, {});
      queryClient.invalidateQueries({ queryKey: ["crm-clients"] });
      toast.success("Record deleted permanently");
    },
    onError: (error) => {
      console.error("Failed to delete CRM client:", error);
      const parsed = parseFriendlyError(error);
      toast.error(parsed.message);
    },
  });

  return {
    clients,
    isLoading,
    error,
    listMeta,
    crmEnabled,
    permissions,
    createClient,
    updateClient,
    archiveClient,
    unarchiveClient,
    deleteClient,
  };
}

// Hook to fetch a single CRM client
export function useCrmClient(id: string | undefined) {
  const { isModuleEnabled } = useModuleAccess("crm");
  const crmEnabled = isModuleEnabled;

  return useQuery({
    queryKey: ["crm-client", id],
    queryFn: async () => {
      if (!id || !crmEnabled) return null;

      const { data, error } = await supabase
        .from("crm_clients")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as CrmClient;
    },
    enabled: !!id && crmEnabled,
  });
}

// Helper to get display name for a CRM client
export function getCrmClientDisplayName(client: CrmClient): string {
  if (client.person_full_name && client.org_name) {
    return `${client.person_full_name} (${client.org_name})`;
  }
  return client.person_full_name || client.org_name || "Unknown";
}

// Helper to get primary email
export function getCrmClientEmail(client: CrmClient): string | null {
  return client.person_email || client.org_email || null;
}
