import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "./useActiveCompany";
import { logAuditEvent, AuditAction, EntityType } from "./useAuditLog";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

// ============================================================================
// Types
// ============================================================================

export type EntityContactType = "client" | "donor" | "vendor";

export interface EntityContact {
  id: string;
  company_id: string;
  entity_type: EntityContactType;
  entity_id: string;
  contact_id: string;
  role_title: string | null;
  is_primary: boolean;
  created_at: string;
  created_by: string | null;
  // Joined contact data
  contact?: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    title: string | null;
    organization_name: string | null;
  };
}

export interface LinkContactInput {
  entityType: EntityContactType;
  entityId: string;
  contactId: string;
  roleTitle?: string;
  isPrimary?: boolean;
}

export interface CreateAndLinkContactInput {
  entityType: EntityContactType;
  entityId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  roleTitle?: string;
  isPrimary?: boolean;
}

export interface UpdateEntityContactInput {
  id: string;
  roleTitle?: string | null;
  isPrimary?: boolean;
}

// ============================================================================
// Query Keys
// ============================================================================

const QUERY_KEYS = {
  all: ["entity-contacts"] as const,
  forEntity: (entityType: EntityContactType, entityId: string) =>
    [...QUERY_KEYS.all, entityType, entityId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch contacts linked to a specific entity (client, donor, vendor)
 */
export function useEntityContacts(
  entityType: EntityContactType | undefined,
  entityId: string | undefined
) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: QUERY_KEYS.forEntity(entityType ?? "client", entityId ?? ""),
    queryFn: async () => {
      if (!activeCompanyId || !entityType || !entityId) return [];

      const { data, error } = await supabase
        .from("entity_contacts")
        .select(`
          *,
          contact:external_contacts(
            id,
            full_name,
            email,
            phone,
            title,
            organization_name
          )
        `)
        .eq("company_id", activeCompanyId)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as EntityContact[];
    },
    enabled: !!activeCompanyId && !!entityType && !!entityId,
  });
}

/**
 * CRUD mutations for entity contacts
 */
