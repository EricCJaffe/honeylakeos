import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { logAuditEvent, AuditAction, EntityType } from "./useAuditLog";
import { useExternalContactsPermissions, PermissionError } from "./useModulePermissions";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// ============================================================================
// Types
// ============================================================================

export type ExternalContact = Tables<"external_contacts">;
export type ExternalContactInsert = TablesInsert<"external_contacts">;
export type ExternalContactUpdate = TablesUpdate<"external_contacts">;

export interface ExternalContactFilters {
  search?: string;
  showArchived?: boolean;
  hasEmail?: boolean;
  hasOrganization?: boolean;
}

export interface CreateExternalContactInput {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  organization_name?: string | null;
  website?: string | null;
  tags?: string[];
  notes?: string | null;
}

export interface UpdateExternalContactInput extends Partial<CreateExternalContactInput> {
  id: string;
}

// ============================================================================
// Query Keys
// ============================================================================

const QUERY_KEYS = {
  all: ["external-contacts"] as const,
  lists: () => [...QUERY_KEYS.all, "list"] as const,
  list: (companyId: string, filters?: ExternalContactFilters) => 
    [...QUERY_KEYS.lists(), companyId, filters] as const,
  details: () => [...QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...QUERY_KEYS.details(), id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch external contacts for the active company with optional filtering
 */
export function useExternalContacts(filters: ExternalContactFilters = {}) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: QUERY_KEYS.list(activeCompanyId ?? "", filters),
    queryFn: async () => {
      if (!activeCompanyId) return [];

      let query = supabase
        .from("external_contacts")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("full_name", { ascending: true });

      // Apply archived filter
      if (!filters.showArchived) {
        query = query.is("archived_at", null);
      }

      // Apply email filter
      if (filters.hasEmail) {
        query = query.not("email", "is", null);
      }

      // Apply organization filter
      if (filters.hasOrganization) {
        query = query.not("organization_name", "is", null);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Apply search filter client-side for flexibility
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (data ?? []).filter((contact) => {
          return (
            contact.full_name.toLowerCase().includes(searchLower) ||
            contact.email?.toLowerCase().includes(searchLower) ||
            contact.organization_name?.toLowerCase().includes(searchLower) ||
            contact.phone?.includes(filters.search!)
          );
        });
      }

      return data ?? [];
    },
    enabled: !!activeCompanyId,
  });
}

/**
 * Fetch a single external contact by ID
 */
export function useExternalContact(contactId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(contactId ?? ""),
    queryFn: async () => {
      if (!contactId) return null;

      const { data, error } = await supabase
        .from("external_contacts")
        .select("*")
        .eq("id", contactId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!contactId,
  });
}

/**
 * CRUD mutations for external contacts
 */
export function useExternalContactMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const permissions = useExternalContactsPermissions();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    queryClient.invalidateQueries({ queryKey: ["entity-links"] });
  };

  const create = useMutation({
    mutationFn: async (input: CreateExternalContactInput) => {
      if (!activeCompanyId) throw new Error("No active company");
      
      // Permission check
      permissions.assertCapability("canCreate", "create external contact");

      const { data: user } = await supabase.auth.getUser();

      const insertData: ExternalContactInsert = {
        company_id: activeCompanyId,
        full_name: input.full_name,
        email: input.email || null,
        phone: input.phone || null,
        title: input.title || null,
        organization_name: input.organization_name || null,
        website: input.website || null,
        tags: input.tags ?? [],
        notes: input.notes || null,
        created_by: user.user?.id,
      };

      const { data, error } = await supabase
        .from("external_contacts")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await logAuditEvent({
        companyId: activeCompanyId,
        action: "external_contact.created" as AuditAction,
        entityType: "external_contact" as EntityType,
        entityId: data.id,
        metadata: {
          full_name: data.full_name,
          has_email: !!data.email,
          has_organization: !!data.organization_name,
        },
      });

      return data;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async (input: UpdateExternalContactInput) => {
      if (!activeCompanyId) throw new Error("No active company");
      
      // Permission check
      permissions.assertCapability("canEdit", "update external contact");

      const { id, ...updateData } = input;

      const updatePayload: ExternalContactUpdate = {
        full_name: updateData.full_name,
        email: updateData.email ?? null,
        phone: updateData.phone ?? null,
        title: updateData.title ?? null,
        organization_name: updateData.organization_name ?? null,
        website: updateData.website ?? null,
        notes: updateData.notes ?? null,
      };

      if (updateData.tags !== undefined) {
        updatePayload.tags = updateData.tags;
      }

      const { data, error } = await supabase
        .from("external_contacts")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await logAuditEvent({
        companyId: activeCompanyId,
        action: "external_contact.updated" as AuditAction,
        entityType: "external_contact" as EntityType,
        entityId: data.id,
        metadata: {
          full_name: data.full_name,
          changes: Object.keys(updateData),
        },
      });

      return data;
    },
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: async (contactId: string) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data, error } = await supabase
        .from("external_contacts")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", contactId)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        companyId: activeCompanyId,
        action: "external_contact.archived" as AuditAction,
        entityType: "external_contact" as EntityType,
        entityId: data.id,
        metadata: { full_name: data.full_name },
      });

      return data;
    },
    onSuccess: invalidate,
  });

  const unarchive = useMutation({
    mutationFn: async (contactId: string) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data, error } = await supabase
        .from("external_contacts")
        .update({ archived_at: null })
        .eq("id", contactId)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        companyId: activeCompanyId,
        action: "external_contact.unarchived" as AuditAction,
        entityType: "external_contact" as EntityType,
        entityId: data.id,
        metadata: { full_name: data.full_name },
      });

      return data;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (contactId: string) => {
      if (!activeCompanyId) throw new Error("No active company");

      // Fetch contact for audit before deletion
      const { data: contact } = await supabase
        .from("external_contacts")
        .select("full_name")
        .eq("id", contactId)
        .single();

      // Remove entity links first
      await supabase
        .from("entity_links")
        .delete()
        .or(`and(from_type.eq.external_contact,from_id.eq.${contactId}),and(to_type.eq.external_contact,to_id.eq.${contactId})`);

      // Delete the contact
      const { error } = await supabase
        .from("external_contacts")
        .delete()
        .eq("id", contactId);

      if (error) throw error;

      await logAuditEvent({
        companyId: activeCompanyId,
        action: "external_contact.deleted" as AuditAction,
        entityType: "external_contact" as EntityType,
        entityId: contactId,
        metadata: { full_name: contact?.full_name },
      });

      return contactId;
    },
    onSuccess: invalidate,
  });

  return {
    create,
    update,
    archive,
    unarchive,
    remove,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get display name for an external contact
 */
export function getExternalContactDisplayName(contact: ExternalContact): string {
  return contact.full_name;
}

/**
 * Get email for an external contact
 */
export function getExternalContactEmail(contact: ExternalContact): string | null {
  return contact.email;
}

/**
 * Format contact for display (name + organization if available)
 */
export function formatExternalContactLabel(contact: ExternalContact): string {
  if (contact.organization_name) {
    return `${contact.full_name} (${contact.organization_name})`;
  }
  return contact.full_name;
}
