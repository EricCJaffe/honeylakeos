import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/useActiveCompany";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useCoachesPermissions, PermissionError } from "@/hooks/useModulePermissions";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type CoachProfileType = "coach" | "partner" | "vendor";

export interface CoachProfile extends Tables<"coach_profiles"> {
  external_contact?: Tables<"external_contacts"> | null;
}

export interface CoachProfileFilters {
  profileType?: CoachProfileType;
  showArchived?: boolean;
  search?: string;
}

export interface CreateCoachProfileInput {
  external_contact_id: string;
  profile_type: CoachProfileType;
  specialties?: string[];
  bio?: string;
}

export interface UpdateCoachProfileInput {
  profile_type?: CoachProfileType;
  specialties?: string[];
  bio?: string;
}

export function useCoachProfiles(filters: CoachProfileFilters = {}) {
  const { activeCompanyId } = useActiveCompany();
  const { hasAccess, loading: moduleLoading } = useModuleAccess("coaches");
  const permissions = useCoachesPermissions();
  const { log: logAudit } = useAuditLog();
  const queryClient = useQueryClient();

  const { profileType, showArchived = false, search } = filters;

  const query = useQuery({
    queryKey: ["coach-profiles", activeCompanyId, profileType, showArchived, search],
    queryFn: async () => {
      if (!activeCompanyId || !hasAccess) return [];

      let queryBuilder = supabase
        .from("coach_profiles")
        .select(`
          *,
          external_contact:external_contacts(*)
        `)
        .eq("company_id", activeCompanyId);

      if (profileType) {
        queryBuilder = queryBuilder.eq("profile_type", profileType);
      }

      if (!showArchived) {
        queryBuilder = queryBuilder.is("archived_at", null);
      }

      queryBuilder = queryBuilder.order("created_at", { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) throw error;

      // Client-side search filtering
      let results = data as CoachProfile[];
      if (search) {
        const searchLower = search.toLowerCase();
        results = results.filter((profile) => {
          const contact = profile.external_contact;
          if (!contact) return false;
          return (
            contact.full_name?.toLowerCase().includes(searchLower) ||
            contact.email?.toLowerCase().includes(searchLower) ||
            contact.organization_name?.toLowerCase().includes(searchLower) ||
            profile.bio?.toLowerCase().includes(searchLower)
          );
        });
      }

      return results;
    },
    enabled: !!activeCompanyId && !moduleLoading && hasAccess,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateCoachProfileInput) => {
      if (!activeCompanyId) throw new Error("No active company");
      if (!hasAccess) throw new Error("Module not enabled");
      
      // Permission check
      permissions.assertCapability("canCreate", "create coach profile");

      const { data: userData } = await supabase.auth.getUser();

      const insertData: TablesInsert<"coach_profiles"> = {
        company_id: activeCompanyId,
        external_contact_id: input.external_contact_id,
        profile_type: input.profile_type,
        specialties: input.specialties || [],
        bio: input.bio || null,
        created_by: userData.user?.id || null,
      };

      const { data, error } = await supabase
        .from("coach_profiles")
        .insert(insertData)
        .select(`*, external_contact:external_contacts(*)`)
        .single();

      if (error) throw error;
      return data as CoachProfile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["coach-profiles"] });
      logAudit("coach_profile.created", "coach_profile", data.id, {
        profile_type: data.profile_type,
        external_contact_id: data.external_contact_id,
      });
      toast.success("Coach/Partner profile created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create profile");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateCoachProfileInput }) => {
      if (!hasAccess) throw new Error("Module not enabled");
      
      // Permission check
      permissions.assertCapability("canEdit", "update coach profile");

      const updateData: TablesUpdate<"coach_profiles"> = {};
      if (input.profile_type !== undefined) updateData.profile_type = input.profile_type;
      if (input.specialties !== undefined) updateData.specialties = input.specialties;
      if (input.bio !== undefined) updateData.bio = input.bio || null;

      const { data, error } = await supabase
        .from("coach_profiles")
        .update(updateData)
        .eq("id", id)
        .select(`*, external_contact:external_contacts(*)`)
        .single();

      if (error) throw error;
      return data as CoachProfile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["coach-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["coach-profile", data.id] });
      logAudit("coach_profile.updated", "coach_profile", data.id, { profile_type: data.profile_type });
      toast.success("Profile updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!hasAccess) throw new Error("Module not enabled");
      
      // Permission check
      permissions.assertCapability("canArchive", "archive coach profile");

      const { data, error } = await supabase
        .from("coach_profiles")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["coach-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["coach-profile", data.id] });
      logAudit("coach_profile.archived", "coach_profile", data.id, {});
      toast.success("Profile archived");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive profile");
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!hasAccess) throw new Error("Module not enabled");
      
      // Permission check
      permissions.assertCapability("canArchive", "restore coach profile");

      const { data, error } = await supabase
        .from("coach_profiles")
        .update({ archived_at: null })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["coach-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["coach-profile", data.id] });
      logAudit("coach_profile.unarchived", "coach_profile", data.id, {});
      toast.success("Profile restored");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to restore profile");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!hasAccess) throw new Error("Module not enabled");
      
      // Permission check
      permissions.assertCapability("canDelete", "delete coach profile");

      const { error } = await supabase
        .from("coach_profiles")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["coach-profiles"] });
      logAudit("coach_profile.deleted", "coach_profile", id, {});
      toast.success("Profile deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete profile");
    },
  });

  return {
    profiles: query.data || [],
    isLoading: query.isLoading || moduleLoading,
    error: query.error,
    hasAccess,
    permissions,
    createProfile: createMutation.mutateAsync,
    updateProfile: updateMutation.mutateAsync,
    archiveProfile: archiveMutation.mutateAsync,
    unarchiveProfile: unarchiveMutation.mutateAsync,
    deleteProfile: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}

export function useCoachProfile(id: string | undefined) {
  const { hasAccess, loading: moduleLoading } = useModuleAccess("coaches");

  return useQuery({
    queryKey: ["coach-profile", id],
    queryFn: async () => {
      if (!id || !hasAccess) return null;

      const { data, error } = await supabase
        .from("coach_profiles")
        .select(`
          *,
          external_contact:external_contacts(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as CoachProfile;
    },
    enabled: !!id && !moduleLoading && hasAccess,
  });
}

export function getProfileTypeLabel(type: CoachProfileType): string {
  switch (type) {
    case "coach":
      return "Coach";
    case "partner":
      return "Partner";
    case "vendor":
      return "Vendor";
    default:
      return type;
  }
}