export function useEntityContactMutations() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const invalidate = (entityType: EntityContactType, entityId: string) => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.forEntity(entityType, entityId),
    });
    queryClient.invalidateQueries({ queryKey: ["external-contacts"] });
  };

  /**
   * Find or create a contact by email, then link to entity
   */
  const findOrCreateAndLink = useMutation({
    mutationFn: async (input: CreateAndLinkContactInput) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;

      let contactId: string;

      // Try to find existing contact by email if provided
      if (input.email) {
        const { data: existing } = await supabase
          .from("external_contacts")
          .select("id")
          .eq("company_id", activeCompanyId)
          .eq("email", input.email)
          .maybeSingle();

        if (existing) {
          contactId = existing.id;
        } else {
          // Create new contact
          const { data: newContact, error: createError } = await supabase
            .from("external_contacts")
            .insert({
              company_id: activeCompanyId,
              full_name: input.fullName,
              email: input.email || null,
              phone: input.phone || null,
              created_by: userId,
              tags: [],
            })
            .select("id")
            .single();

          if (createError) throw createError;
          contactId = newContact.id;

          await logAuditEvent({
            companyId: activeCompanyId,
            action: "external_contact.created" as AuditAction,
            entityType: "external_contact" as EntityType,
            entityId: contactId,
            metadata: { full_name: input.fullName, from_entity: input.entityType },
          });
        }
      } else {
        // No email - create new contact
        const { data: newContact, error: createError } = await supabase
          .from("external_contacts")
          .insert({
            company_id: activeCompanyId,
            full_name: input.fullName,
            email: null,
            phone: input.phone || null,
            created_by: userId,
            tags: [],
          })
          .select("id")
          .single();

        if (createError) throw createError;
        contactId = newContact.id;

        await logAuditEvent({
          companyId: activeCompanyId,
          action: "external_contact.created" as AuditAction,
          entityType: "external_contact" as EntityType,
          entityId: contactId,
          metadata: { full_name: input.fullName, from_entity: input.entityType },
        });
      }

      // If marking as primary, unset any existing primary
      if (input.isPrimary) {
        await supabase
          .from("entity_contacts")
          .update({ is_primary: false })
          .eq("company_id", activeCompanyId)
          .eq("entity_type", input.entityType)
          .eq("entity_id", input.entityId)
          .eq("is_primary", true);
      }

      // Check if already linked
      const { data: existingLink } = await supabase
        .from("entity_contacts")
        .select("id")
        .eq("company_id", activeCompanyId)
        .eq("entity_type", input.entityType)
        .eq("entity_id", input.entityId)
        .eq("contact_id", contactId)
        .maybeSingle();

      if (existingLink) {
        // Update existing link
        const { data, error } = await supabase
          .from("entity_contacts")
          .update({
            role_title: input.roleTitle || null,
            is_primary: input.isPrimary ?? false,
          })
          .eq("id", existingLink.id)
          .select()
          .single();

        if (error) throw error;
        return { ...data, contactId };
      }

      // Create new link
      const { data, error } = await supabase
        .from("entity_contacts")
        .insert({
          company_id: activeCompanyId,
          entity_type: input.entityType,
          entity_id: input.entityId,
          contact_id: contactId,
          role_title: input.roleTitle || null,
          is_primary: input.isPrimary ?? false,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        companyId: activeCompanyId,
        action: "crm.client_contact_linked" as AuditAction,
        entityType: "crm_client" as EntityType,
        entityId: input.entityId,
        metadata: {
          contact_id: contactId,
          role_title: input.roleTitle,
          is_primary: input.isPrimary,
        },
      });

      return { ...data, contactId };
    },
    onSuccess: (_, variables) => {
      invalidate(variables.entityType, variables.entityId);
      toast.success("Contact linked successfully");
    },
    onError: (error: Error) => {
      console.error("Failed to link contact:", error);
      toast.error(`Failed to link contact: ${error.message}`);
    },
  });

  /**
   * Link an existing contact to an entity
   */
  const linkContact = useMutation({
    mutationFn: async (input: LinkContactInput) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { data: user } = await supabase.auth.getUser();

      // If marking as primary, unset any existing primary
      if (input.isPrimary) {
        await supabase
          .from("entity_contacts")
          .update({ is_primary: false })
          .eq("company_id", activeCompanyId)
          .eq("entity_type", input.entityType)
          .eq("entity_id", input.entityId)
          .eq("is_primary", true);
      }

      // Check if already linked
      const { data: existing } = await supabase
        .from("entity_contacts")
        .select("id")
        .eq("company_id", activeCompanyId)
        .eq("entity_type", input.entityType)
        .eq("entity_id", input.entityId)
        .eq("contact_id", input.contactId)
        .maybeSingle();

      if (existing) {
        throw new Error("Contact is already linked to this entity");
      }

      const { data, error } = await supabase
        .from("entity_contacts")
        .insert({
          company_id: activeCompanyId,
          entity_type: input.entityType,
          entity_id: input.entityId,
          contact_id: input.contactId,
          role_title: input.roleTitle || null,
          is_primary: input.isPrimary ?? false,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        companyId: activeCompanyId,
        action: "crm.client_contact_linked" as AuditAction,
        entityType: "crm_client" as EntityType,
        entityId: input.entityId,
        metadata: {
          contact_id: input.contactId,
          role_title: input.roleTitle,
          is_primary: input.isPrimary,
        },
      });

      return data;
    },
    onSuccess: (_, variables) => {
      invalidate(variables.entityType, variables.entityId);
      toast.success("Contact linked successfully");
    },
    onError: (error: Error) => {
      console.error("Failed to link contact:", error);
      toast.error(`Failed to link contact: ${error.message}`);
    },
  });

  /**
   * Update an entity contact link (role, primary status)
   */
  const updateLink = useMutation({
    mutationFn: async (input: UpdateEntityContactInput & { entityType: EntityContactType; entityId: string }) => {
      if (!activeCompanyId) throw new Error("No active company");

      // If marking as primary, unset any existing primary
      if (input.isPrimary) {
        await supabase
          .from("entity_contacts")
          .update({ is_primary: false })
          .eq("company_id", activeCompanyId)
          .eq("entity_type", input.entityType)
          .eq("entity_id", input.entityId)
          .eq("is_primary", true);
      }

      const { data, error } = await supabase
        .from("entity_contacts")
        .update({
          role_title: input.roleTitle,
          is_primary: input.isPrimary,
        })
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      invalidate(variables.entityType, variables.entityId);
      toast.success("Contact updated");
    },
    onError: (error: Error) => {
      console.error("Failed to update contact link:", error);
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  /**
   * Unlink a contact from an entity (does not delete the contact)
   */
  const unlinkContact = useMutation({
    mutationFn: async (input: { id: string; entityType: EntityContactType; entityId: string }) => {
      if (!activeCompanyId) throw new Error("No active company");

      const { error } = await supabase
        .from("entity_contacts")
        .delete()
        .eq("id", input.id);

      if (error) throw error;

      await logAuditEvent({
        companyId: activeCompanyId,
        action: "crm.client_contact_unlinked" as AuditAction,
        entityType: "crm_client" as EntityType,
        entityId: input.entityId,
        metadata: { link_id: input.id },
      });

      return input.id;
    },
    onSuccess: (_, variables) => {
      invalidate(variables.entityType, variables.entityId);
      toast.success("Contact unlinked");
    },
    onError: (error: Error) => {
      console.error("Failed to unlink contact:", error);
      toast.error(`Failed to unlink: ${error.message}`);
    },
  });

  /**
   * Set a contact as primary for an entity
   */
  const setPrimary = useMutation({
    mutationFn: async (input: { id: string; entityType: EntityContactType; entityId: string }) => {
      if (!activeCompanyId) throw new Error("No active company");

      // Unset existing primary
      await supabase
        .from("entity_contacts")
        .update({ is_primary: false })
        .eq("company_id", activeCompanyId)
        .eq("entity_type", input.entityType)
        .eq("entity_id", input.entityId)
        .eq("is_primary", true);

      // Set new primary
      const { data, error } = await supabase
        .from("entity_contacts")
        .update({ is_primary: true })
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      invalidate(variables.entityType, variables.entityId);
      toast.success("Primary contact updated");
    },
    onError: (error: Error) => {
      console.error("Failed to set primary:", error);
      toast.error(`Failed to set primary: ${error.message}`);
    },
  });

  return {
    findOrCreateAndLink,
    linkContact,
    updateLink,
    unlinkContact,
    setPrimary,
  };
}

/**
 * Get primary contact for an entity
 */
export function usePrimaryContact(
  entityType: EntityContactType | undefined,
  entityId: string | undefined
) {
  const { data: contacts } = useEntityContacts(entityType, entityId);
  return contacts?.find((c) => c.is_primary) ?? null;
}
